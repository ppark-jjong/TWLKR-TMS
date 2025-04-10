const express = require('express');
const { Op } = require('sequelize');
const Handover = require('../models/handover.model');
const User = require('../models/user.model');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');
const { createResponse, ERROR_CODES } = require('../utils/Constants');
const {
  findWithRowLock,
  updateWithLock,
  NotFoundException,
} = require('../utils/LockManager');

const router = express.Router();

/**
 * 인수인계/공지사항 목록 조회 API
 * GET /handover/list
 * 쿼리 파라미터: type (notice/normal), department, page, size
 */
router.get('/list', authenticate, async (req, res, next) => {
  try {
    const {
      type = 'normal',
      department,
      page = 1,
      size = 10,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = req.query;

    const isNotice = type === 'notice';
    const offset = (parseInt(page) - 1) * parseInt(size);
    const limit = parseInt(size);

    // 조회 조건 설정
    const whereCondition = {
      is_notice: isNotice,
    };

    // 부서 필터 설정 (일반 인수인계일 경우만)
    if (!isNotice) {
      // 전체 부서 대상 인수인계도 포함
      if (department) {
        whereCondition[Op.or] = [{ department }, { department: null }];
      } else if (req.user.role !== 'ADMIN') {
        // 일반 사용자는 자신의 부서와 전체 부서 대상 인수인계만 조회 가능
        whereCondition[Op.or] = [
          { department: req.user.department },
          { department: null },
        ];
      }
    }

    // 만료되지 않은 인수인계만 조회
    whereCondition[Op.or] = [
      { expiry_date: null },
      { expiry_date: { [Op.gt]: new Date() } },
    ];

    // 정렬 설정
    const allowedSortColumns = ['created_at', 'priority', 'title'];
    const sortColumn = allowedSortColumns.includes(sort_by)
      ? sort_by
      : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const order = [[sortColumn, sortDirection]];

    // 목록 조회
    const { count, rows } = await Handover.findAndCountAll({
      where: whereCondition,
      order,
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['name'],
        },
      ],
    });

    // 응답 데이터 구성
    const responseData = {
      total: count,
      current_page: parseInt(page),
      total_pages: Math.ceil(count / limit),
      items: rows.map((item) => ({
        handover_id: item.handover_id,
        title: item.title,
        created_by: item.created_by,
        creator_name: item.creator ? item.creator.name : null,
        created_at: item.created_at,
        is_notice: item.is_notice,
        department: item.department,
        priority: item.priority,
        expiry_date: item.expiry_date,
      })),
    };

    return res
      .status(200)
      .json(createResponse(true, '인수인계 목록 조회 성공', responseData));
  } catch (error) {
    next(error);
  }
});

/**
 * 인수인계 상세 조회 API
 * GET /handover/:id
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 상세 정보 조회
    const handover = await Handover.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['name'],
        },
        {
          model: User,
          as: 'updater',
          attributes: ['name'],
        },
      ],
    });

    if (!handover) {
      return res
        .status(404)
        .json(
          createResponse(
            false,
            '해당 인수인계를 찾을 수 없습니다',
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    // 일반 사용자의 부서 접근 권한 확인 (공지사항이 아닌 경우)
    if (
      !handover.is_notice &&
      req.user.role !== 'ADMIN' &&
      handover.department &&
      handover.department !== req.user.department
    ) {
      return res
        .status(403)
        .json(
          createResponse(
            false,
            '다른 부서의 인수인계에 접근할 수 없습니다',
            null,
            ERROR_CODES.FORBIDDEN
          )
        );
    }

    // 응답 데이터 구성
    const responseData = {
      handover_id: handover.handover_id,
      title: handover.title,
      content: handover.content,
      created_by: handover.created_by,
      creator_name: handover.creator ? handover.creator.name : null,
      created_at: handover.created_at,
      updated_by: handover.updated_by,
      updater_name: handover.updater ? handover.updater.name : null,
      updated_at: handover.updated_at,
      is_notice: handover.is_notice,
      department: handover.department,
      priority: handover.priority,
      expiry_date: handover.expiry_date,
    };

    return res
      .status(200)
      .json(createResponse(true, '인수인계 상세 조회 성공', responseData));
  } catch (error) {
    next(error);
  }
});

/**
 * 인수인계 생성 API
 * POST /handover
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      title,
      content,
      is_notice = false,
      department,
      priority = 'MEDIUM',
      expiry_date,
    } = req.body;

    const userId = req.user.user_id;

    // 기본 유효성 검사
    if (!title || !content) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            '제목과 내용을 모두 입력해주세요',
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 공지사항인 경우 권한 확인
    if (is_notice && req.user.role !== 'ADMIN') {
      return res
        .status(403)
        .json(
          createResponse(
            false,
            '공지사항 등록은 관리자만 가능합니다',
            null,
            ERROR_CODES.FORBIDDEN
          )
        );
    }

    // 부서 지정 유효성 검사
    if (
      department &&
      req.user.role !== 'ADMIN' &&
      department !== req.user.department
    ) {
      return res
        .status(403)
        .json(
          createResponse(
            false,
            '다른 부서의 인수인계를 생성할 수 없습니다',
            null,
            ERROR_CODES.FORBIDDEN
          )
        );
    }

    // ID 생성 (마지막 ID + 1)
    const lastHandover = await Handover.findOne({
      order: [['handover_id', 'DESC']],
    });

    let newId = 'H001';
    if (lastHandover) {
      const lastIdNum = parseInt(lastHandover.handover_id.substring(1));
      newId = `H${String(lastIdNum + 1).padStart(3, '0')}`;
    }

    // 인수인계 생성
    const newHandover = await Handover.create({
      handover_id: newId,
      title,
      content,
      created_by: userId,
      updated_by: userId,
      is_notice,
      department: department || null,
      priority: priority || 'MEDIUM',
      expiry_date: expiry_date || null,
    });

    return res.status(201).json(
      createResponse(true, '인수인계가 성공적으로 생성되었습니다', {
        handover_id: newHandover.handover_id,
        title: newHandover.title,
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * 인수인계 수정 API
 * PUT /api/handover/:id
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, is_notice, department, priority, expiry_date } =
      req.body;

    const userId = req.user.user_id;

    // 기본 유효성 검사
    if (
      !title &&
      !content &&
      is_notice === undefined &&
      !department &&
      !priority &&
      expiry_date === undefined
    ) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            '수정할 내용을 입력해주세요',
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 인수인계 조회
    const handover = await Handover.findByPk(id);

    if (!handover) {
      return res
        .status(404)
        .json(
          createResponse(
            false,
            '해당 인수인계를 찾을 수 없습니다',
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    // 작성자 또는 관리자만 수정 가능
    if (handover.created_by !== userId && req.user.role !== 'ADMIN') {
      return res
        .status(403)
        .json(
          createResponse(
            false,
            '작성자 또는 관리자만 수정할 수 있습니다',
            null,
            ERROR_CODES.FORBIDDEN
          )
        );
    }

    // 공지사항으로 변경 시 관리자 권한 확인
    if (is_notice && !handover.is_notice && req.user.role !== 'ADMIN') {
      return res
        .status(403)
        .json(
          createResponse(
            false,
            '공지사항으로 변경은 관리자만 가능합니다',
            null,
            ERROR_CODES.FORBIDDEN
          )
        );
    }

    // 부서 변경 시 유효성 검사
    if (department && department !== handover.department) {
      if (req.user.role !== 'ADMIN' && department !== req.user.department) {
        return res
          .status(403)
          .json(
            createResponse(
              false,
              '다른 부서로 변경할 수 없습니다',
              null,
              ERROR_CODES.FORBIDDEN
            )
          );
      }
    }

    // 행 락 획득 후 수정
    try {
      const updateData = {};
      if (title) updateData.title = title;
      if (content) updateData.content = content;
      if (is_notice !== undefined) updateData.is_notice = is_notice;
      if (department !== undefined) updateData.department = department;
      if (priority) updateData.priority = priority;
      if (expiry_date !== undefined)
        updateData.expiry_date = expiry_date || null;
      updateData.updated_by = userId;

      const updatedHandover = await updateWithLock(
        Handover,
        id,
        updateData,
        userId
      );

      return res.status(200).json(
        createResponse(true, '인수인계가 성공적으로 수정되었습니다', {
          handover_id: updatedHandover.handover_id,
          title: updatedHandover.title,
        })
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res
          .status(404)
          .json(
            createResponse(
              false,
              '해당 인수인계를 찾을 수 없습니다',
              null,
              ERROR_CODES.NOT_FOUND
            )
          );
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * 인수인계 삭제 API
 * DELETE /api/handover/:id
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // 인수인계 조회
    const handover = await Handover.findByPk(id);

    if (!handover) {
      return res
        .status(404)
        .json(
          createResponse(
            false,
            '해당 인수인계를 찾을 수 없습니다',
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    // 작성자 또는 관리자만 삭제 가능
    if (handover.created_by !== userId && req.user.role !== 'ADMIN') {
      return res
        .status(403)
        .json(
          createResponse(
            false,
            '작성자 또는 관리자만 삭제할 수 있습니다',
            null,
            ERROR_CODES.FORBIDDEN
          )
        );
    }

    // 인수인계 삭제
    await handover.destroy();

    return res
      .status(200)
      .json(createResponse(true, '인수인계가 성공적으로 삭제되었습니다'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require('express');
const { Op } = require('sequelize');
const Handover = require('../models/HandoverModel');
const User = require('../models/UserModel');
const { authenticate, isAdmin } = require('../middlewares/AuthMiddleware');
const { createResponse, ERROR_CODES } = require('../utils/Constants');

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
      sort_by = 'create_at',
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
      } else if (req.user.user_role !== 'ADMIN') {
        // 일반 사용자는 자신의 부서와 전체 부서 대상 인수인계만 조회 가능
        whereCondition[Op.or] = [
          { department: req.user.user_department },
          { department: null },
        ];
      }
    }

    // 정렬 설정
    const allowedSortColumns = ['create_at', 'title'];
    const sortColumn = allowedSortColumns.includes(sort_by)
      ? sort_by
      : 'create_at';
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
          as: 'updater',
          attributes: ['user_id'],
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
        update_by: item.update_by,
        updater_id: item.updater ? item.updater.user_id : null,
        create_at: item.create_at,
        is_notice: item.is_notice,
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
          as: 'updater',
          attributes: ['user_id'],
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

    // 응답 데이터 구성
    const responseData = {
      handover_id: handover.handover_id,
      title: handover.title,
      content: handover.content,
      update_by: handover.update_by,
      updater_id: handover.updater ? handover.updater.user_id : null,
      create_at: handover.create_at,
      update_at: handover.update_at,
      is_notice: handover.is_notice,
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
    const { title, content, is_notice = false } = req.body;
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
    if (is_notice && req.user.user_role !== 'ADMIN') {
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

    // 인수인계 생성
    const newHandover = await Handover.create({
      title,
      content,
      update_by: userId,
      is_notice,
      create_at: new Date(),
      update_at: new Date(),
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
 * PUT /handover/:id
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, is_notice } = req.body;
    const userId = req.user.user_id;

    // 기본 유효성 검사
    if (!title && !content && is_notice === undefined) {
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
    if (handover.update_by !== userId && req.user.user_role !== 'ADMIN') {
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
    if (is_notice && !handover.is_notice && req.user.user_role !== 'ADMIN') {
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

    // 인수인계 수정
    const updateData = {
      update_by: userId,
      update_at: new Date(),
    };

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (is_notice !== undefined) updateData.is_notice = is_notice;

    await handover.update(updateData);

    return res.status(200).json(
      createResponse(true, '인수인계가 성공적으로 수정되었습니다', {
        handover_id: handover.handover_id,
        title: title || handover.title,
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * 인수인계 삭제 API
 * DELETE /handover/:id
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
    if (handover.update_by !== userId && req.user.user_role !== 'ADMIN') {
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
const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const Dashboard = require('../models/dashboard.model');
const User = require('../models/user.model');
const {
  authenticate,
  isAdmin,
  checkDepartmentAccess,
} = require('../middlewares/auth.middleware');
const {
  createResponse,
  ERROR_CODES,
  STATUS_TRANSITIONS,
} = require('../utils/Constants');
const {
  findWithRowLock,
  updateWithLock,
  releaseLock,
  NotFoundException,
  LockConflictException,
} = require('../utils/LockManager');

const router = express.Router();

/**
 * 대시보드 목록 조회 API
 * GET /dashboard/list
 * 쿼리 파라미터: status, department, search, page, size, sort_by, sort_order
 */
router.get('/list', authenticate, async (req, res, next) => {
  try {
    const {
      status,
      department,
      search,
      page = 1,
      size = 10,
      sort_by = 'estimated_delivery',
      sort_order = 'ASC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(size);
    const limit = parseInt(size);

    // 조회 조건 설정
    const whereCondition = {};

    if (status) {
      whereCondition.status = status;
    }

    if (department) {
      whereCondition.department = department;
    }

    if (search) {
      whereCondition[Op.or] = [
        { order_number: { [Op.like]: `%${search}%` } },
        { customer_name: { [Op.like]: `%${search}%` } },
        { delivery_address: { [Op.like]: `%${search}%` } },
        { phone_number: { [Op.like]: `%${search}%` } },
      ];
    }

    // 일반 사용자는 자신의 부서 데이터만 볼 수 있음
    if (req.user.role !== 'ADMIN') {
      whereCondition.department = req.user.department;
    }

    // 정렬 설정 (안전한 컬럼만 허용)
    const allowedSortColumns = [
      'dashboard_id',
      'order_number',
      'customer_name',
      'status',
      'department',
      'estimated_delivery',
      'created_at',
      'updated_at',
      'priority',
    ];

    const sortColumn = allowedSortColumns.includes(sort_by)
      ? sort_by
      : 'estimated_delivery';
    const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const order = [[sortColumn, sortDirection]];

    // 목록 조회
    const { count, rows } = await Dashboard.findAndCountAll({
      where: whereCondition,
      order,
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['name'],
        },
        {
          model: User,
          as: 'updater',
          attributes: ['name', 'user_id'],
        },
      ],
    });

    // 응답 데이터 구성
    const responseData = {
      total: count,
      current_page: parseInt(page),
      total_pages: Math.ceil(count / limit),
      items: rows.map((item) => ({
        dashboard_id: item.dashboard_id,
        order_number: item.order_number,
        customer_name: item.customer_name,
        delivery_address: item.delivery_address,
        phone_number: item.phone_number,
        status: item.status,
        department: item.department,
        driver_id: item.driver_id,
        driver_name: item.driver ? item.driver.name : null,
        estimated_delivery: item.estimated_delivery,
        priority: item.priority,
        is_editing: item.updated_by !== null,
        editor: item.updater
          ? {
              user_id: item.updater.user_id,
              name: item.updater.name,
            }
          : null,
        updated_at: item.updated_at,
      })),
    };

    return res
      .status(200)
      .json(createResponse(true, '대시보드 목록 조회 성공', responseData));
  } catch (error) {
    next(error);
  }
});

/**
 * 대시보드 상세 조회 API
 * GET /dashboard/:id
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 상세 정보 조회
    const dashboard = await Dashboard.findByPk(id, {
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['name'],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['name'],
        },
        {
          model: User,
          as: 'updater',
          attributes: ['name', 'user_id'],
        },
      ],
    });

    if (!dashboard) {
      return res
        .status(404)
        .json(
          createResponse(
            false,
            '해당 주문을 찾을 수 없습니다',
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    // 일반 사용자는 자신의 부서 데이터만 접근 가능
    if (
      req.user.role !== 'ADMIN' &&
      dashboard.department !== req.user.department
    ) {
      return res
        .status(403)
        .json(
          createResponse(
            false,
            '다른 부서의 주문 정보에 접근할 수 없습니다',
            null,
            ERROR_CODES.FORBIDDEN
          )
        );
    }

    // 응답 데이터 구성
    const responseData = {
      dashboard_id: dashboard.dashboard_id,
      order_number: dashboard.order_number,
      customer_name: dashboard.customer_name,
      delivery_address: dashboard.delivery_address,
      phone_number: dashboard.phone_number,
      status: dashboard.status,
      department: dashboard.department,
      driver_id: dashboard.driver_id,
      driver_name: dashboard.driver ? dashboard.driver.name : null,
      estimated_delivery: dashboard.estimated_delivery,
      actual_delivery: dashboard.actual_delivery,
      order_items: dashboard.order_items,
      order_note: dashboard.order_note,
      priority: dashboard.priority,
      created_by: dashboard.created_by,
      creator_name: dashboard.creator ? dashboard.creator.name : null,
      created_at: dashboard.created_at,
      updated_by: dashboard.updated_by,
      updater_name: dashboard.updater ? dashboard.updater.name : null,
      updated_at: dashboard.updated_at,
      last_status_change: dashboard.last_status_change,
      latitude: dashboard.latitude,
      longitude: dashboard.longitude,
      status_history: dashboard.status_history
        ? JSON.parse(dashboard.status_history)
        : [],
      is_editing: dashboard.updated_by !== null,
      editor: dashboard.updater
        ? {
            user_id: dashboard.updater.user_id,
            name: dashboard.updater.name,
          }
        : null,
    };

    return res
      .status(200)
      .json(createResponse(true, '대시보드 상세 조회 성공', responseData));
  } catch (error) {
    next(error);
  }
});

/**
 * 대시보드 생성 API
 * POST /dashboard
 * 관리자만 접근 가능
 */
router.post('/', authenticate, isAdmin, async (req, res, next) => {
  try {
    const {
      order_number,
      customer_name,
      delivery_address,
      phone_number,
      department,
      driver_id,
      estimated_delivery,
      order_items,
      order_note,
      priority = 'MEDIUM',
      latitude,
      longitude,
    } = req.body;

    const userId = req.user.user_id;

    // 기본 유효성 검사
    if (
      !order_number ||
      !customer_name ||
      !delivery_address ||
      !phone_number ||
      !department
    ) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            '필수 항목을 모두 입력해주세요',
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 주문 번호 중복 확인
    const existingOrder = await Dashboard.findOne({
      where: { order_number },
    });

    if (existingOrder) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            '이미 존재하는 주문 번호입니다',
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // ID 생성 (마지막 ID + 1)
    const lastDashboard = await Dashboard.findOne({
      order: [['dashboard_id', 'DESC']],
    });

    let newId = 'D001';
    if (lastDashboard) {
      const lastIdNum = parseInt(lastDashboard.dashboard_id.substring(1));
      newId = `D${String(lastIdNum + 1).padStart(3, '0')}`;
    }

    // 상태 이력 초기화
    const statusHistory = [
      {
        status: 'PENDING',
        changed_at: new Date().toISOString(),
        changed_by: userId,
      },
    ];

    // 대시보드 생성
    const newDashboard = await Dashboard.create({
      dashboard_id: newId,
      order_number,
      customer_name,
      delivery_address,
      phone_number,
      status: 'PENDING',
      department,
      driver_id: driver_id || null,
      estimated_delivery: estimated_delivery || null,
      order_items: order_items || null,
      order_note: order_note || null,
      priority: priority || 'MEDIUM',
      created_by: userId,
      updated_by: null,
      latitude: latitude || null,
      longitude: longitude || null,
      status_history: JSON.stringify(statusHistory),
      last_status_change: new Date(),
    });

    return res.status(201).json(
      createResponse(true, '주문이 성공적으로 생성되었습니다', {
        dashboard_id: newDashboard.dashboard_id,
        order_number: newDashboard.order_number,
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * 대시보드 수정 API
 * PUT /dashboard/:id
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      customer_name,
      delivery_address,
      phone_number,
      status,
      department,
      driver_id,
      estimated_delivery,
      order_items,
      order_note,
      priority,
      latitude,
      longitude,
    } = req.body;

    const userId = req.user.user_id;

    // 유효성 검사
    if (
      !customer_name &&
      !delivery_address &&
      !phone_number &&
      !status &&
      !department &&
      driver_id === undefined &&
      !estimated_delivery &&
      !order_items &&
      !order_note &&
      !priority &&
      !latitude &&
      !longitude
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

    // 대시보드 조회
    const dashboard = await Dashboard.findByPk(id);

    if (!dashboard) {
      return res
        .status(404)
        .json(
          createResponse(
            false,
            '해당 주문을 찾을 수 없습니다',
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    // 일반 사용자는 자신의 부서 데이터만 수정 가능
    if (
      req.user.role !== 'ADMIN' &&
      dashboard.department !== req.user.department
    ) {
      return res
        .status(403)
        .json(
          createResponse(
            false,
            '다른 부서의 주문 정보를 수정할 수 없습니다',
            null,
            ERROR_CODES.FORBIDDEN
          )
        );
    }

    // 상태 변경 유효성 검사
    if (status && status !== dashboard.status) {
      // 상태 전이 규칙 확인
      const allowedStatuses = STATUS_TRANSITIONS[dashboard.status];
      if (!allowedStatuses.includes(status)) {
        return res
          .status(400)
          .json(
            createResponse(
              false,
              `현재 상태(${dashboard.status})에서 ${status}로 변경할 수 없습니다`,
              null,
              ERROR_CODES.VALIDATION_ERROR
            )
          );
      }
    }

    // 행 락 획득 후 수정
    try {
      const updateData = {};
      if (customer_name) updateData.customer_name = customer_name;
      if (delivery_address) updateData.delivery_address = delivery_address;
      if (phone_number) updateData.phone_number = phone_number;
      if (status) updateData.status = status;
      if (department && req.user.role === 'ADMIN')
        updateData.department = department;
      if (driver_id !== undefined) updateData.driver_id = driver_id || null;
      if (estimated_delivery)
        updateData.estimated_delivery = estimated_delivery;
      if (order_items) updateData.order_items = order_items;
      if (order_note !== undefined) updateData.order_note = order_note;
      if (priority) updateData.priority = priority;
      if (latitude) updateData.latitude = latitude;
      if (longitude) updateData.longitude = longitude;

      const updatedDashboard = await updateWithLock(
        Dashboard,
        id,
        updateData,
        userId
      );

      return res.status(200).json(
        createResponse(true, '주문이 성공적으로 수정되었습니다', {
          dashboard_id: updatedDashboard.dashboard_id,
          status: updatedDashboard.status,
        })
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res
          .status(404)
          .json(
            createResponse(
              false,
              '해당 주문을 찾을 수 없습니다',
              null,
              ERROR_CODES.NOT_FOUND
            )
          );
      }

      if (error instanceof LockConflictException) {
        return res
          .status(409)
          .json(
            createResponse(
              false,
              error.message,
              null,
              ERROR_CODES.LOCK_CONFLICT
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
 * 대시보드 삭제 API
 * DELETE /api/dashboard/:id
 * 관리자만 접근 가능
 */
router.delete('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 대시보드 조회
    const dashboard = await Dashboard.findByPk(id);

    if (!dashboard) {
      return res
        .status(404)
        .json(
          createResponse(
            false,
            '해당 주문을 찾을 수 없습니다',
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    // 대시보드 삭제
    await dashboard.destroy();

    return res
      .status(200)
      .json(createResponse(true, '주문이 성공적으로 삭제되었습니다'));
  } catch (error) {
    next(error);
  }
});

/**
 * 편집 락 획득 API
 * POST /api/dashboard/:id/lock
 */
router.post('/:id/lock', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // 대시보드 조회 (부서 확인)
    const dashboard = await Dashboard.findByPk(id);

    if (!dashboard) {
      return res
        .status(404)
        .json(
          createResponse(
            false,
            '해당 주문을 찾을 수 없습니다',
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    // 일반 사용자는 자신의 부서 데이터만 락 획득 가능
    if (
      req.user.role !== 'ADMIN' &&
      dashboard.department !== req.user.department
    ) {
      return res
        .status(403)
        .json(
          createResponse(
            false,
            '다른 부서의 주문 정보를 수정할 수 없습니다',
            null,
            ERROR_CODES.FORBIDDEN
          )
        );
    }

    try {
      // 락 획득 시도
      const lockedDashboard = await findWithRowLock(Dashboard, id, userId);

      return res.status(200).json(
        createResponse(true, '편집 락 획득 성공', {
          dashboard_id: lockedDashboard.dashboard_id,
          editor: {
            user_id: userId,
            name: req.user.name,
          },
        })
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res
          .status(404)
          .json(
            createResponse(
              false,
              '해당 주문을 찾을 수 없습니다',
              null,
              ERROR_CODES.NOT_FOUND
            )
          );
      }

      if (error instanceof LockConflictException) {
        return res
          .status(409)
          .json(
            createResponse(
              false,
              error.message,
              null,
              ERROR_CODES.LOCK_CONFLICT
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
 * 편집 락 해제 API
 * POST /api/dashboard/:id/unlock
 */
router.post('/:id/unlock', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // 대시보드 조회
    const dashboard = await Dashboard.findByPk(id);

    if (!dashboard) {
      return res
        .status(404)
        .json(
          createResponse(
            false,
            '해당 주문을 찾을 수 없습니다',
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    // 락 소유자 검증 (관리자는 모든 락 해제 가능)
    if (dashboard.updated_by !== userId && req.user.role !== 'ADMIN') {
      return res
        .status(403)
        .json(
          createResponse(
            false,
            '락 소유자만 락을 해제할 수 있습니다',
            null,
            ERROR_CODES.FORBIDDEN
          )
        );
    }

    // 락 해제
    const released = await releaseLock(Dashboard, id, dashboard.updated_by);

    if (!released) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            '락 해제에 실패했습니다',
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    return res.status(200).json(createResponse(true, '편집 락 해제 성공'));
  } catch (error) {
    next(error);
  }
});

/**
 * 시각화 데이터 조회 API
 * GET /api/dashboard/visualization
 * 쿼리 파라미터: chart_type (time/status/department), start_date, end_date, department
 */
router.get('/visualization', authenticate, async (req, res, next) => {
  try {
    const { chart_type = 'time', start_date, end_date, department } = req.query;

    // 날짜 필터 설정
    const dateFilter = {};
    if (start_date) {
      dateFilter.created_at = {
        ...dateFilter.created_at,
        [Op.gte]: new Date(start_date),
      };
    }
    if (end_date) {
      dateFilter.created_at = {
        ...dateFilter.created_at,
        [Op.lte]: new Date(end_date),
      };
    }

    // 부서 필터 설정
    const departmentFilter = department ? { department } : {};

    // 일반 사용자는 자신의 부서 데이터만 조회 가능
    if (req.user.role !== 'ADMIN') {
      departmentFilter.department = req.user.department;
    }

    // 필터 조건 결합
    const whereCondition = {
      ...dateFilter,
      ...departmentFilter,
    };

    let data = [];

    // 차트 타입에 따른 데이터 처리
    switch (chart_type) {
      case 'time':
        // 시간대별 주문 건수
        data = await Dashboard.findAll({
          attributes: [
            [fn('HOUR', col('created_at')), 'hour'],
            [fn('COUNT', col('dashboard_id')), 'count'],
          ],
          where: whereCondition,
          group: [fn('HOUR', col('created_at'))],
          order: [[literal('hour'), 'ASC']],
        });

        // 24시간 전체 데이터 포맷팅 (0부터 23시까지)
        const hourlyData = Array(24)
          .fill()
          .map((_, i) => ({
            hour: i,
            count: 0,
          }));

        data.forEach((item) => {
          const hour = parseInt(item.dataValues.hour);
          hourlyData[hour].count = parseInt(item.dataValues.count);
        });

        data = hourlyData;
        break;

      case 'status':
        // 상태별 주문 건수
        data = await Dashboard.findAll({
          attributes: ['status', [fn('COUNT', col('dashboard_id')), 'count']],
          where: whereCondition,
          group: ['status'],
        });

        // 모든 상태 포함하도록 포맷팅
        const allStatuses = [
          'PENDING',
          'ASSIGNED',
          'IN_TRANSIT',
          'DELIVERED',
          'CANCELLED',
        ];
        const statusData = allStatuses.map((status) => ({
          status,
          count: 0,
        }));

        data.forEach((item) => {
          const statusIndex = allStatuses.indexOf(item.dataValues.status);
          if (statusIndex !== -1) {
            statusData[statusIndex].count = parseInt(item.dataValues.count);
          }
        });

        data = statusData;
        break;

      case 'department':
        // 부서별 주문 건수
        data = await Dashboard.findAll({
          attributes: [
            'department',
            [fn('COUNT', col('dashboard_id')), 'count'],
          ],
          where: whereCondition,
          group: ['department'],
        });

        // 데이터 포맷팅
        data = data.map((item) => ({
          department: item.dataValues.department,
          count: parseInt(item.dataValues.count),
        }));
        break;

      case 'priority':
        // 우선순위별 주문 건수
        data = await Dashboard.findAll({
          attributes: ['priority', [fn('COUNT', col('dashboard_id')), 'count']],
          where: whereCondition,
          group: ['priority'],
        });

        // 모든 우선순위 포함하도록 포맷팅
        const allPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        const priorityData = allPriorities.map((priority) => ({
          priority,
          count: 0,
        }));

        data.forEach((item) => {
          const priorityIndex = allPriorities.indexOf(item.dataValues.priority);
          if (priorityIndex !== -1) {
            priorityData[priorityIndex].count = parseInt(item.dataValues.count);
          }
        });

        data = priorityData;
        break;

      default:
        return res
          .status(400)
          .json(
            createResponse(
              false,
              '지원하지 않는 차트 타입입니다',
              null,
              ERROR_CODES.VALIDATION_ERROR
            )
          );
    }

    return res
      .status(200)
      .json(
        createResponse(true, '시각화 데이터 조회 성공', { chart_type, data })
      );
  } catch (error) {
    next(error);
  }
});

/**
 * 배송 기사(드라이버) 목록 조회 API
 * GET /api/dashboard/drivers
 */
router.get('/drivers', authenticate, async (req, res, next) => {
  try {
    const { department } = req.query;

    // 조회 조건 설정
    const whereCondition = {
      role: 'USER',
    };

    // 부서 필터 적용
    if (department) {
      whereCondition.department = department;
    } else if (req.user.role !== 'ADMIN') {
      // 일반 사용자는 자신의 부서 기사만 조회 가능
      whereCondition.department = req.user.department;
    }

    // 드라이버 목록 조회
    const drivers = await User.findAll({
      where: whereCondition,
      attributes: ['user_id', 'name', 'department'],
      order: [['name', 'ASC']],
    });

    return res
      .status(200)
      .json(createResponse(true, '기사 목록 조회 성공', { drivers }));
  } catch (error) {
    next(error);
  }
});

module.exports = router;

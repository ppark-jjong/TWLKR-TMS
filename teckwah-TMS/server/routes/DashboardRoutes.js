const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const Dashboard = require('../models/DashboardModel');
const User = require('../models/UserModel');
const {
  authenticate,
  isAdmin,
  checkDepartmentAccess,
} = require('../middlewares/AuthMiddleware');
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
      sort_by = 'eta',
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
        { order_no: { [Op.like]: `%${search}%` } },
        { customer: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { contact: { [Op.like]: `%${search}%` } },
      ];
    }

    // 일반 사용자는 자신의 부서 데이터만 볼 수 있음
    if (req.user.user_role !== 'ADMIN') {
      whereCondition.department = req.user.user_department;
    }

    // 정렬 설정 (안전한 컬럼만 허용)
    const allowedSortColumns = [
      'dashboard_id',
      'order_no',
      'customer',
      'status',
      'department',
      'eta',
      'create_time',
      'update_at',
    ];

    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'eta';
    const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const order = [[sortColumn, sortDirection]];

    // 목록 조회
    const { count, rows } = await Dashboard.findAndCountAll({
      where: whereCondition,
      order,
      limit,
      offset,
    });

    // 응답 데이터 구성
    const responseData = {
      total: count,
      current_page: parseInt(page),
      total_pages: Math.ceil(count / limit),
      items: rows.map((item) => ({
        dashboard_id: item.dashboard_id,
        order_no: item.order_no,
        customer: item.customer,
        address: item.address,
        contact: item.contact,
        status: item.status,
        department: item.department,
        driver_name: item.driver_name,
        eta: item.eta,
        type: item.type,
        warehouse: item.warehouse,
        is_editing: item.updated_by !== null,
        updated_at: item.update_at,
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

    // 일반 사용자는 자신의 부서 데이터만 접근 가능
    if (
      req.user.user_role !== 'ADMIN' &&
      dashboard.department !== req.user.user_department
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
      order_no: dashboard.order_no,
      type: dashboard.type,
      status: dashboard.status,
      department: dashboard.department,
      warehouse: dashboard.warehouse,
      sla: dashboard.sla,
      eta: dashboard.eta,
      create_time: dashboard.create_time,
      depart_time: dashboard.depart_time,
      complete_time: dashboard.complete_time,
      postal_code: dashboard.postal_code,
      city: dashboard.city,
      county: dashboard.county,
      district: dashboard.district,
      address: dashboard.address,
      customer: dashboard.customer,
      contact: dashboard.contact,
      driver_name: dashboard.driver_name,
      driver_contact: dashboard.driver_contact,
      updated_by: dashboard.updated_by,
      remark: dashboard.remark,
      update_at: dashboard.update_at,
      distance: dashboard.distance,
      duration_time: dashboard.duration_time,
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
 * 모든 인증된 사용자 접근 가능
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      order_no,
      type,
      department,
      warehouse,
      sla,
      eta,
      postal_code,
      address,
      customer,
      contact,
      driver_name,
      driver_contact,
      remark,
    } = req.body;

    const userId = req.user.user_id;

    // 기본 유효성 검사
    if (
      !order_no ||
      !type ||
      !department ||
      !warehouse ||
      !sla ||
      !eta ||
      !postal_code ||
      !address ||
      !customer
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
      where: { order_no },
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

    // 대시보드 생성
    const newDashboard = await Dashboard.create({
      order_no,
      type,
      status: 'WAITING',
      department,
      warehouse,
      sla,
      eta: new Date(eta),
      create_time: new Date(),
      postal_code,
      address,
      customer,
      contact: contact || null,
      driver_name: driver_name || null,
      driver_contact: driver_contact || null,
      updated_by: userId,
      remark: remark || null,
    });

    return res.status(201).json(
      createResponse(true, '주문이 성공적으로 생성되었습니다', {
        dashboard_id: newDashboard.dashboard_id,
        order_no: newDashboard.order_no,
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
      type,
      status,
      warehouse,
      sla,
      eta,
      address,
      customer,
      contact,
      driver_name,
      driver_contact,
      remark,
      depart_time,
      complete_time,
    } = req.body;

    const userId = req.user.user_id;

    // 유효성 검사 - 최소한 하나의 필드는 업데이트 필요
    if (
      !type &&
      !status &&
      !warehouse &&
      !sla &&
      !eta &&
      !address &&
      !customer &&
      contact === undefined &&
      !driver_name &&
      driver_contact === undefined &&
      remark === undefined &&
      !depart_time &&
      !complete_time
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
      req.user.user_role !== 'ADMIN' &&
      dashboard.department !== req.user.user_department
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
      // 상태 전이 규칙 확인 (여기에 적절한 규칙 정의 필요)
      const validStatusTransitions = {
        'WAITING': ['IN_PROGRESS', 'CANCEL'],
        'IN_PROGRESS': ['COMPLETE', 'ISSUE', 'CANCEL'],
        'COMPLETE': ['ISSUE'],
        'ISSUE': ['IN_PROGRESS', 'COMPLETE', 'CANCEL'],
        'CANCEL': []
      };
      
      const allowedStatuses = validStatusTransitions[dashboard.status] || [];
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

    // 수정 데이터 구성
    const updateData = {
      updated_by: userId,
      update_at: new Date()
    };
    
    if (type) updateData.type = type;
    if (status) updateData.status = status;
    if (warehouse) updateData.warehouse = warehouse;
    if (sla) updateData.sla = sla;
    if (eta) updateData.eta = new Date(eta);
    if (address) updateData.address = address;
    if (customer) updateData.customer = customer;
    if (contact !== undefined) updateData.contact = contact || null;
    if (driver_name) updateData.driver_name = driver_name;
    if (driver_contact !== undefined) updateData.driver_contact = driver_contact || null;
    if (remark !== undefined) updateData.remark = remark || null;
    if (depart_time) updateData.depart_time = new Date(depart_time);
    if (complete_time) updateData.complete_time = new Date(complete_time);
    
    // 상태가 COMPLETE로 변경될 때 완료 시간 자동 설정
    if (status === 'COMPLETE' && !complete_time) {
      updateData.complete_time = new Date();
    }
    
    // 상태가 IN_PROGRESS로 변경될 때 출발 시간 자동 설정
    if (status === 'IN_PROGRESS' && !depart_time && !dashboard.depart_time) {
      updateData.depart_time = new Date();
    }

    // 대시보드 업데이트
    await dashboard.update(updateData);

    return res.status(200).json(
      createResponse(true, '주문이 성공적으로 수정되었습니다', {
        dashboard_id: dashboard.dashboard_id,
        status: updateData.status || dashboard.status,
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * 대시보드 삭제 API
 * DELETE /dashboard/:id
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
 * 시각화 데이터 조회 API
 * GET /dashboard/visualization
 * 쿼리 파라미터: chart_type (time/status/department), start_date, end_date, department
 */
router.get('/visualization', authenticate, async (req, res, next) => {
  try {
    const { chart_type = 'time', start_date, end_date, department } = req.query;

    // 날짜 필터 설정
    const dateFilter = {};
    if (start_date) {
      dateFilter.create_time = {
        ...dateFilter.create_time,
        [Op.gte]: new Date(start_date),
      };
    }
    if (end_date) {
      dateFilter.create_time = {
        ...dateFilter.create_time,
        [Op.lte]: new Date(end_date),
      };
    }

    // 부서 필터 설정
    const departmentFilter = department ? { department } : {};

    // 일반 사용자는 자신의 부서 데이터만 조회 가능
    if (req.user.user_role !== 'ADMIN') {
      departmentFilter.department = req.user.user_department;
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
            [fn('HOUR', col('create_time')), 'hour'],
            [fn('COUNT', col('dashboard_id')), 'count'],
          ],
          where: whereCondition,
          group: [fn('HOUR', col('create_time'))],
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
          'WAITING',
          'IN_PROGRESS',
          'COMPLETE',
          'ISSUE',
          'CANCEL'
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

      case 'type':
        // 유형별 주문 건수
        data = await Dashboard.findAll({
          attributes: [
            'type',
            [fn('COUNT', col('dashboard_id')), 'count'],
          ],
          where: whereCondition,
          group: ['type'],
        });

        // 데이터 포맷팅
        const allTypes = ['DELIVERY', 'RETURN'];
        const typeData = allTypes.map((type) => ({
          type,
          count: 0,
        }));

        data.forEach((item) => {
          const typeIndex = allTypes.indexOf(item.dataValues.type);
          if (typeIndex !== -1) {
            typeData[typeIndex].count = parseInt(item.dataValues.count);
          }
        });

        data = typeData;
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
 * 기사(드라이버) 목록 조회 API
 * GET /dashboard/drivers
 */
router.get('/drivers', authenticate, async (req, res, next) => {
  try {
    const { department } = req.query;

    // 조회 조건 설정
    const whereCondition = {
      user_role: 'USER',
    };

    // 부서 필터 적용
    if (department) {
      whereCondition.user_department = department;
    } else if (req.user.user_role !== 'ADMIN') {
      // 일반 사용자는 자신의 부서 기사만 조회 가능
      whereCondition.user_department = req.user.user_department;
    }

    // 드라이버 목록 조회
    const drivers = await User.findAll({
      where: whereCondition,
      attributes: ['user_id', 'user_department'],
      order: [['user_id', 'ASC']],
    });

    return res
      .status(200)
      .json(createResponse(true, '기사 목록 조회 성공', { drivers }));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
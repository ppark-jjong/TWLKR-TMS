const express = require("express");
const { Op, fn, col, literal } = require("sequelize");
const Dashboard = require("../models/DashboardModel");
const User = require("../models/UserModel");
const {
  authenticate,
  isAdmin,
  checkDepartmentAccess,
} = require("../middlewares/AuthMiddleware");
const {
  createResponse,
  ERROR_CODES,
  STATUS_TRANSITIONS,
} = require("../utils/Constants");
const {
  findWithRowLock,
  updateWithLock,
  releaseLock,
  LockConflictException,
  NotFoundException,
} = require("../utils/LockManager");

const router = express.Router();

/**
 * 대시보드 목록 조회 API
 * GET /dashboard/list
 * 쿼리 파라미터: status, department, search, page, size, sort_by, sort_order
 */
router.get("/list", authenticate, async (req, res, next) => {
  try {
    const {
      start,
      end,
      status,
      department,
      search,
      page = 1,
      limit = 10,
      sort_by = "eta",
      sort_order = "ASC",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);

    // 조회 조건 설정
    const whereCondition = {};

    // ETA 기간 필터 - 서버 필터
    if (start) {
      whereCondition.eta = {
        ...whereCondition.eta,
        [Op.gte]: new Date(start),
      };
    }

    if (end) {
      whereCondition.eta = {
        ...whereCondition.eta,
        [Op.lte]: new Date(end),
      };
    }

    // 검색 조건
    if (search) {
      whereCondition[Op.or] = [
        { order_no: { [Op.like]: `%${search}%` } },
        { customer: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { contact: { [Op.like]: `%${search}%` } },
      ];
    }

    // 정렬 설정 (안전한 컬럼만 허용)
    const allowedSortColumns = [
      "dashboard_id",
      "order_no",
      "customer",
      "status",
      "department",
      "eta",
      "create_time",
      "update_at",
    ];

    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : "eta";
    const sortDirection = sort_order.toUpperCase() === "DESC" ? "DESC" : "ASC";
    const order = [[sortColumn, sortDirection]];

    // 목록 조회
    const { count, rows } = await Dashboard.findAndCountAll({
      where: whereCondition,
      order,
      limit: pageSize,
      offset,
    });

    // 응답 데이터 구성 - 명세서에 맞게 필드명 고정
    const responseData = {
      total: count,
      current_page: parseInt(page),
      total_pages: Math.ceil(count / pageSize),
      data: rows.map((item) => ({
        dashboard_id: item.dashboard_id,
        department: item.department,
        type: item.type,
        warehouse: item.warehouse,
        order_no: item.order_no,
        region: item.region,
        eta: item.eta,
        customer: item.customer,
        status: item.status,
        driver_name: item.driver_name || "",
      })),
    };

    return res
      .status(200)
      .json(createResponse(true, "대시보드 목록 조회 성공", responseData));
  } catch (error) {
    next(error);
  }
});

/**
 * 대시보드 상세 조회 API
 * GET /dashboard/:id
 */
router.get("/:id", authenticate, async (req, res, next) => {
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
            "해당 주문을 찾을 수 없습니다",
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    // 응답 데이터 구성 - 모든 필드 반환
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
      region: dashboard.region,
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
      .json(createResponse(true, "대시보드 상세 조회 성공", responseData));
  } catch (error) {
    next(error);
  }
});

/**
 * 대시보드 생성 API
 * POST /dashboard
 * 모든 인증된 사용자 접근 가능
 */
router.post("/", authenticate, async (req, res, next) => {
  try {
    const {
      order_no,
      type,
      department,
      warehouse,
      sla,
      eta,
      create_time,
      postal_code,
      address,
      customer,
      contact,
      driver_name,
      driver_contact,
      remark,
      update_at,
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
            "필수 항목을 모두 입력해주세요",
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
            "이미 존재하는 주문 번호입니다",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 대시보드 생성
    const newDashboard = await Dashboard.create({
      order_no,
      type,
      status: "WAITING",
      department,
      warehouse,
      sla,
      eta: new Date(eta),
      create_time: create_time ? new Date(create_time) : new Date(),
      postal_code,
      address,
      customer,
      contact: contact || null,
      driver_name: driver_name || null,
      driver_contact: driver_contact || null,
      updated_by: userId,
      remark: remark || null,
      update_at: update_at ? new Date(update_at) : new Date(),
    });

    return res.status(201).json(
      createResponse(true, "주문이 성공적으로 생성되었습니다", {
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
router.put("/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      type,
      warehouse,
      sla,
      eta,
      address,
      customer,
      contact,
      driver_name,
      driver_contact,
      remark,
    } = req.body;

    const userId = req.user.user_id;

    // 유효성 검사 - 최소한 하나의 필드는 업데이트 필요
    if (
      !type &&
      !warehouse &&
      !sla &&
      !eta &&
      !address &&
      !customer &&
      contact === undefined &&
      !driver_name &&
      driver_contact === undefined &&
      remark === undefined
    ) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "수정할 내용을 입력해주세요",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    try {
      // 행 수준 락 획득
      const dashboard = await findWithRowLock(Dashboard, id);

      // 수정 데이터 구성
      const updateData = {
        updated_by: userId,
        update_at: new Date(),
      };

      if (type) updateData.type = type;
      if (warehouse) updateData.warehouse = warehouse;
      if (sla) updateData.sla = sla;
      if (eta) updateData.eta = new Date(eta);
      if (address) updateData.address = address;
      if (customer) updateData.customer = customer;
      if (contact !== undefined) updateData.contact = contact || null;
      if (driver_name) updateData.driver_name = driver_name;
      if (driver_contact !== undefined)
        updateData.driver_contact = driver_contact || null;
      if (remark !== undefined) updateData.remark = remark || null;

      // 업데이트 실행
      await updateWithLock(dashboard, updateData);

      return res.status(200).json(
        createResponse(true, "주문이 성공적으로 수정되었습니다", {
          dashboard_id: dashboard.dashboard_id,
        })
      );
    } catch (error) {
      if (error instanceof LockConflictException) {
        return res
          .status(409)
          .json(
            createResponse(
              false,
              "다른 사용자가 현재 편집 중입니다. 잠시 후 다시 시도해주세요.",
              null,
              ERROR_CODES.LOCK_CONFLICT
            )
          );
      } else if (error instanceof NotFoundException) {
        return res
          .status(404)
          .json(
            createResponse(
              false,
              "해당 주문을 찾을 수 없습니다",
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
 * 배차 처리 API
 * PATCH /dashboard/:id/assign
 */
router.patch("/:id/assign", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { driver_name, driver_contact } = req.body;
    const userId = req.user.user_id;

    // 필수 항목 검증
    if (!driver_name) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "기사 이름은 필수 항목입니다",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    try {
      // 행 수준 락 획득
      const dashboard = await findWithRowLock(Dashboard, id);

      // 배차 정보 업데이트
      const updateData = {
        driver_name,
        driver_contact: driver_contact || null,
        updated_by: userId,
        update_at: new Date(),
      };

      // 업데이트 실행
      await updateWithLock(dashboard, updateData);

      return res.status(200).json(
        createResponse(true, "배차 정보가 성공적으로 업데이트되었습니다", {
          dashboard_id: dashboard.dashboard_id,
          driver_name,
          driver_contact,
        })
      );
    } catch (error) {
      if (error instanceof LockConflictException) {
        return res
          .status(409)
          .json(
            createResponse(
              false,
              "다른 사용자가 현재 편집 중입니다. 잠시 후 다시 시도해주세요.",
              null,
              ERROR_CODES.LOCK_CONFLICT
            )
          );
      } else if (error instanceof NotFoundException) {
        return res
          .status(404)
          .json(
            createResponse(
              false,
              "해당 주문을 찾을 수 없습니다",
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
 * 상태 변경 API
 * PATCH /dashboard/:id/status
 */
router.patch("/:id/status", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.user_id;

    // 필수 항목 검증
    if (!status) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "상태값은 필수 항목입니다",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    try {
      // 행 수준 락 획득
      const dashboard = await findWithRowLock(Dashboard, id);

      // 상태 전이 규칙 확인 (관리자가 아닌 경우)
      if (req.user.user_role !== "ADMIN" && status !== dashboard.status) {
        const validStatusTransitions =
          STATUS_TRANSITIONS[dashboard.status] || [];
        if (!validStatusTransitions.includes(status)) {
          await releaseLock(dashboard);
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

      // 상태 업데이트 데이터 구성
      const updateData = {
        status,
        updated_by: userId,
        update_at: new Date(),
      };

      // 상태 변경에 따른 시간 자동 설정
      // 대기(WAITING)에서 진행(IN_PROGRESS)로 변경될 때 depart_time 자동 설정
      if (
        dashboard.status === "WAITING" &&
        status === "IN_PROGRESS" &&
        !dashboard.depart_time
      ) {
        updateData.depart_time = new Date();
      }

      // 진행(IN_PROGRESS)에서 완료(COMPLETE), 이슈(ISSUE), 취소(CANCEL)로 변경될 때 complete_time 자동 설정
      if (
        dashboard.status === "IN_PROGRESS" &&
        ["COMPLETE", "ISSUE", "CANCEL"].includes(status) &&
        !dashboard.complete_time
      ) {
        updateData.complete_time = new Date();
      }

      // 이슈(ISSUE)에서 완료(COMPLETE)나 취소(CANCEL)로 변경될 때 complete_time 자동 설정
      if (
        dashboard.status === "ISSUE" &&
        ["COMPLETE", "CANCEL"].includes(status) &&
        !dashboard.complete_time
      ) {
        updateData.complete_time = new Date();
      }

      // 업데이트 실행
      await updateWithLock(dashboard, updateData);

      return res.status(200).json(
        createResponse(true, "상태가 성공적으로 업데이트되었습니다", {
          dashboard_id: dashboard.dashboard_id,
          status,
          depart_time: updateData.depart_time,
          complete_time: updateData.complete_time,
        })
      );
    } catch (error) {
      if (error instanceof LockConflictException) {
        return res
          .status(409)
          .json(
            createResponse(
              false,
              "다른 사용자가 현재 편집 중입니다. 잠시 후 다시 시도해주세요.",
              null,
              ERROR_CODES.LOCK_CONFLICT
            )
          );
      } else if (error instanceof NotFoundException) {
        return res
          .status(404)
          .json(
            createResponse(
              false,
              "해당 주문을 찾을 수 없습니다",
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
 * 대시보드 삭제 API
 * DELETE /dashboard/:id
 * 관리자만 접근 가능
 */
router.delete("/:id", authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      // 행 수준 락 적용하여 대시보드 조회
      const dashboard = await findWithRowLock(Dashboard, id);

      // 대시보드 삭제
      await dashboard.destroy({ transaction: dashboard.transaction });

      // 성공 시 트랜잭션 커밋
      await dashboard.transaction.commit();

      return res
        .status(200)
        .json(createResponse(true, "주문이 성공적으로 삭제되었습니다"));
    } catch (error) {
      if (error instanceof LockConflictException) {
        return res
          .status(409)
          .json(
            createResponse(
              false,
              "다른 사용자가 현재 편집 중입니다. 잠시 후 다시 시도해주세요.",
              null,
              ERROR_CODES.LOCK_CONFLICT
            )
          );
      } else if (error instanceof NotFoundException) {
        return res
          .status(404)
          .json(
            createResponse(
              false,
              "해당 주문을 찾을 수 없습니다",
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
 * 다중 배차 처리 API
 * PATCH /dashboard/multi-assign
 */
router.patch("/multi-assign", authenticate, async (req, res, next) => {
  try {
    const { ids, driver_name, driver_contact } = req.body;
    const userId = req.user.user_id;

    // 필수 항목 검증
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "선택된 주문이 없습니다",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    if (!driver_name) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "기사 이름은 필수 항목입니다",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 결과 추적용 객체
    const results = {
      success: [],
      failed: [],
    };

    // 각 주문 건에 대해 순차적으로 배차 처리
    for (const id of ids) {
      try {
        // 락 획득 시도
        const dashboard = await findWithRowLock(Dashboard, id);

        // 권한 체크
        if (
          req.user.user_role !== "ADMIN" &&
          dashboard.department !== req.user.user_department
        ) {
          await releaseLock(dashboard);
          results.failed.push({
            id,
            reason: "다른 부서의 주문 정보를 수정할 수 없습니다",
          });
          continue;
        }

        // 업데이트 데이터
        const updateData = {
          driver_name,
          driver_contact: driver_contact || null,
          updated_by: userId,
          update_at: new Date(),
        };

        // 업데이트 실행
        await updateWithLock(dashboard, updateData);

        // 성공 기록
        results.success.push(id);
      } catch (error) {
        if (error instanceof LockConflictException) {
          results.failed.push({
            id,
            reason: "다른 사용자가 현재 편집 중입니다",
          });
        } else if (error instanceof NotFoundException) {
          results.failed.push({
            id,
            reason: "주문을 찾을 수 없습니다",
          });
        } else {
          results.failed.push({
            id,
            reason: "알 수 없는 오류",
          });
        }
      }
    }

    // 결과 리턴
    return res.status(200).json(
      createResponse(
        results.success.length > 0,
        `${results.success.length}건의 주문에 배차 정보가 업데이트되었습니다${
          results.failed.length > 0
            ? `, ${results.failed.length}건은 실패했습니다`
            : ""
        }`,
        {
          success_count: results.success.length,
          failed_count: results.failed.length,
          ...results,
        }
      )
    );
  } catch (error) {
    next(error);
  }
});

/**
 * 시각화 데이터 조회 API
 * GET /dashboard/visualization
 * 쿼리 파라미터: chart_type (time/status/department), start_date, end_date, department
 */
router.get("/visualization", authenticate, isAdmin, async (req, res, next) => {
  try {
    const { chart_type = "time", start_date, end_date, department } = req.query;

    // 날짜 필터 설정
    const whereCondition = {};
    if (start_date) {
      whereCondition.create_time = {
        ...whereCondition.create_time,
        [Op.gte]: new Date(start_date),
      };
    }
    if (end_date) {
      whereCondition.create_time = {
        ...whereCondition.create_time,
        [Op.lte]: new Date(end_date),
      };
    }

    // 부서 필터 설정
    if (department) {
      whereCondition.department = department;
    }

    let data = [];

    // 차트 타입에 따른 데이터 처리
    switch (chart_type) {
      case "time":
        // 시간대별 주문 건수
        data = await Dashboard.findAll({
          attributes: [
            [fn("HOUR", col("create_time")), "hour"],
            [fn("COUNT", col("dashboard_id")), "count"],
            ["department", "department"],
          ],
          where: whereCondition,
          group: [fn("HOUR", col("create_time")), "department"],
          order: [[literal("hour"), "ASC"]],
        });

        // 데이터 포맷팅 - 시간대별, 부서별로 구조화
        const timeData = {};

        // 모든 시간대 초기화 (9~18시는 1시간 단위, 나머지는 그룹화)
        for (let i = 9; i <= 18; i++) {
          timeData[i] = {
            hour: i,
            CS: 0,
            HES: 0,
            LENOVO: 0,
          };
        }

        // 18~20시 그룹
        timeData["18-20"] = {
          hour: "18-20",
          CS: 0,
          HES: 0,
          LENOVO: 0,
        };

        // 20~24시 그룹
        timeData["20-24"] = {
          hour: "20-24",
          CS: 0,
          HES: 0,
          LENOVO: 0,
        };

        // 0~9시 그룹
        timeData["0-9"] = {
          hour: "0-9",
          CS: 0,
          HES: 0,
          LENOVO: 0,
        };

        // 데이터 채우기
        data.forEach((item) => {
          const hour = parseInt(item.dataValues.hour);
          const dept = item.dataValues.department;
          const count = parseInt(item.dataValues.count);

          if (hour >= 9 && hour <= 18) {
            // 9~18시는 1시간 단위로 표시
            timeData[hour][dept] += count;
          } else if (hour > 18 && hour < 20) {
            // 18~20시 그룹
            timeData["18-20"][dept] += count;
          } else if (hour >= 20) {
            // 20~24시 그룹
            timeData["20-24"][dept] += count;
          } else {
            // 0~9시 그룹
            timeData["0-9"][dept] += count;
          }
        });

        // 결과 배열로 변환
        data = Object.values(timeData);
        break;

      case "department":
        // 부서별 상태 분포 - 3개의 파이차트 데이터
        const deptData = {};

        // CS 부서 데이터
        const csData = await Dashboard.findAll({
          attributes: ["status", [fn("COUNT", col("dashboard_id")), "count"]],
          where: {
            ...whereCondition,
            department: "CS",
          },
          group: ["status"],
        });

        deptData["CS"] = {};
        csData.forEach((item) => {
          deptData["CS"][item.dataValues.status] = parseInt(
            item.dataValues.count
          );
        });

        // HES 부서 데이터
        const hesData = await Dashboard.findAll({
          attributes: ["status", [fn("COUNT", col("dashboard_id")), "count"]],
          where: {
            ...whereCondition,
            department: "HES",
          },
          group: ["status"],
        });

        deptData["HES"] = {};
        hesData.forEach((item) => {
          deptData["HES"][item.dataValues.status] = parseInt(
            item.dataValues.count
          );
        });

        // LENOVO 부서 데이터
        const lenovoData = await Dashboard.findAll({
          attributes: ["status", [fn("COUNT", col("dashboard_id")), "count"]],
          where: {
            ...whereCondition,
            department: "LENOVO",
          },
          group: ["status"],
        });

        deptData["LENOVO"] = {};
        lenovoData.forEach((item) => {
          deptData["LENOVO"][item.dataValues.status] = parseInt(
            item.dataValues.count
          );
        });

        data = deptData;
        break;

      default:
        return res
          .status(400)
          .json(
            createResponse(
              false,
              "지원하지 않는 차트 타입입니다",
              null,
              ERROR_CODES.VALIDATION_ERROR
            )
          );
    }

    return res
      .status(200)
      .json(
        createResponse(true, "시각화 데이터 조회 성공", { chart_type, data })
      );
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require("express");
const { authenticate, isAdmin } = require("../middlewares/AuthMiddleware");
const { createResponse, ERROR_CODES } = require("../utils/Constants");
const { sequelize } = require("../config/Database");
const { QueryTypes } = require("sequelize");

const router = express.Router();

/**
 * 배송 상태별 통계 API
 * GET /api/visualization/stats/status
 */
router.get("/stats/status", authenticate, async (req, res, next) => {
  try {
    const stats = await sequelize.query(
      `SELECT status, COUNT(*) as count
       FROM dashboards
       GROUP BY status`,
      { type: QueryTypes.SELECT }
    );

    return res
      .status(200)
      .json(createResponse(true, "상태별 통계 조회 성공", stats));
  } catch (error) {
    next(error);
  }
});

/**
 * 부서별 배송 통계 API
 * GET /api/visualization/stats/department
 */
router.get("/stats/department", authenticate, isAdmin, async (req, res, next) => {
  try {
    const stats = await sequelize.query(
      `SELECT department, COUNT(*) as count
       FROM dashboards
       GROUP BY department`,
      { type: QueryTypes.SELECT }
    );

    return res
      .status(200)
      .json(createResponse(true, "부서별 통계 조회 성공", stats));
  } catch (error) {
    next(error);
  }
});

/**
 * 기간별 배송 추이 API
 * GET /api/visualization/stats/trend
 * 쿼리 파라미터: period (daily, weekly, monthly)
 */
router.get("/stats/trend", authenticate, async (req, res, next) => {
  try {
    const { period = "daily" } = req.query;
    
    let dateFormat;
    let groupBy;
    
    switch (period) {
      case "weekly":
        dateFormat = "YYYY-WW";
        groupBy = "YEARWEEK(created_at)";
        break;
      case "monthly":
        dateFormat = "YYYY-MM";
        groupBy = "DATE_FORMAT(created_at, '%Y-%m')";
        break;
      case "daily":
      default:
        dateFormat = "YYYY-MM-DD";
        groupBy = "DATE(created_at)";
        break;
    }

    const stats = await sequelize.query(
      `SELECT ${groupBy} as date, COUNT(*) as count
       FROM dashboards
       GROUP BY ${groupBy}
       ORDER BY date ASC`,
      { type: QueryTypes.SELECT }
    );

    return res
      .status(200)
      .json(createResponse(true, "기간별 추이 조회 성공", stats));
  } catch (error) {
    next(error);
  }
});

module.exports = router;

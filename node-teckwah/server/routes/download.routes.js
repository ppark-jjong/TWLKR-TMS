const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');

// 임시 라우트 구조
router.get('/dashboard-excel', authMiddleware.verifyToken, (req, res) => {
  // 대시보드 Excel 다운로드 구현 예정
  res.json({ message: "대시보드 Excel 다운로드 엔드포인트" });
});

router.get('/handover-excel', authMiddleware.verifyToken, (req, res) => {
  // 인수인계 Excel 다운로드 구현 예정
  res.json({ message: "인수인계 Excel 다운로드 엔드포인트" });
});

module.exports = router;

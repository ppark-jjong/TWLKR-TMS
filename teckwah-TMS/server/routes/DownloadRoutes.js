const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/AuthMiddleware');

// 임시 라우트 구조
router.get('/dashboard-excel', authenticate, (req, res) => {
  // 대시보드 Excel 다운로드 구현 예정
  res.json({ message: '대시보드 Excel 다운로드 엔드포인트' });
});

router.get('/handover-excel', authenticate, (req, res) => {
  // 인수인계 Excel 다운로드 구현 예정
  res.json({ message: '인수인계 Excel 다운로드 엔드포인트' });
});

module.exports = router;

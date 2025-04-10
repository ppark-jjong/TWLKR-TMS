const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');

// 임시 라우트 구조
router.get('/list', authMiddleware.verifyToken, (req, res) => {
  // 대시보드 목록 구현 예정
  res.json({ message: "대시보드 목록 엔드포인트" });
});

router.get('/:dashboard_id', authMiddleware.verifyToken, (req, res) => {
  // 대시보드 상세 구현 예정
  res.json({ message: "대시보드 상세 엔드포인트", id: req.params.dashboard_id });
});

router.post('', authMiddleware.verifyToken, (req, res) => {
  // 대시보드 생성 구현 예정
  res.json({ message: "대시보드 생성 엔드포인트" });
});

router.put('/:dashboard_id', authMiddleware.verifyToken, (req, res) => {
  // 대시보드 수정 구현 예정
  res.json({ message: "대시보드 수정 엔드포인트", id: req.params.dashboard_id });
});

router.patch('/:dashboard_id/status', authMiddleware.verifyToken, (req, res) => {
  // 대시보드 상태 변경 구현 예정
  res.json({ message: "대시보드 상태 변경 엔드포인트", id: req.params.dashboard_id });
});

router.post('/assign', authMiddleware.verifyToken, (req, res) => {
  // 배차 처리 구현 예정
  res.json({ message: "배차 처리 엔드포인트" });
});

router.delete('', authMiddleware.verifyToken, authMiddleware.isAdmin, (req, res) => {
  // 대시보드 삭제 구현 예정
  res.json({ message: "대시보드 삭제 엔드포인트" });
});

router.get('/visualization', authMiddleware.verifyToken, (req, res) => {
  // 시각화 데이터 구현 예정
  res.json({ message: "시각화 데이터 엔드포인트" });
});

module.exports = router;

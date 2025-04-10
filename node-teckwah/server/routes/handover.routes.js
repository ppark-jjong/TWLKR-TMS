const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');

// 임시 라우트 구조
router.get('/list', authMiddleware.verifyToken, (req, res) => {
  // 인수인계 목록 구현 예정
  res.json({ message: "인수인계 목록 엔드포인트" });
});

router.get('/:handover_id', authMiddleware.verifyToken, (req, res) => {
  // 인수인계 상세 구현 예정
  res.json({ message: "인수인계 상세 엔드포인트", id: req.params.handover_id });
});

router.post('', authMiddleware.verifyToken, (req, res) => {
  // 인수인계 생성 구현 예정
  res.json({ message: "인수인계 생성 엔드포인트" });
});

router.put('/:handover_id', authMiddleware.verifyToken, (req, res) => {
  // 인수인계 수정 구현 예정
  res.json({ message: "인수인계 수정 엔드포인트", id: req.params.handover_id });
});

router.delete('/:handover_id', authMiddleware.verifyToken, (req, res) => {
  // 인수인계 삭제 구현 예정
  res.json({ message: "인수인계 삭제 엔드포인트", id: req.params.handover_id });
});

router.get('/notices', authMiddleware.verifyToken, (req, res) => {
  // 공지사항 목록 구현 예정
  res.json({ message: "공지사항 목록 엔드포인트" });
});

router.post('/:handover_id/read', authMiddleware.verifyToken, (req, res) => {
  // 읽음 상태 표시 구현 예정
  res.json({ message: "읽음 상태 표시 엔드포인트", id: req.params.handover_id });
});

module.exports = router;

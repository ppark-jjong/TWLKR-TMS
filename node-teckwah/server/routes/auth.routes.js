const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');

// 임시 라우트 구조
router.post('/login', (req, res) => {
  // 로그인 구현 예정
  res.json({ message: "로그인 엔드포인트" });
});

router.post('/refresh', (req, res) => {
  // 토큰 갱신 구현 예정
  res.json({ message: "토큰 갱신 엔드포인트" });
});

router.post('/logout', (req, res) => {
  // 로그아웃 구현 예정
  res.json({ message: "로그아웃 엔드포인트" });
});

router.get('/check-session', authMiddleware.verifyToken, (req, res) => {
  // 세션 확인 구현 예정
  res.json({ message: "세션 확인 엔드포인트" });
});

router.get('/users', authMiddleware.verifyToken, authMiddleware.isAdmin, (req, res) => {
  // 사용자 목록 구현 예정
  res.json({ message: "사용자 목록 엔드포인트" });
});

module.exports = router;

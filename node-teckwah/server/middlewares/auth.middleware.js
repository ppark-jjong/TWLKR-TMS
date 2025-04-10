const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

const verifyToken = (req, res, next) => {
  // Authorization 헤더 확인
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: '인증 토큰이 필요합니다',
      error_code: 'UNAUTHORIZED'
    });
  }

  // Bearer 토큰 추출
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '올바른 인증 토큰이 필요합니다',
      error_code: 'UNAUTHORIZED'
    });
  }

  try {
    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`토큰 검증 실패: ${error.message}`);
    
    return res.status(401).json({
      success: false,
      message: '유효하지 않거나 만료된 토큰입니다',
      error_code: 'UNAUTHORIZED'
    });
  }
};

const isAdmin = (req, res, next) => {
  // 사용자 역할 확인
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: '관리자 권한이 필요합니다',
      error_code: 'FORBIDDEN'
    });
  }
};

module.exports = {
  verifyToken,
  isAdmin
};

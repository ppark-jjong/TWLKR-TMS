const logger = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
  // 에러 로깅
  logger.error(`오류 발생: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // 에러 종류에 따른 응답
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: '입력 데이터가 유효하지 않습니다',
      error_code: 'VALIDATION_ERROR',
      errors: err.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: '중복된 데이터가 존재합니다',
      error_code: 'DUPLICATE_ERROR'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다',
      error_code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '만료된 토큰입니다',
      error_code: 'TOKEN_EXPIRED'
    });
  }

  // 사용자 정의 에러 처리
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error_code: err.errorCode || 'SERVER_ERROR'
    });
  }

  // 기본 에러 처리
  return res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다',
    error_code: 'SERVER_ERROR'
  });
};

module.exports = errorMiddleware;

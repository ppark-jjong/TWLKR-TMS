const logger = require('./logger');

/**
 * 사용자 정의 에러 클래스
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found 에러
 */
class NotFoundException extends AppError {
  constructor(message = '요청한 리소스를 찾을 수 없습니다') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 401 Unauthorized 에러
 */
class UnauthorizedException extends AppError {
  constructor(message = '인증이 필요합니다') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * 403 Forbidden 에러
 */
class ForbiddenException extends AppError {
  constructor(message = '권한이 없습니다') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 400 Bad Request 에러
 */
class ValidationException extends AppError {
  constructor(message = '입력값이 올바르지 않습니다') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * 409 Conflict 에러 (락 충돌용)
 */
class LockConflictException extends AppError {
  constructor(detail = '다른 사용자가 현재 이 데이터를 수정 중입니다', lockInfo = null) {
    super(detail, 409, 'LOCK_CONFLICT');
    this.detail = detail;
    this.lock_info = lockInfo;
  }
}

/**
 * 오류 응답 표준화 헬퍼 함수
 * @param {Error} error - 에러 객체
 * @param {Response} res - Express 응답 객체
 */
const standardErrorResponse = (error, res) => {
  // 운영 환경에서는 에러 스택 출력 제한
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 사용자 정의 에러인 경우
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      error_code: error.errorCode,
      ...(error.lock_info && { lock_info: error.lock_info }),
      ...((!isProduction && error.stack) && { stack: error.stack })
    });
  }
  
  // 일반 에러인 경우
  logger.error(`표준화되지 않은 오류: ${error.message}`, {
    error: error.stack
  });
  
  return res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다',
    error_code: 'SERVER_ERROR',
    ...((!isProduction && error.stack) && { stack: error.stack })
  });
};

/**
 * API 에러 처리 데코레이터 (Express 미들웨어 대용)
 * @param {string} context - 에러 컨텍스트 설명
 * @returns {function} 에러 핸들링 적용된 래퍼 함수
 */
const errorHandler = (context) => (routeHandler) => {
  return async (req, res, next) => {
    try {
      await routeHandler(req, res, next);
    } catch (error) {
      logger.error(`[${context}] 오류 발생: ${error.message}`, {
        error: error.stack,
        path: req.path,
        method: req.method,
        requestId: req.requestId
      });
      
      standardErrorResponse(error, res);
    }
  };
};

module.exports = {
  AppError,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ValidationException,
  LockConflictException,
  standardErrorResponse,
  errorHandler
};

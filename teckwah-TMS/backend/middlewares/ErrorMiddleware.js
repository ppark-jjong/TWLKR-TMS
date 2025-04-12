const { createResponse, ERROR_CODES } = require("../utils/Constants");
const {
  LockConflictException,
  NotFoundException,
} = require("../utils/LockManager");

/**
 * 전역 에러 핸들러 미들웨어
 */
const errorHandler = (err, req, res, next) => {
  console.error("에러 발생:", err);

  // 특정 예외 타입에 따른 응답 처리
  if (err instanceof LockConflictException) {
    return res
      .status(409)
      .json(
        createResponse(false, err.message, null, ERROR_CODES.LOCK_CONFLICT)
      );
  }

  if (err instanceof NotFoundException) {
    return res
      .status(404)
      .json(createResponse(false, err.message, null, ERROR_CODES.NOT_FOUND));
  }

  // Sequelize 유효성 검사 오류
  if (
    err.name === "SequelizeValidationError" ||
    err.name === "SequelizeUniqueConstraintError"
  ) {
    const errors = err.errors.map((e) => e.message);
    return res
      .status(400)
      .json(
        createResponse(
          false,
          "입력 데이터가 유효하지 않습니다",
          { errors },
          ERROR_CODES.VALIDATION_ERROR
        )
      );
  }

  // JWT 인증 오류
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res
      .status(401)
      .json(
        createResponse(
          false,
          "인증에 실패했습니다",
          null,
          ERROR_CODES.UNAUTHORIZED
        )
      );
  }

  // 기타 오류는 일반 서버 오류로 처리
  return res
    .status(500)
    .json(
      createResponse(
        false,
        "서버 오류가 발생했습니다. 나중에 다시 시도해주세요.",
        null,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      )
    );
};

module.exports = errorHandler;

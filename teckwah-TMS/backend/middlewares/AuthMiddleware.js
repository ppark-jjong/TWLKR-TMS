const User = require("../models/UserModel");
const { createResponse, ERROR_CODES } = require("../utils/Constants");

/**
 * 세션 기반 인증 미들웨어
 */
const authenticate = async (req, res, next) => {
  try {
    // 세션에서 사용자 정보 확인
    if (!req.session || !req.session.user) {
      return res
        .status(401)
        .json(
          createResponse(
            false,
            "인증이 필요합니다",
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    // 세션에 있는 사용자 정보 가져오기
    const sessionUser = req.session.user;

    // 데이터베이스에서 최신 사용자 정보 확인 (필요시)
    try {
      const user = await User.findByPk(sessionUser.user_id);

      if (!user) {
        // 세션은 있지만 DB에서 사용자를 찾을 수 없는 경우
        req.session.destroy();
        return res
          .status(401)
          .json(
            createResponse(
              false,
              "유효하지 않은 사용자입니다",
              null,
              ERROR_CODES.UNAUTHORIZED
            )
          );
      }

      // 요청 객체에 사용자 정보 추가
      req.user = {
        user_id: user.user_id,
        role: user.user_role,
        department: user.user_department,
      };

      next();
    } catch (err) {
      console.error("사용자 정보 조회 오류:", err);
      return res
        .status(401)
        .json(
          createResponse(
            false,
            "인증 정보를 확인할 수 없습니다",
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }
  } catch (error) {
    console.error("인증 미들웨어 오류:", error);
    return res
      .status(500)
      .json(
        createResponse(
          false,
          "서버 오류가 발생했습니다",
          null,
          ERROR_CODES.INTERNAL_SERVER_ERROR
        )
      );
  }
};

/**
 * 관리자 권한 확인 미들웨어
 */
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res
      .status(403)
      .json(
        createResponse(
          false,
          "관리자 권한이 필요합니다",
          null,
          ERROR_CODES.FORBIDDEN
        )
      );
  }

  next();
};

/**
 * 부서 권한 확인 미들웨어
 * 관리자이거나 해당 부서 소속인 경우에만 접근 허용
 */
const checkDepartmentAccess = (departmentField) => {
  return (req, res, next) => {
    // 관리자는 항상 접근 가능
    if (req.user && req.user.role === "ADMIN") {
      return next();
    }

    // 부서 필드가 지정되지 않은 경우 기본값 사용
    const field = departmentField || "department";

    // 리소스의 부서와 사용자 부서 비교
    const resourceDepartment = req.resource ? req.resource[field] : null;

    // 부서가 일치하지 않으면 접근 거부
    if (
      resourceDepartment &&
      req.user &&
      req.user.department !== resourceDepartment
    ) {
      return res
        .status(403)
        .json(
          createResponse(
            false,
            "해당 부서의 리소스에 접근할 권한이 없습니다",
            null,
            ERROR_CODES.FORBIDDEN
          )
        );
    }

    next();
  };
};

module.exports = {
  authenticate,
  isAdmin,
  checkDepartmentAccess,
};
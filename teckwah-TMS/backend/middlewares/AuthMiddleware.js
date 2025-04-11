const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const { createResponse, ERROR_CODES } = require('../utils/Constants');

/**
 * JWT 토큰 인증 미들웨어
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json(
          createResponse(
            false,
            '인증이 필요합니다',
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

      // 사용자 정보 가져오기
      const user = await User.findByPk(decoded.user_id);

      if (!user) {
        return res
          .status(401)
          .json(
            createResponse(
              false,
              '유효하지 않은 사용자입니다',
              null,
              ERROR_CODES.UNAUTHORIZED
            )
          );
      }

      // 요청 객체에 사용자 정보 추가
      req.user = {
        user_id: user.user_id,
        name: user.name,
        role: user.role,
        department: user.department,
      };

      next();
    } catch (err) {
      // 토큰 검증 실패
      if (err.name === 'TokenExpiredError') {
        return res
          .status(401)
          .json(
            createResponse(
              false,
              '인증이 만료되었습니다',
              null,
              ERROR_CODES.UNAUTHORIZED
            )
          );
      }

      return res
        .status(401)
        .json(
          createResponse(
            false,
            '유효하지 않은 인증입니다',
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }
  } catch (error) {
    console.error('인증 미들웨어 오류:', error);
    return res
      .status(500)
      .json(
        createResponse(
          false,
          '서버 오류가 발생했습니다',
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
  if (!req.user || req.user.role !== 'ADMIN') {
    return res
      .status(403)
      .json(
        createResponse(
          false,
          '관리자 권한이 필요합니다',
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
    if (req.user && req.user.role === 'ADMIN') {
      return next();
    }

    // 부서 필드가 지정되지 않은 경우 기본값 사용
    const field = departmentField || 'department';

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
            '해당 부서의 리소스에 접근할 권한이 없습니다',
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

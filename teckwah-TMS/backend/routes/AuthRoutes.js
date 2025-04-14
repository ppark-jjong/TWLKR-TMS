const express = require('express');
const User = require('../models/UserModel');
const { authenticate } = require('../middlewares/AuthMiddleware');
const { createResponse, ERROR_CODES } = require('../utils/Constants');

const router = express.Router();

/**
 * 로그인 API
 * POST /auth/login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { user_id, password } = req.body;

    if (!user_id || !password) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            '아이디와 비밀번호를 모두 입력해주세요',
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 사용자 조회
    const user = await User.findByPk(user_id);

    if (!user) {
      return res
        .status(401)
        .json(
          createResponse(
            false,
            '아이디 또는 비밀번호가 일치하지 않습니다',
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    // 비밀번호 검증
    const isValidPassword = await user.validatePassword(password);

    if (!isValidPassword) {
      return res
        .status(401)
        .json(
          createResponse(
            false,
            '아이디 또는 비밀번호가 일치하지 않습니다',
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    // 세션에 사용자 정보 저장
    req.session.user = {
      user_id: user.user_id,
      role: user.user_role,
      department: user.user_department,
    };
<<<<<<< HEAD
    
    // 세션 저장 확인 - 명시적으로 save 호출
=======

    // 세션 저장 완료 후 응답 반환
>>>>>>> main
    req.session.save((err) => {
      if (err) {
        console.error('세션 저장 오류:', err);
        return res
          .status(500)
          .json(
            createResponse(
              false,
              '로그인 처리 중 오류가 발생했습니다.',
              null,
              ERROR_CODES.INTERNAL_SERVER_ERROR
            )
          );
      }
<<<<<<< HEAD
      
      // 로그인 세션 정보 디버깅
      console.log(`사용자 로그인 성공: ${user.user_id}, 세션ID: ${req.sessionID}`);
      
      // 로그인 응답에 리다이렉션 경로 포함
=======

      // 로그인 응답 반환
>>>>>>> main
      return res.status(200).json(
        createResponse(true, '로그인 성공', {
          user: {
            user_id: user.user_id,
            role: user.user_role,
            department: user.user_department,
          },
<<<<<<< HEAD
          redirectTo: "/dashboard/list" // 로그인 후 리다이렉션 경로 추가
=======
>>>>>>> main
        })
      );
    });
  } catch (error) {
    console.error("로그인 처리 중 오류:", error);
    next(error);
  }
});

/**
 * 세션 확인 API
 * GET /auth/session
 */
router.get('/session', async (req, res, next) => {
  try {
<<<<<<< HEAD
    // 세션 쿠키 및 세션 정보 디버깅
    console.log("세션 확인 요청:", {
      sessionID: req.sessionID,
      hasCookies: !!req.cookies,
      cookieNames: req.cookies ? Object.keys(req.cookies) : [],
      hasSession: !!req.session,
      hasUser: !!(req.session && req.session.user)
    });
    
=======
>>>>>>> main
    // 세션 정보 확인
    if (!req.session || !req.session.user) {
      return res
        .status(401)
        .json(
          createResponse(
            false,
<<<<<<< HEAD
            "유효한 세션이 없습니다",
            { redirectTo: "/login" },
=======
            '유효한 세션이 없습니다',
            null,
>>>>>>> main
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    // 세션에 있는 사용자 정보 반환
    return res.status(200).json(
      createResponse(true, '세션 정보 확인 성공', {
        user: req.session.user,
      })
    );
  } catch (error) {
    console.error('세션 확인 중 오류:', error);
    next(error);
  }
});

/**
 * 로그아웃 API
 * POST /auth/logout
 */
<<<<<<< HEAD
router.post("/logout", async (req, res, next) => {
=======
router.post('/logout', authenticate, async (req, res, next) => {
>>>>>>> main
  try {
    // 세션 파기 전 세션 정보 로깅
    console.log(`사용자 로그아웃: ${req.session?.user?.user_id || '미인증'}, 세션ID: ${req.sessionID}`);
    
    // 세션 파기
    req.session.destroy((err) => {
      if (err) {
        console.error('세션 파기 중 오류:', err);
        return res
          .status(500)
          .json(
            createResponse(
              false,
              '로그아웃 처리 중 오류가 발생했습니다',
              null,
              ERROR_CODES.INTERNAL_SERVER_ERROR
            )
          );
      }

<<<<<<< HEAD
      // 쿠키 삭제 (세션 쿠키)
      res.clearCookie("teckwah.sid");

      return res.status(200).json(
        createResponse(true, "로그아웃 성공", {
          redirectTo: "/login" // 로그아웃 후 리다이렉션 경로 추가
        })
      );
=======
      // 쿠키 삭제 (세션 쿠키 이름을 정확히 지정)
      res.clearCookie('teckwah.sid', {
        path: '/', // main.js의 세션 설정과 일치시킴
      });

      return res.status(200).json(createResponse(true, '로그아웃 성공'));
>>>>>>> main
    });
  } catch (error) {
    console.error("로그아웃 처리 중 오류:", error);
    next(error);
  }
});

/**
 * 현재 사용자 정보 조회 API
 * GET /auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  return res
    .status(200)
    .json(createResponse(true, '사용자 정보 조회 성공', { user: req.user }));
});

module.exports = router;

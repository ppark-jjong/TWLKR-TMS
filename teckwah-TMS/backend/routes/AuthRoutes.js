const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");
const { authenticate } = require("../middlewares/AuthMiddleware");
const { createResponse, ERROR_CODES } = require("../utils/Constants");

const router = express.Router();

/**
 * 로그인 API
 * POST /auth/login
 */
router.post("/login", async (req, res, next) => {
  try {
    const { user_id, password } = req.body;

    if (!user_id || !password) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "아이디와 비밀번호를 모두 입력해주세요",
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
            "아이디 또는 비밀번호가 일치하지 않습니다",
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
            "아이디 또는 비밀번호가 일치하지 않습니다",
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    // JWT 토큰 발급
    const accessToken = jwt.sign(
      { user_id: user.user_id, role: user.user_role },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRE_MINUTES
          ? `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES}m`
          : "15m",
      }
    );

    const refreshToken = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_REFRESH_SECRET_KEY,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRE_DAYS
          ? `${process.env.REFRESH_TOKEN_EXPIRE_DAYS}d`
          : "7d",
      }
    );

    // 리프레시 토큰 저장
    user.refresh_token = refreshToken;
    await user.save();

    // 리프레시 토큰을 HttpOnly 쿠키로 설정
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    return res.status(200).json(
      createResponse(true, "로그인 성공", {
        user: {
          user_id: user.user_id,
          role: user.user_role,
          department: user.user_department,
        },
        access_token: accessToken,
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * 토큰 갱신 API
 * POST /auth/refresh
 */
router.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res
        .status(401)
        .json(
          createResponse(
            false,
            "재인증이 필요합니다",
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    try {
      // 리프레시 토큰 검증
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET_KEY
      );

      // 사용자 조회
      const user = await User.findByPk(decoded.user_id);

      if (!user || user.refresh_token !== refreshToken) {
        return res
          .status(401)
          .json(
            createResponse(
              false,
              "잘못된 토큰입니다",
              null,
              ERROR_CODES.UNAUTHORIZED
            )
          );
      }

      // 새 액세스 토큰 발급
      const newAccessToken = jwt.sign(
        { user_id: user.user_id, role: user.user_role },
        process.env.JWT_SECRET_KEY,
        {
          expiresIn: process.env.ACCESS_TOKEN_EXPIRE_MINUTES
            ? `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES}m`
            : "15m",
        }
      );

      return res.status(200).json(
        createResponse(true, "토큰 갱신 성공", {
          access_token: newAccessToken,
        })
      );
    } catch (err) {
      // 토큰 검증 실패
      return res
        .status(401)
        .json(
          createResponse(
            false,
            "인증이 만료되었습니다. 다시 로그인해주세요",
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }
  } catch (error) {
    next(error);
  }
});

/**
 * 로그아웃 API
 * POST /auth/logout
 */
router.post("/logout", authenticate, async (req, res, next) => {
  try {
    // 리프레시 토큰 제거
    const user = await User.findByPk(req.user.user_id);

    if (user) {
      user.refresh_token = null;
      await user.save();
    }

    // 쿠키 제거
    res.clearCookie("refresh_token");

    return res.status(200).json(createResponse(true, "로그아웃 성공"));
  } catch (error) {
    next(error);
  }
});

/**
 * 현재 사용자 정보 조회 API
 * GET /auth/me
 */
router.get("/me", authenticate, async (req, res) => {
  return res
    .status(200)
    .json(createResponse(true, "사용자 정보 조회 성공", { user: req.user }));
});

module.exports = router;

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const { authenticate } = require('../middlewares/AuthMiddleware');
const { createResponse, ERROR_CODES } = require('../utils/Constants');

const router = express.Router();

/**
 * 로그??API
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
            '?�이?��? 비�?번호�?모두 ?�력?�주?�요',
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // ?�용??조회
    const user = await User.findByPk(user_id);

    if (!user) {
      return res
        .status(401)
        .json(
          createResponse(
            false,
            '?�이???�는 비�?번호가 ?�치?��? ?�습?�다',
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    // 비�?번호 검�?
    const isValidPassword = await user.validatePassword(password);

    if (!isValidPassword) {
      return res
        .status(401)
        .json(
          createResponse(
            false,
            '?�이???�는 비�?번호가 ?�치?��? ?�습?�다',
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    // JWT ?�큰 발급
    const accessToken = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET_KEY_KEY,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_MINUTES ? `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES}m` : '15m' }
    );

    const refreshToken = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_REFRESH_SECRET_KEY,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_DAYS ? `${process.env.REFRESH_TOKEN_EXPIRE_DAYS}d` : '7d' }
    );

    // 리프?�시 ?�큰 ?�??
    user.refresh_token = refreshToken;
    await user.save();

    // 리프?�시 ?�큰?� HttpOnly 쿠키�??�정
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7??
    });

    return res.status(200).json(
      createResponse(true, '로그???�공', {
        user: {
          user_id: user.user_id,
          name: user.name,
          role: user.role,
          department: user.department,
        },
        access_token: accessToken,
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * ?�큰 갱신 API
 * POST /auth/refresh
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res
        .status(401)
        .json(
          createResponse(
            false,
            '?�인증이 ?�요?�니??,
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    try {
      // 리프?�시 ?�큰 검�?
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY);

      // ?�용??조회
      const user = await User.findByPk(decoded.user_id);

      if (!user || user.refresh_token !== refreshToken) {
        return res
          .status(401)
          .json(
            createResponse(
              false,
              '?�못???�큰?�니??,
              null,
              ERROR_CODES.UNAUTHORIZED
            )
          );
      }

      // ???�세???�큰 발급
      const newAccessToken = jwt.sign(
        { user_id: user.user_id, role: user.role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_MINUTES ? `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES}m` || '15m' }
      );

      return res.status(200).json(
        createResponse(true, '?�큰 갱신 ?�공', {
          access_token: newAccessToken,
        })
      );
    } catch (err) {
      // ?�큰 검�??�패
      return res
        .status(401)
        .json(
          createResponse(
            false,
            '?�증??만료?�었?�니?? ?�시 로그?�해주세??,
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
 * 로그?�웃 API
 * POST /auth/logout
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // 리프?�시 ?�큰 ?�거
    const user = await User.findByPk(req.user.user_id);

    if (user) {
      user.refresh_token = null;
      await user.save();
    }

    // 쿠키 ?�거
    res.clearCookie('refresh_token');

    return res.status(200).json(createResponse(true, '로그?�웃 ?�공'));
  } catch (error) {
    next(error);
  }
});

/**
 * ?�재 ?�용???�보 조회 API
 * GET /auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  return res
    .status(200)
    .json(createResponse(true, '?�용???�보 조회 ?�공', { user: req.user }));
});

module.exports = router;

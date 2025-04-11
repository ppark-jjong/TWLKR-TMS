const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const { authenticate } = require('../middlewares/AuthMiddleware');
const { createResponse, ERROR_CODES } = require('../utils/Constants');

const router = express.Router();

/**
 * ë¡œê·¸??API
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
            '?„ì´?”ì? ë¹„ë?ë²ˆí˜¸ë¥?ëª¨ë‘ ?…ë ¥?´ì£¼?¸ìš”',
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // ?¬ìš©??ì¡°íšŒ
    const user = await User.findByPk(user_id);

    if (!user) {
      return res
        .status(401)
        .json(
          createResponse(
            false,
            '?„ì´???ëŠ” ë¹„ë?ë²ˆí˜¸ê°€ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤',
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    // ë¹„ë?ë²ˆí˜¸ ê²€ì¦?
    const isValidPassword = await user.validatePassword(password);

    if (!isValidPassword) {
      return res
        .status(401)
        .json(
          createResponse(
            false,
            '?„ì´???ëŠ” ë¹„ë?ë²ˆí˜¸ê°€ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤',
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    // JWT ? í° ë°œê¸‰
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

    // ë¦¬í”„?ˆì‹œ ? í° ?€??
    user.refresh_token = refreshToken;
    await user.save();

    // ë¦¬í”„?ˆì‹œ ? í°?€ HttpOnly ì¿ í‚¤ë¡??¤ì •
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7??
    });

    return res.status(200).json(
      createResponse(true, 'ë¡œê·¸???±ê³µ', {
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
 * ? í° ê°±ì‹  API
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
            '?¬ì¸ì¦ì´ ?„ìš”?©ë‹ˆ??,
            null,
            ERROR_CODES.UNAUTHORIZED
          )
        );
    }

    try {
      // ë¦¬í”„?ˆì‹œ ? í° ê²€ì¦?
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY);

      // ?¬ìš©??ì¡°íšŒ
      const user = await User.findByPk(decoded.user_id);

      if (!user || user.refresh_token !== refreshToken) {
        return res
          .status(401)
          .json(
            createResponse(
              false,
              '?˜ëª»??? í°?…ë‹ˆ??,
              null,
              ERROR_CODES.UNAUTHORIZED
            )
          );
      }

      // ???¡ì„¸??? í° ë°œê¸‰
      const newAccessToken = jwt.sign(
        { user_id: user.user_id, role: user.role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_MINUTES ? `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES}m` || '15m' }
      );

      return res.status(200).json(
        createResponse(true, '? í° ê°±ì‹  ?±ê³µ', {
          access_token: newAccessToken,
        })
      );
    } catch (err) {
      // ? í° ê²€ì¦??¤íŒ¨
      return res
        .status(401)
        .json(
          createResponse(
            false,
            '?¸ì¦??ë§Œë£Œ?˜ì—ˆ?µë‹ˆ?? ?¤ì‹œ ë¡œê·¸?¸í•´ì£¼ì„¸??,
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
 * ë¡œê·¸?„ì›ƒ API
 * POST /auth/logout
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // ë¦¬í”„?ˆì‹œ ? í° ?œê±°
    const user = await User.findByPk(req.user.user_id);

    if (user) {
      user.refresh_token = null;
      await user.save();
    }

    // ì¿ í‚¤ ?œê±°
    res.clearCookie('refresh_token');

    return res.status(200).json(createResponse(true, 'ë¡œê·¸?„ì›ƒ ?±ê³µ'));
  } catch (error) {
    next(error);
  }
});

/**
 * ?„ìž¬ ?¬ìš©???•ë³´ ì¡°íšŒ API
 * GET /auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  return res
    .status(200)
    .json(createResponse(true, '?¬ìš©???•ë³´ ì¡°íšŒ ?±ê³µ', { user: req.user }));
});

module.exports = router;

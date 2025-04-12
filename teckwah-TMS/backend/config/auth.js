require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User } = require("../models/UserModel");
const logger = require("../utils/Logger");

/**
 * 비밀번호 해싱
 * @param {string} password - 원본 비밀번호
 * @returns {string} 해싱된 비밀번호
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * 비밀번호 검증
 * @param {string} password - 검증할 비밀번호
 * @param {string} hashedPassword - 해싱된 비밀번호
 * @returns {boolean} 검증 결과
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * JWT 액세스 토큰 생성
 * @param {Object} payload - 토큰에 포함할 데이터
 * @returns {string} JWT 토큰
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "1h",
  });
};

/**
 * JWT 리프레시 토큰 생성
 * @param {string} userId - 사용자 ID
 * @returns {string} 리프레시 토큰
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ user_id: userId }, process.env.JWT_SECRET, {
    expiresIn: `${process.env.REFRESH_TOKEN_EXPIRE_DAYS || 7}d`,
  });
};

/**
 * 토큰 검증
 * @param {string} token - JWT 토큰
 * @returns {Object|null} 검증된 페이로드 또는 null
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.error(`토큰 검증 실패: ${error.message}`);
    return null;
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
};

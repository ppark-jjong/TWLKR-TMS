const path = require('path');
const bcrypt = require("bcryptjs");

// 환경변수 설정 - main.js와 동일한 방식 사용
require("dotenv").config({
  path:
    process.env.NODE_ENV === "production"
      ? path.join(__dirname, "..", "..", ".env")
      : path.join(__dirname, "..", "..", "deploy", ".env"),
});

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

module.exports = {
  hashPassword,
  comparePassword
};

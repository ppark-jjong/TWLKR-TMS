// frontend/src/utils/validationUtils.js

/**
 * 입력값 검증 유틸리티 함수
 * @module ValidationUtils
 */

/**
 * 우편번호 형식 검증
 * @param {string} postalCode - 우편번호
 * @returns {boolean} 유효성 여부
 */
export const isValidPostalCode = (postalCode) => {
  return /^\d{5}$/.test(postalCode);
};

/**
 * 전화번호 형식 검증
 * @param {string} contact - 전화번호
 * @returns {boolean} 유효성 여부
 */
export const isValidContact = (contact) => {
  return /^\d{2,3}-\d{3,4}-\d{4}$/.test(contact);
};
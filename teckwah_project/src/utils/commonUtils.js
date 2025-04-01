// src/utils/commonUtils.js
/**
 * 전화번호 포맷팅 (010-1234-5678 형식)
 * @param {string} phone - 전화번호
 * @returns {string} 포맷된 전화번호
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';

  // 숫자만 추출
  const cleaned = ('' + phone).replace(/\D/g, '');

  // 전화번호 형식 적용
  const match = cleaned.match(/^(\d{3})(\d{3,4})(\d{4})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  return phone;
};

/**
 * 우편번호 유효성 검사
 * @param {string} postalCode - 우편번호
 * @returns {boolean} 유효하면 true
 */
export const isValidPostalCode = (postalCode) => {
  if (!postalCode) return false;
  return /^\d{5}$/.test(postalCode);
};

/**
 * 전화번호 유효성 검사
 * @param {string} phone - 전화번호
 * @returns {boolean} 유효하면 true
 */
export const isValidPhoneNumber = (phone) => {
  if (!phone) return false;
  return /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/.test(phone);
};

/**
 * 문자열 잘라내기 (말줄임표 추가)
 * @param {string} str - 문자열
 * @param {number} maxLength - 최대 길이
 * @returns {string} 잘라낸 문자열
 */
export const truncateString = (str, maxLength) => {
  if (!str) return '';
  if (typeof str !== 'string') return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

/**
 * 객체 배열 정렬
 * @param {Array} array - 배열
 * @param {string} key - 정렬 키
 * @param {boolean} ascending - 오름차순이면 true
 * @returns {Array} 정렬된 배열
 */
export const sortArrayByKey = (array, key, ascending = true) => {
  if (!array || !Array.isArray(array) || !array.length) return [];

  return [...array].sort((a, b) => {
    // a나 b가 undefined/null인 경우 처리
    if (!a && !b) return 0;
    if (!a) return ascending ? 1 : -1;
    if (!b) return ascending ? -1 : 1;

    // key가 없는 경우 처리
    if (a[key] === undefined && b[key] === undefined) return 0;
    if (a[key] === undefined) return ascending ? 1 : -1;
    if (b[key] === undefined) return ascending ? -1 : 1;

    if (a[key] < b[key]) return ascending ? -1 : 1;
    if (a[key] > b[key]) return ascending ? 1 : -1;
    return 0;
  });
};

/**
 * 객체 배열 필터링
 * @param {Array} array - 배열
 * @param {Function} predicate - 필터 함수
 * @returns {Array} 필터링된 배열
 */
export const filterArray = (array, predicate) => {
  if (!array || !Array.isArray(array) || !array.length) return [];
  if (typeof predicate !== 'function') return array;
  return array.filter(predicate);
};

/**
 * 입력값 살균 처리 (XSS 방지)
 * @param {string} input - 입력값
 * @returns {string} 살균된 입력값
 */
export const sanitizeInput = (input) => {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * 에러 응답에서 오류 메시지 추출
 * @param {Error} error - 에러 객체
 * @param {string} defaultMessage - 기본 메시지
 * @returns {string} 오류 메시지
 */
export const getErrorMessage = (
  error,
  defaultMessage = '오류가 발생했습니다'
) => {
  if (!error) return defaultMessage;

  if (error.response && error.response.data) {
    // API 응답 오류
    return error.response.data.message || defaultMessage;
  }

  return error.message || defaultMessage;
};

export default {
  formatPhoneNumber,
  isValidPostalCode,
  isValidPhoneNumber,
  truncateString,
  sortArrayByKey,
  filterArray,
  sanitizeInput,
  getErrorMessage,
};

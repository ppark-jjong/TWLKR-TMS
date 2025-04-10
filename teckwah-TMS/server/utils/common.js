const { Op } = require('sequelize');
const logger = require('./Logger');
const { DeliveryStatus } = require('./Constants');

/**
 * 입력 데이터 정제
 * @param {string} input - 정제할 입력 문자열
 * @returns {string} 정제된 문자열
 */
const sanitizeInput = (input) => {
  if (!input) {
    return '';
  }

  // XSS 방지를 위한 기본 정제
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * 메모 포맷팅
 * @param {string} remark - 원본 메모
 * @param {string} userId - 사용자 ID
 * @returns {string} 포맷팅된 메모
 */
const formatRemark = (remark, userId) => {
  if (!remark) {
    return '';
  }

  const now = new Date();
  const timestamp = now.toLocaleString('ko-KR');
  const sanitizedRemark = sanitizeInput(remark);

  return `[${timestamp}] ${userId}: ${sanitizedRemark}`;
};

/**
 * 검색 쿼리 구성
 * @param {Object} baseQuery - 기본 쿼리 객체
 * @param {string} searchTerm - 검색어
 * @param {Array} searchFields - 검색 대상 필드 배열
 * @returns {Object} 검색 조건이 적용된 쿼리 객체
 */
const buildSearchQuery = (baseQuery, searchTerm, searchFields) => {
  if (!searchTerm || !searchFields || searchFields.length === 0) {
    return baseQuery;
  }

  const searchConditions = searchFields.map((field) => ({
    [field]: { [Op.like]: `%${searchTerm}%` },
  }));

  return {
    ...baseQuery,
    [Op.or]: searchConditions,
  };
};

/**
 * 페이지네이션 정보 계산
 * @param {number} totalItems - 전체 항목 수
 * @param {number} page - 현재 페이지
 * @param {number} pageSize - 페이지 크기
 * @returns {Object} 페이지네이션 정보
 */
const calculatePagination = (totalItems, page = 1, pageSize = 10) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.min(Math.max(1, page), totalPages || 1);
  const offset = (currentPage - 1) * pageSize;

  return {
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    offset,
  };
};

/**
 * 전화번호 포맷팅
 * @param {string} phoneNumber - 전화번호
 * @returns {string} 포맷팅된 전화번호
 */
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) {
    return '';
  }

  // 숫자만 추출
  const cleaned = phoneNumber.replace(/\D/g, '');

  if (cleaned.length === 11) {
    // 010-1234-5678 형식
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // 02-123-4567 형식
    if (cleaned.startsWith('02')) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(
        6
      )}`;
    }
    // 010-123-4567 형식
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // 포맷팅 불가능한 경우 원본 반환
  return phoneNumber;
};

module.exports = {
  sanitizeInput,
  formatRemark,
  buildSearchQuery,
  calculatePagination,
  formatPhoneNumber,
  DeliveryStatus,
};

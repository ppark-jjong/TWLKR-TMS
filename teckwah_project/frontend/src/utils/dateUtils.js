// frontend/src/utils/dateUtils.js

/**
 * 날짜 관련 유틸리티 함수
 * @module DateUtils
 */

import { format, parseISO } from 'date-fns';

/**
 * ISO 문자열을 지정된 형식으로 포맷팅
 * @param {string} isoString - ISO 형식 날짜 문자열
 * @param {string} formatStr - 출력 형식
 * @returns {string} 포맷팅된 날짜 문자열
 */
export const formatDate = (isoString, formatStr = 'yyyy-MM-dd') => {
  if (!isoString) return '-';
  try {
    return format(parseISO(isoString), formatStr);
  } catch {
    return '-';
  }
};

/**
 * ISO 문자열을 날짜와 시간 형식으로 포맷팅
 * @param {string} isoString - ISO 형식 날짜 문자열
 * @returns {string} 포맷팅된 날짜와 시간
 */
export const formatDateTime = (isoString) => {
  return formatDate(isoString, 'yyyy-MM-dd HH:mm');
};
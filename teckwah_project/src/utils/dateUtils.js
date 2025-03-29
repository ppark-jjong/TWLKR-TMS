// src/utils/dateUtils.js
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

// 한국어 로케일 설정
dayjs.locale('ko');

/**
 * 날짜/시간 포맷팅
 * @param {string|Date} date - 날짜/시간
 * @param {string} format - 포맷 (기본값: YYYY-MM-DD HH:mm:ss)
 * @returns {string} 포맷된 날짜/시간
 */
export const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

/**
 * 날짜만 포맷팅
 * @param {string|Date} date - 날짜
 * @returns {string} 포맷된 날짜 (YYYY-MM-DD)
 */
export const formatDateOnly = (date) => {
  return formatDate(date, 'YYYY-MM-DD');
};

/**
 * 시간만 포맷팅
 * @param {string|Date} date - 시간
 * @returns {string} 포맷된 시간 (HH:mm:ss)
 */
export const formatTimeOnly = (date) => {
  return formatDate(date, 'HH:mm:ss');
};

/**
 * ISO 문자열로 변환
 * @param {Date|dayjs.Dayjs} date - 날짜/시간
 * @returns {string} ISO 문자열
 */
export const toISOString = (date) => {
  if (!date) return undefined;
  if (dayjs.isDayjs(date)) {
    return date.toISOString();
  }
  return dayjs(date).toISOString();
};

/**
 * 날짜 범위 가져오기 (시작일, 종료일)
 * @param {number} days - 기간 (일)
 * @returns {Array<dayjs.Dayjs>} 시작일, 종료일
 */
export const getDateRange = (days = 7) => {
  const endDate = dayjs();
  const startDate = dayjs().subtract(days, 'day');
  return [startDate, endDate];
};

/**
 * 두 날짜 사이의 차이 계산 (일)
 * @param {string|Date} date1 - 첫 번째 날짜
 * @param {string|Date} date2 - 두 번째 날짜
 * @returns {number} 차이 (일)
 */
export const getDaysDiff = (date1, date2) => {
  return dayjs(date1).diff(dayjs(date2), 'day');
};

/**
 * 날짜가 오늘인지 확인
 * @param {string|Date} date - 날짜
 * @returns {boolean} 오늘이면 true
 */
export const isToday = (date) => {
  return dayjs(date).isSame(dayjs(), 'day');
};

/**
 * 날짜가 과거인지 확인
 * @param {string|Date} date - 날짜
 * @returns {boolean} 과거이면 true
 */
export const isPast = (date) => {
  return dayjs(date).isBefore(dayjs());
};

/**
 * 날짜가 미래인지 확인
 * @param {string|Date} date - 날짜
 * @returns {boolean} 미래이면 true
 */
export const isFuture = (date) => {
  return dayjs(date).isAfter(dayjs());
};

export default {
  formatDate,
  formatDateOnly,
  formatTimeOnly,
  toISOString,
  getDateRange,
  getDaysDiff,
  isToday,
  isPast,
  isFuture,
};
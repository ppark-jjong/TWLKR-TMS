// frontend/src/utils/Formatter.js
import dayjs from 'dayjs';

/**
 * 날짜 시간 포맷팅
 * @param {string|Date} date - 날짜
 * @param {string} format - 포맷 (기본값: YYYY-MM-DD HH:mm)
 * @returns {string} 포맷된 날짜 문자열
 */
export const formatDateTime = (date, format = 'YYYY-MM-DD HH:mm') => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

/**
 * 전화번호 포맷팅
 * @param {string} phone - 전화번호
 * @returns {string} 포맷된 전화번호
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.length < 4) return cleaned;
  if (cleaned.length < 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
};

/**
 * 숫자 포맷팅 (천단위 콤마)
 * @param {number} number - 숫자
 * @returns {string} 포맷된 숫자
 */
export const formatNumber = (number) => {
  if (number === undefined || number === null) return '-';
  return number.toLocaleString('ko-KR');
};

/**
 * 거리 포맷팅
 * @param {number} distance - 거리(km)
 * @returns {string} 포맷된 거리
 */
export const formatDistance = (distance) => {
  if (!distance) return '-';
  return `${distance}km`;
};

/**
 * 소요시간 포맷팅
 * @param {number} duration - 소요시간(분)
 * @returns {string} 포맷된 소요시간
 */
export const formatDuration = (duration) => {
  if (!duration) return '-';
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  if (hours === 0) return `${minutes}분`;
  return `${hours}시간 ${minutes}분`;
};
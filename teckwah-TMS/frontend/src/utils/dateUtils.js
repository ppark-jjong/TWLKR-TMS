/**
 * 날짜 처리 유틸리티 함수
 */
import dayjs from 'dayjs';

/**
 * 날짜 포맷팅 함수
 * @param {string} dateStr - 날짜 문자열
 * @param {string} format - 출력 형식 (기본값: YYYY-MM-DD HH:mm)
 * @returns {string} 포맷팅된 날짜 문자열
 */
export const formatDate = (dateStr, format = 'YYYY-MM-DD HH:mm') => {
  if (!dateStr) return '-';
  
  // 백엔드에서 이미 T가 공백으로 변환된 형식으로 오는 경우를 처리
  // ISO 형식이 아닌 경우에도 잘 처리되도록 설정
  try {
    return dayjs(dateStr).format(format);
  } catch (error) {
    console.warn('날짜 변환 오류:', error);
    return dateStr || '-'; // 변환 실패 시 원본 반환
  }
};

/**
 * 백엔드로 전송할 날짜 변환 함수
 * @param {Date|dayjs|string} date - 변환할 날짜
 * @returns {string} 공백 구분자 형식 날짜 문자열 (YYYY-MM-DD HH:MM:SS)
 */
export const toServerDateFormat = (date) => {
  if (!date) return null;
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

/**
 * 기존 코드 호환성을 위한 함수
 * @deprecated 공백 구분자 형식으로 통일되었으므로 toServerDateFormat 사용 권장
 */
export const toISOString = (date) => {
  console.warn('toISOString 대신 toServerDateFormat 사용을 권장합니다');
  return toServerDateFormat(date);
};

/**
 * 현재 날짜 문자열 반환
 * @param {string} format - 출력 형식 (기본값: YYYY-MM-DD)
 * @returns {string} 포맷팅된 현재 날짜
 */
export const getCurrentDate = (format = 'YYYY-MM-DD') => {
  return dayjs().format(format);
};

/**
 * 날짜 범위 구하기 (시작일, 종료일)
 * @param {dayjs|Date|string} date - 기준 날짜 (없으면 현재 날짜)
 * @param {number} days - 범위 일수 (기본값: 1)
 * @returns {Object} { startDate, endDate } 형식의 범위
 */
export const getDateRange = (date = null, days = 1) => {
  const baseDate = date ? dayjs(date) : dayjs();
  return {
    startDate: baseDate.format('YYYY-MM-DD'),
    endDate: baseDate.add(days, 'day').format('YYYY-MM-DD')
  };
};

/**
 * 우편번호 포맷 검증 및 수정
 * @param {string} postalCode - 입력된 우편번호
 * @returns {string} 수정된 우편번호 (4자리인 경우 앞에 '0' 추가)
 */
export const formatPostalCode = (postalCode) => {
  if (!postalCode) return '';
  
  // 숫자만 추출
  const numericValue = postalCode.replace(/[^0-9]/g, '');
  
  // 4자리인 경우 앞에 '0' 추가
  if (numericValue.length === 4) {
    return '0' + numericValue;
  }
  
  return numericValue;
};

export default {
  formatDate,
  toServerDateFormat,
  toISOString,
  getCurrentDate,
  getDateRange,
  formatPostalCode
};
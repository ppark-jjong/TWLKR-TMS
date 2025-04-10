/**
 * 날짜/시간 유틸리티 함수
 */

// KST 시간대 Offset (UTC+9)
const KST_OFFSET = 9 * 60 * 60 * 1000;

/**
 * 현재 KST 시간을 반환
 * @returns {Date} 현재 KST 날짜/시간
 */
const getKstNow = () => {
  const now = new Date();
  return new Date(now.getTime() + KST_OFFSET);
};

/**
 * Date 객체를 KST 기준으로 변환
 * @param {Date|string} date - 변환할 날짜
 * @returns {Date} KST로 변환된 날짜/시간
 */
const localizeToKst = (date) => {
  if (!date) {
    return null;
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.getTime() + KST_OFFSET);
};

/**
 * 문자열을 Date 객체로 파싱
 * @param {string} dateString - 날짜 문자열 (YYYY-MM-DD 또는 YYYY-MM-DD HH:mm:ss)
 * @returns {Date} 파싱된 Date 객체
 */
const parseDateTime = (dateString) => {
  if (!dateString) {
    return null;
  }
  
  // 날짜만 있는 경우 (YYYY-MM-DD)
  if (dateString.length === 10) {
    return new Date(`${dateString}T00:00:00Z`);
  }
  
  // 날짜와 시간이 있는 경우
  return new Date(dateString);
};

/**
 * 날짜 범위 생성
 * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
 * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
 * @returns {Object} 시작 및 종료 날짜를 포함하는 객체
 */
const getDateRange = (startDate, endDate) => {
  let start = null;
  let end = null;
  
  if (startDate) {
    start = parseDateTime(startDate);
    start.setHours(0, 0, 0, 0);
  }
  
  if (endDate) {
    end = parseDateTime(endDate);
    end.setHours(23, 59, 59, 999);
  }
  
  // 시작 날짜만 있는 경우, 종료 날짜는 시작 날짜로 설정
  if (start && !end) {
    end = new Date(start);
    end.setHours(23, 59, 59, 999);
  }
  
  // 종료 날짜만 있는 경우, 시작 날짜는 종료 날짜로 설정
  if (!start && end) {
    start = new Date(end);
    start.setHours(0, 0, 0, 0);
  }
  
  // 둘 다 없는 경우, 현재 날짜로 설정
  if (!start && !end) {
    const now = getKstNow();
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  }
  
  return { start, end };
};

/**
 * Date 객체를 MySQL 형식 문자열로 변환
 * @param {Date} date - 변환할 날짜
 * @returns {string} MySQL 형식 날짜 문자열 (YYYY-MM-DD HH:mm:ss)
 */
const formatToMySQLDateTime = (date) => {
  if (!date) {
    return null;
  }
  
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

module.exports = {
  getKstNow,
  localizeToKst,
  parseDateTime,
  getDateRange,
  formatToMySQLDateTime,
  KST_OFFSET
};

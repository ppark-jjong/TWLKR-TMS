/**
 * 유틸리티 헬퍼 함수
 */

/**
 * 날짜를 포맷팅하는 함수
 * @param {string|Date} date - 날짜 문자열 또는 Date 객체
 * @param {boolean} includeTime - 시간 포함 여부
 * @returns {string} 포맷팅된 날짜 문자열
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  
  // 유효하지 않은 날짜인 경우
  if (isNaN(dateObj.getTime())) return '-';
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  if (!includeTime) {
    return `${year}-${month}-${day}`;
  }
  
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

/**
 * 상태 값으로부터 라벨 및 색상 정보를 반환하는 함수
 * @param {string} status - 상태 값
 * @returns {Object} 상태 정보 객체 (label, color)
 */
export const getStatusInfo = (status) => {
  const statusMap = {
    'WAITING': { label: '대기', color: '#FFD591' },
    'IN_PROGRESS': { label: '진행', color: '#91CAFF' },
    'COMPLETE': { label: '완료', color: '#B7EB8F' },
    'ISSUE': { label: '이슈', color: '#FFA39E' },
    'CANCEL': { label: '취소', color: '#D9D9D9' },
  };
  
  return statusMap[status] || { label: '알 수 없음', color: '#D9D9D9' };
};

/**
 * 부서 값으로부터 라벨을 반환하는 함수
 * @param {string} department - 부서 값
 * @returns {string} 부서 라벨
 */
export const getDepartmentLabel = (department) => {
  const departmentMap = {
    'CS': 'CS',
    'HES': 'HES',
    'LENOVO': 'LENOVO',
  };
  
  return departmentMap[department] || department || '-';
};

/**
 * 창고 값으로부터 라벨을 반환하는 함수
 * @param {string} warehouse - 창고 값
 * @returns {string} 창고 라벨
 */
export const getWarehouseLabel = (warehouse) => {
  const warehouseMap = {
    'SEOUL': '서울',
    'BUSAN': '부산',
    'GWANGJU': '광주',
    'DAEJEON': '대전',
  };
  
  return warehouseMap[warehouse] || warehouse || '-';
};

/**
 * 유형 값으로부터 라벨을 반환하는 함수
 * @param {string} type - 유형 값
 * @returns {string} 유형 라벨
 */
export const getTypeLabel = (type) => {
  const typeMap = {
    'DELIVERY': '배송',
    'RETURN': '회수',
  };
  
  return typeMap[type] || type || '-';
};

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환하는 함수
 * @returns {string} 오늘 날짜
 */
export const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 특정 날짜로부터 N일 전 날짜를 YYYY-MM-DD 형식으로 반환하는 함수
 * @param {number} days - 이전 일수
 * @param {Date} [baseDate=new Date()] - 기준 날짜
 * @returns {string} N일 전 날짜
 */
export const getDaysAgo = (days, baseDate = new Date()) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() - days);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 값이 비어있는지 확인하는 함수 (null, undefined, 빈 문자열, 빈 배열, 빈 객체)
 * @param {*} value - 확인할 값
 * @returns {boolean} 비어있는지 여부
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  
  return false;
};

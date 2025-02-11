// frontend/src/utils/formatUtils.js

/**
 * 데이터 포맷팅 유틸리티 함수
 * @module FormatUtils
 */

/**
 * 배송 상태 코드를 한글로 변환
 * @param {string} status - 상태 코드
 * @returns {string} 한글 상태
 */
export const formatDeliveryStatus = (status) => {
  const statusMap = {
    'WAITING': '대기',
    'IN_PROGRESS': '진행',
    'COMPLETE': '완료',
    'ISSUE': '이슈'
  };
  return statusMap[status] || status;
};

/**
 * 상태별 배경색 반환
 * @param {string} status - 상태 코드
 * @returns {string} HEX 색상 코드
 */
export const getStatusColor = (status) => {
  const colorMap = {
    'WAITING': '#9e9e9e',    // 회색
    'IN_PROGRESS': '#ffd54f', // 노란색
    'COMPLETE': '#81c784',    // 초록색
    'ISSUE': '#e57373'       // 빨간색
  };
  return colorMap[status] || '#ffffff';
};
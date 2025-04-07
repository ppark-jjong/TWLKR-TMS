/**
 * 애플리케이션 전체에서 사용되는 상수값 정의
 */

// 상태 텍스트 매핑 (서버 상태 코드 기준)
export const STATUS_TEXT_MAP = {
  WAITING: '대기',
  IN_PROGRESS: '진행',
  COMPLETE: '완료',
  ISSUE: '이슈',
  CANCEL: '취소',
};

// 상태 색상 매핑 (Chart.js용)
export const STATUS_COLORS = {
  WAITING: 'rgba(255, 205, 86, 0.7)', // 노란색 (대기)
  IN_PROGRESS: 'rgba(54, 162, 235, 0.7)', // 파란색 (진행)
  COMPLETE: 'rgba(75, 192, 192, 0.7)', // 녹색 (완료)
  ISSUE: 'rgba(255, 99, 132, 0.7)', // 빨간색 (이슈)
  CANCEL: 'rgba(201, 203, 207, 0.7)', // 회색 (취소)
};

// 부서 색상 매핑 (Chart.js용)
export const DEPARTMENT_COLORS = {
  CS: 'rgba(54, 162, 235, 0.7)', // 파란색
  HES: 'rgba(255, 159, 64, 0.7)', // 주황색
  LENOVO: 'rgba(153, 102, 255, 0.7)', // 보라색
};

// 상태 변경 허용 매핑
export const STATUS_TRANSITIONS = {
  WAITING: ['IN_PROGRESS', 'CANCEL'],
  IN_PROGRESS: ['COMPLETE', 'ISSUE', 'CANCEL'],
  COMPLETE: [],
  ISSUE: [],
  CANCEL: [],
}; 
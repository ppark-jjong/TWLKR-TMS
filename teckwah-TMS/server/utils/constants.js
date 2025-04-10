// 상태 전이 규칙 정의
const STATUS_TRANSITIONS = {
  PENDING: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
};

// 표준 응답 형식
const createResponse = (success, message, data = null, error_code = null) => {
  return {
    success,
    message,
    ...(data && { data }),
    ...(error_code && { error_code })
  };
};

// 오류 코드 및 메시지
const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  LOCK_CONFLICT: 'LOCK_CONFLICT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

// 부서 목록
const DEPARTMENTS = [
  '배송1팀',
  '배송2팀',
  '운영팀',
  '시스템관리'
];

// 페이지네이션 기본값
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_SIZE: 10,
  MAX_SIZE: 100
};

// 대시보드 상태 값
const DASHBOARD_STATUSES = [
  'PENDING',      // 대기중
  'ASSIGNED',     // 배정됨
  'IN_TRANSIT',   // 배송중
  'DELIVERED',    // 배송완료
  'CANCELLED'     // 취소됨
];

module.exports = {
  STATUS_TRANSITIONS,
  createResponse,
  ERROR_CODES,
  DEPARTMENTS,
  PAGINATION,
  DASHBOARD_STATUSES
};
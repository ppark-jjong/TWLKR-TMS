// 상태 전이 규칙 정의 - 명세서와 일치하도록 수정
const STATUS_TRANSITIONS = {
  'WAITING': ['IN_PROGRESS', 'CANCEL'],
  'IN_PROGRESS': ['COMPLETE', 'ISSUE', 'CANCEL'],
  'COMPLETE': ['ISSUE'],
  'ISSUE': ['IN_PROGRESS', 'COMPLETE', 'CANCEL'],
  'CANCEL': []
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
  'CS',
  'HES',
  'LENOVO'
];

// 페이지네이션 기본값
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_SIZE: 10,
  MAX_SIZE: 100
};

// 대시보드 상태 값
const DASHBOARD_STATUSES = [
  'WAITING',      // 대기중
  'IN_PROGRESS',  // 진행중
  'COMPLETE',     // 완료
  'ISSUE',        // 이슈
  'CANCEL'        // 취소
];

// 창고 위치
const WAREHOUSES = [
  'SEOUL',  // 서울
  'BUSAN',  // 부산 
  'GWANGJU',// 광주
  'DAEJEON' // 대전
];

module.exports = {
  STATUS_TRANSITIONS,
  createResponse,
  ERROR_CODES,
  DEPARTMENTS,
  PAGINATION,
  DASHBOARD_STATUSES,
  WAREHOUSES
};
// 상태 전이 규칙
const STATUS_TRANSITIONS = {
  'WAITING': ['IN_PROGRESS', 'CANCEL'],
  'IN_PROGRESS': ['COMPLETE', 'ISSUE'],
  'COMPLETE': [],  // 최종 상태
  'ISSUE': [],     // 최종 상태
  'CANCEL': []     // 최종 상태
};

// 상태 표시 텍스트
const STATUS_TEXT_MAP = {
  'WAITING': '대기중',
  'IN_PROGRESS': '진행중',
  'COMPLETE': '완료',
  'ISSUE': '이슈',
  'CANCEL': '취소'
};

// 응답 메시지
const MESSAGES = {
  'SUCCESS': {
    'LOGIN': '로그인에 성공했습니다',
    'LOGOUT': '로그아웃되었습니다',
    'CREATE': '생성되었습니다',
    'UPDATE': '수정되었습니다',
    'DELETE': '삭제되었습니다',
    'REFRESH_TOKEN': '토큰이 갱신되었습니다'
  },
  'ERROR': {
    'UNAUTHORIZED': '인증이 필요합니다',
    'FORBIDDEN': '권한이 없습니다',
    'NOT_FOUND': '요청한 리소스를 찾을 수 없습니다',
    'INVALID_CREDENTIALS': '아이디 또는 비밀번호가 올바르지 않습니다',
    'VALIDATION': '입력값이 올바르지 않습니다',
    'SERVER_ERROR': '서버 오류가 발생했습니다',
    'LOCK_CONFLICT': '다른 사용자가 작업 중입니다'
  },
  'VALIDATION': {
    'REQUIRED': '{field}이(가) 필요합니다',
    'INVALID_FORMAT': '{field}의 형식이 올바르지 않습니다',
    'INVALID_STATUS': '올바르지 않은 상태 값입니다'
  },
  'LOCK': {
    'ACQUIRE_SUCCESS': '리소스 락 획득에 성공했습니다',
    'RELEASE_SUCCESS': '리소스 락이 해제되었습니다',
    'CONFLICT': '{user}가 이미 편집 중입니다'
  }
};

// 배송 상태
const DeliveryStatus = {
  WAITING: 'WAITING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
  ISSUE: 'ISSUE',
  CANCEL: 'CANCEL'
};

module.exports = {
  STATUS_TRANSITIONS,
  STATUS_TEXT_MAP,
  MESSAGES,
  DeliveryStatus
};

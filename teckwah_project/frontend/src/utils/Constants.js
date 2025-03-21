// src/utils/Constants.js
/**
 * 통합 상수 정의 파일
 */

// 폰트 스타일 정의
export const FONT_STYLES = {
  TITLE: {
    LARGE: { fontSize: '24px', fontWeight: 600 },
    MEDIUM: { fontSize: '20px', fontWeight: 600 },
    SMALL: { fontSize: '16px', fontWeight: 600 },
  },
  BODY: {
    LARGE: { fontSize: '16px', fontWeight: 400 },
    MEDIUM: { fontSize: '14px', fontWeight: 400 },
    SMALL: { fontSize: '12px', fontWeight: 400 },
  },
  LABEL: { fontSize: '14px', fontWeight: 500 },
};

/**
 * 배송 타입 정의
 */
export const TYPE_TYPES = {
  DELIVERY: 'DELIVERY',
  RETURN: 'RETURN',
};

/**
 * 배송 타입 표시 텍스트
 */
export const TYPE_TEXTS = {
  DELIVERY: '배송',
  RETURN: '회수',
};

/**
 * 종류별 색상 정의
 */
export const TYPE_COLORS = {
  DELIVERY: '#0050c8',
  RETURN: '#7b1fa2',
};

/**
 * 배송 상태 정의
 */
export const STATUS_TYPES = {
  WAITING: 'WAITING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
  ISSUE: 'ISSUE',
  CANCEL: 'CANCEL',
};

/**
 * 배송 상태 표시 텍스트
 */
export const STATUS_TEXTS = {
  WAITING: '대기',
  IN_PROGRESS: '진행',
  COMPLETE: '완료',
  ISSUE: '이슈',
  CANCEL: '취소',
};

/**
 * 배송 상태별 색상
 */
export const STATUS_COLORS = {
  WAITING: 'default',
  IN_PROGRESS: 'warning',
  COMPLETE: 'success',
  ISSUE: 'error',
  CANCEL: 'default',
};

/**
 * 상태별 배경색 정의
 */
export const STATUS_BG_COLORS = {
  WAITING: {
    normal: '#d4e6ff',
    hover: '#bdd7ff',
  },
  IN_PROGRESS: {
    normal: '#FFF4DE',
    hover: '#FFE2B5',
  },
  COMPLETE: {
    normal: '#e6f7e6',
    hover: '#d4f0d4',
  },
  ISSUE: {
    normal: '#FFE9E9',
    hover: '#FFD1D1',
  },
  CANCEL: {
    normal: '#F5F5F5',
    hover: '#E0E0E0',
  },
};

/**
 * 부서 정의
 */
export const DEPARTMENT_TYPES = {
  CS: 'CS',
  HES: 'HES',
  LENOVO: 'LENOVO',
};

/**
 * 부서 표시 텍스트
 */
export const DEPARTMENT_TEXTS = {
  CS: 'CS',
  HES: 'HES',
  LENOVO: 'LENOVO',
};

/**
 * 창고 위치 정의
 */
export const WAREHOUSE_TYPES = {
  SEOUL: 'SEOUL',
  BUSAN: 'BUSAN',
  GWANGJU: 'GWANGJU',
  DAEJEON: 'DAEJEON',
};

/**
 * 창고 위치 표시 텍스트
 */
export const WAREHOUSE_TEXTS = {
  SEOUL: '서울',
  BUSAN: '부산',
  GWANGJU: '광주',
  DAEJEON: '대전',
};

/**
 * 차트 타입 정의
 */
export const CHART_TYPES = {
  DELIVERY_STATUS: 'delivery_status',
  HOURLY_ORDERS: 'hourly_orders',
};

/**
 * 시각화 옵션 정의
 */
export const VISUALIZATION_OPTIONS = [
  { value: CHART_TYPES.DELIVERY_STATUS, label: '배송 현황' },
  { value: CHART_TYPES.HOURLY_ORDERS, label: '시간별 접수량' },
];

/**
 * 시각화 색상 테마
 */
export const VISUALIZATION_COLORS = {
  // 상태별 파스텔톤 색상
  STATUS: {
    WAITING: '#BAE7FF',
    IN_PROGRESS: '#FFE2B5',
    COMPLETE: '#C5F5E1',
    ISSUE: '#FFD1D1',
    CANCEL: '#D9D9D9',
  },
  // 부서별 색상 테마
  DEPARTMENT: {
    CS: {
      primary: '#1890FF',
      secondary: '#BAE7FF',
      background: '#E6F7FF',
      border: '#91D5FF',
    },
    HES: {
      primary: '#722ED1',
      secondary: '#D3ADF7',
      background: '#F9F0FF',
      border: '#B37FEB',
    },
    LENOVO: {
      primary: '#13C2C2',
      secondary: '#87E8DE',
      background: '#E6FFFB',
      border: '#87E8DE',
    },
  },
  // 시간대 구분 색상
  TIME_PERIODS: {
    NIGHT: {
      label: '야간(19-09)',
      color: '#722ED1',
    },
    DAY: {
      label: '주간(09-19)',
      color: '#1890FF',
    },
  },
};

/**
 * 차트 공통 스타일 테마
 */
export const CHART_THEME = {
  fontFamily: "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
  fontSize: 12,
  colors: ['#1890FF', '#722ED1', '#13C2C2', '#52C41A', '#FAAD14', '#F5222D'],
  paddings: [20, 20, 20, 20],
  background: {
    color: '#fff',
  },
  label: {
    style: {
      fontSize: 12,
      fill: '#666',
    },
  },
  legend: {
    position: 'bottom',
    itemName: {
      style: {
        fontSize: 12,
        fill: '#333',
      },
    },
  },
};

/**
 * 메시지 키 상수
 * 중복 메시지 방지 및 메시지 업데이트를 위한 고유 식별자
 */
export const MessageKeys = {
  AUTH: {
    LOGIN: 'auth-login',
    LOGOUT: 'auth-logout',
    SESSION: 'auth-session',
    PERMISSION: 'auth-permission',
  },
  DASHBOARD: {
    LOAD: 'dashboard-load',
    CREATE: 'dashboard-create',
    UPDATE: 'dashboard-update',
    DELETE: 'dashboard-delete',
    DETAIL: 'dashboard-detail',
    STATUS: 'dashboard-status',
    ASSIGN: 'dashboard-assign',
    MEMO: 'dashboard-memo',
    SEARCH: 'dashboard-search',
    PESSIMISTIC_LOCK: 'dashboard-pessimistic-lock',
    OPTIMISTIC_LOCK: 'dashboard-optimistic-lock',
    LOCK_WARNING: 'dashboard-lock-warning',
    LOCK_EXPIRED: 'dashboard-lock-expired',
  },
  VISUALIZATION: {
    LOAD: 'visualization-load',
  },
  ERROR: {
    NETWORK: 'error-network',
    SERVER: 'error-server',
    UNKNOWN: 'error-unknown',
    TIMEOUT: 'error-timeout',
    NOT_FOUND: 'error-not-found',
    BAD_REQUEST: 'error-bad-request',
  },
  VALIDATION: {
    FIELD_ERROR: 'validation-field-error',
  },
};

/**
 * 메시지 템플릿 상수
 * 일관된 메시지 형식 제공
 */
export const MessageTemplates = {
  DASHBOARD: {
    CREATE_SUCCESS: '대시보드가 생성되었습니다',
    STATUS_SUCCESS: (status) => {
      const statusMap = {
        WAITING: '대기',
        IN_PROGRESS: '진행',
        COMPLETE: '완료',
        ISSUE: '이슈',
        CANCEL: '취소',
      };
      return `${statusMap[status] || status} 상태로 변경되었습니다`;
    },
    DELETE_SUCCESS: '선택한 항목이 삭제되었습니다',
    ASSIGN_SUCCESS: '배차 처리가 완료되었습니다',
    INVALID_POSTAL: '올바른 우편번호 형식이 아닙니다',
    INVALID_PHONE: '올바른 연락처 형식이 아닙니다',
    INVALID_WAITING: (orderNos) =>
      `대기 상태가 아닌 주문이 포함되어 있습니다: ${orderNos}`,
  },
  AUTH: {
    LOGIN_FAILED: '아이디 또는 비밀번호가 잘못되었습니다',
    SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요',
  },
  VALIDATION: {
    CONTACT_FORMAT: '올바른 연락처 형식이 아닙니다',
    POSTAL_FORMAT: '올바른 우편번호 형식이 아닙니다',
    FUTURE_DATE: '미래 날짜는 선택할 수 없습니다',
    REQUIRED_FIELD: (field) => `${field}을(를) 입력해주세요`,
    NUMERIC_ONLY: '숫자만 입력 가능합니다',
  },
};

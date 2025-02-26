// frontend/src/utils/Constants.js

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
  DELIVERY: '#1664C0', // 진한 파랑
  RETURN: '#9C27B0', // 진한 보라
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
    normal: '#F3F6F9',
    hover: '#E3E8EF',
  },
  IN_PROGRESS: {
    normal: '#FFF4DE',
    hover: '#FFE2B5',
  },
  COMPLETE: {
    normal: '#E8FDF3',
    hover: '#C5F5E1',
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

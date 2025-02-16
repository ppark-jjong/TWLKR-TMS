// frontend/src/utils/Constants.js

/**
 * 배송 타입 정의
 */
export const TYPE_TYPES = {
  DELIVERY: 'DELIVERY',
  RETURN: 'RETURN'
};

/**
 * 배송 타입 표시 텍스트
 */
export const TYPE_TEXTS = {
  DELIVERY: '배송',
  RETURN: '회수'
};

/**
 * 배송 상태 정의
 */
export const STATUS_TYPES = {
  WAITING: 'WAITING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
  ISSUE: 'ISSUE'
};

/**
 * 배송 상태 표시 텍스트
 */
export const STATUS_TEXTS = {
  WAITING: '대기',
  IN_PROGRESS: '진행',
  COMPLETE: '완료',
  ISSUE: '이슈'
};

/**
 * 배송 상태별 색상
 */
export const STATUS_COLORS = {
  WAITING: 'default',
  IN_PROGRESS: 'warning',
  COMPLETE: 'success',
  ISSUE: 'error'
};

/**
 * 부서 정의
 */
export const DEPARTMENT_TYPES = {
  CS: 'CS',
  HES: 'HES',
  LENOVO: 'LENOVO'
};

/**
 * 부서 표시 텍스트
 */
export const DEPARTMENT_TEXTS = {
  CS: 'CS',
  HES: 'HES',
  LENOVO: 'LENOVO'
};

/**
 * 창고 위치 정의
 */
export const WAREHOUSE_TYPES = {
  SEOUL: 'SEOUL',
  BUSAN: 'BUSAN',
  GWANGJU: 'GWANGJU',
  DAEJEON: 'DAEJEON'
};

/**
 * 창고 위치 표시 텍스트
 */
export const WAREHOUSE_TEXTS = {
  SEOUL: '서울',
  BUSAN: '부산',
  GWANGJU: '광주',
  DAEJEON: '대전'
};

/**
 * SLA 타입 정의
 */
export const SLA_TYPES = {
  XHR: 'XHR',
  POX: 'POX',
  EMC: 'EMC',
  WEWORK: 'WEWORK',
  LENOVO: 'LENOVO',
  ETC: 'ETC',
  NBD: 'NBD'
};

/**
 * SLA 표시 텍스트
 */
export const SLA_TEXTS = {
  XHR: 'XHR',
  POX: 'POX',
  EMC: 'EMC',
  WEWORK: 'WEWORK',
  LENOVO: 'LENOVO',
  ETC: '기타',
  NBD: 'NBD'
};

/**
 * 차트 타입 정의
 */
export const CHART_TYPES = {
  DELIVERY_STATUS: 'delivery_status',
  HOURLY_ORDERS: 'hourly_orders'
};

/**
 * 시각화 옵션 정의
 */
export const VISUALIZATION_OPTIONS = [
  { value: CHART_TYPES.DELIVERY_STATUS, label: '배송 현황' },
  { value: CHART_TYPES.HOURLY_ORDERS, label: '시간별 접수량' }
];
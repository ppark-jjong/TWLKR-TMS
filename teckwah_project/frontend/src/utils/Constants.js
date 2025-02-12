// frontend/src/utils/Constants.js

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
  export const DEPARTMENTS = {
    CS: 'CS',
    HES: 'HES',
    LENOVO: 'LENOVO'
  };
  
  /**
   * 창고 위치 정의
   */
  export const WAREHOUSES = {
    SEOUL: 'SEOUL',
    BUSAN: 'BUSAN',
    GWANGJU: 'GWANGJU',
    DAEJEON: 'DAEJEON'
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
    ETC: 'ETC'
  };
  
  /**
   * 시각화 타입 정의
   */
  export const VISUALIZATION_TYPES = {
    DELIVERY_STATUS: '배송 현황',
    HOURLY_ORDERS: '시간별 접수량'
  };
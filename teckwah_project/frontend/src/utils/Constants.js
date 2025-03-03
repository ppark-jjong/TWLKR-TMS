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
 * 종류별 색상 정의 (강조색 - 더 눈에 띄게 조정)
 */
export const TYPE_COLORS = {
  DELIVERY: '#0050c8', // 더 진한 파랑
  RETURN: '#7b1fa2', // 더 진한 보라
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
 * 상태별 배경색 정의 (행 전체 색상)
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
    normal: '#f2f2f2',
    hover: '#e0e0e0',
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

// 시각화 페이지 색상 테마 추가 (새로운 코드)
export const VISUALIZATION_COLORS = {
  // 상태별 파스텔톤 색상 (파이 차트 및 카드에 사용)
  STATUS: {
    WAITING: '#BAE7FF', // 파스텔 블루
    IN_PROGRESS: '#FFE2B5', // 파스텔 옐로우/오렌지
    COMPLETE: '#C5F5E1', // 파스텔 그린
    ISSUE: '#FFD1D1', // 파스텔 레드
    CANCEL: '#D9D9D9', // 라이트 그레이
  },
  // 부서별 색상 테마
  DEPARTMENT: {
    CS: {
      primary: '#1890FF', // 메인 색상
      secondary: '#BAE7FF', // 보조 색상
      background: '#E6F7FF', // 배경 색상
      border: '#91D5FF', // 테두리 색상
    },
    HES: {
      primary: '#722ED1', // 메인 색상
      secondary: '#D3ADF7', // 보조 색상
      background: '#F9F0FF', // 배경 색상
      border: '#B37FEB', // 테두리 색상
    },
    LENOVO: {
      primary: '#13C2C2', // 메인 색상
      secondary: '#87E8DE', // 보조 색상
      background: '#E6FFFB', // 배경 색상
      border: '#87E8DE', // 테두리 색상
    },
  },
  // 시간대 구분 색상
  TIME_PERIODS: {
    NIGHT: {
      label: '야간(19-09)',
      color: '#722ED1', // 보라색 (야간 표시)
    },
    DAY: {
      label: '주간(09-19)',
      color: '#1890FF', // 파란색 (주간 표시)
    },
  },
};

// 차트 공통 스타일 테마
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

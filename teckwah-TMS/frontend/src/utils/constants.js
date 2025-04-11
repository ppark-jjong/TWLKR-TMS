/**
 * 시스템 상수 정의
 */

// 상태 옵션
export const STATUS_OPTIONS = [
  { value: 'WAITING', label: '대기', color: '#FFD591' },
  { value: 'IN_PROGRESS', label: '진행', color: '#91CAFF' },
  { value: 'COMPLETE', label: '완료', color: '#B7EB8F' },
  { value: 'ISSUE', label: '이슈', color: '#FFA39E' },
  { value: 'CANCEL', label: '취소', color: '#D9D9D9' },
];

// 부서 옵션
export const DEPARTMENT_OPTIONS = [
  { value: 'CS', label: 'CS' },
  { value: 'HES', label: 'HES' },
  { value: 'LENOVO', label: 'LENOVO' },
];

// 창고 옵션
export const WAREHOUSE_OPTIONS = [
  { value: 'SEOUL', label: '서울' },
  { value: 'BUSAN', label: '부산' },
  { value: 'GWANGJU', label: '광주' },
  { value: 'DAEJEON', label: '대전' },
];

// 배송 유형 옵션
export const TYPE_OPTIONS = [
  { value: 'DELIVERY', label: '배송' },
  { value: 'RETURN', label: '회수' },
];

// SLA 옵션
export const SLA_OPTIONS = [
  { value: '4HR(24X7)', label: '4HR(24X7)' },
  { value: 'NEXT-DAY', label: 'NEXT-DAY' },
  { value: 'STANDARD', label: 'STANDARD' },
];

// 페이지 사이즈 옵션
export const PAGE_SIZE_OPTIONS = [
  { value: 5, label: '5행' },
  { value: 10, label: '10행' },
  { value: 15, label: '15행' },
  { value: 20, label: '20행' },
];

// 상태 전이 규칙
export const STATUS_TRANSITIONS = {
  'WAITING': ['IN_PROGRESS', 'CANCEL'],
  'IN_PROGRESS': ['COMPLETE', 'ISSUE', 'CANCEL'],
  'COMPLETE': ['ISSUE'],
  'ISSUE': ['IN_PROGRESS', 'COMPLETE', 'CANCEL'],
  'CANCEL': []
};

// 시각화 차트 타입 옵션
export const CHART_TYPE_OPTIONS = [
  { value: 'time', label: '시간대별 주문 접수' },
  { value: 'dept-status', label: '부서별 배송 상태 분포' },
];

// 시간대 레이블 (시각화 차트용)
export const TIME_LABELS = {
  '0-9': '00:00-09:00',
  '9': '09:00-10:00',
  '10': '10:00-11:00',
  '11': '11:00-12:00',
  '12': '12:00-13:00',
  '13': '13:00-14:00',
  '14': '14:00-15:00',
  '15': '15:00-16:00',
  '16': '16:00-17:00',
  '17': '17:00-18:00',
  '18-20': '18:00-20:00',
  '20-24': '20:00-24:00',
};

// 상태별 색상 (시각화 차트용)
export const STATUS_COLORS = {
  'WAITING': '#FFD591',
  'IN_PROGRESS': '#91CAFF',
  'COMPLETE': '#B7EB8F',
  'ISSUE': '#FFA39E',
  'CANCEL': '#D9D9D9',
};

// 부서별 색상 (시각화 차트용)
export const DEPARTMENT_COLORS = {
  'CS': '#1890FF',
  'HES': '#52C41A',
  'LENOVO': '#722ED1',
};

// 상태 정보 객체 (라벨, 배경색, 텍스트색상)
export const STATUS_INFO = {
  'WAITING': { label: '대기', bgColor: '#FFFBE6', textColor: '#AD8B00', badgeClass: 'bg-yellow' },
  'IN_PROGRESS': { label: '진행', bgColor: '#E6F7FF', textColor: '#1890FF', badgeClass: 'bg-blue' },
  'COMPLETE': { label: '완료', bgColor: '#F6FFED', textColor: '#52C41A', badgeClass: 'bg-green' },
  'ISSUE': { label: '이슈', bgColor: '#FFF1F0', textColor: '#F5222D', badgeClass: 'bg-red' },
  'CANCEL': { label: '취소', bgColor: '#F5F5F5', textColor: '#595959', badgeClass: 'bg-gray' },
};

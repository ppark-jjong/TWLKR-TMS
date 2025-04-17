/**
 * 애플리케이션 상수 모음
 * 여러 컴포넌트에서 공통으로 사용되는 상수들을 중앙화
 */
import {
  ClockCircleOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  StopOutlined,
} from '@ant-design/icons';

/**
 * 주문 상태 옵션
 */
export const STATUS_OPTIONS = [
  {
    value: 'WAITING',
    label: '대기',
    color: '#fffbe6',
    textColor: '#ad8b00',
    icon: <ClockCircleOutlined />,
    tagColor: 'blue'
  },
  {
    value: 'IN_PROGRESS',
    label: '진행',
    color: '#e6f7ff',
    textColor: '#1890ff',
    icon: <SwapOutlined />,
    tagColor: 'gold'
  },
  {
    value: 'COMPLETE',
    label: '완료',
    color: '#f6ffed',
    textColor: '#52c41a',
    icon: <CheckCircleOutlined />,
    tagColor: 'green'
  },
  {
    value: 'ISSUE',
    label: '이슈',
    color: '#fff1f0',
    textColor: '#f5222d',
    icon: <WarningOutlined />,
    tagColor: 'red'
  },
  {
    value: 'CANCEL',
    label: '취소',
    color: '#f5f5f5',
    textColor: '#595959',
    icon: <StopOutlined />,
    tagColor: 'gray'
  },
];

/**
 * 주문 유형 옵션
 */
export const TYPE_OPTIONS = [
  { 
    value: 'DELIVERY', 
    label: '배송', 
    color: '#f9f0ff', 
    textColor: '#722ed1',
    tagColor: 'cyan'
  },
  { 
    value: 'RETURN', 
    label: '회수', 
    color: '#fff7e6', 
    textColor: '#fa8c16',
    tagColor: 'purple'
  },
];

/**
 * 부서 옵션
 */
export const DEPARTMENT_OPTIONS = [
  { value: 'CS', label: 'CS' },
  { value: 'HES', label: 'HES' },
  { value: 'LENOVO', label: 'LENOVO' },
];

/**
 * 창고 옵션
 */
export const WAREHOUSE_OPTIONS = [
  { value: 'SEOUL', label: '서울' },
  { value: 'BUSAN', label: '부산' },
  { value: 'GWANGJU', label: '광주' },
  { value: 'DAEJEON', label: '대전' },
];

/**
 * 상태별 허용 액션 (권한 기반)
 */
export const STATUS_TRANSITIONS = {
  // 관리자는 모든 상태 변경 가능
  ADMIN: {
    'WAITING': ['IN_PROGRESS', 'COMPLETE', 'ISSUE', 'CANCEL'],
    'IN_PROGRESS': ['WAITING', 'COMPLETE', 'ISSUE', 'CANCEL'],
    'COMPLETE': ['WAITING', 'IN_PROGRESS', 'ISSUE', 'CANCEL'],
    'ISSUE': ['WAITING', 'IN_PROGRESS', 'COMPLETE', 'CANCEL'],
    'CANCEL': ['WAITING', 'IN_PROGRESS', 'COMPLETE', 'ISSUE'],
  },
  // 일반 사용자는 제한된 상태 변경만 가능
  USER: {
    'WAITING': ['IN_PROGRESS'],
    'IN_PROGRESS': ['COMPLETE', 'ISSUE', 'CANCEL'],
    'COMPLETE': [],
    'ISSUE': [],
    'CANCEL': [],
  }
};

/**
 * 상태 변경 액션 버튼 설정
 */
export const STATUS_ACTIONS = {
  'WAITING': [
    {
      key: 'in_progress',
      label: '진행 시작',
      status: 'IN_PROGRESS',
      type: 'primary',
    }
  ],
  'IN_PROGRESS': [
    {
      key: 'complete',
      label: '완료',
      status: 'COMPLETE',
      type: 'primary',
    },
    {
      key: 'issue',
      label: '이슈',
      status: 'ISSUE',
      type: 'danger',
    },
    {
      key: 'cancel',
      label: '취소',
      status: 'CANCEL',
      type: 'default',
    }
  ],
  'ADMIN_SPECIAL': [
    // 관리자용 특수 액션 (필요시 확장)
  ]
};

/**
 * 페이지 크기 옵션
 */
export const PAGE_SIZE_OPTIONS = [
  { value: 5, label: '5행' },
  { value: 10, label: '10행' },
  { value: 15, label: '15행' },
  { value: 20, label: '20행' },
];

/**
 * API 응답 상수
 */
export const API_RESPONSE = {
  SUCCESS: 'success',
  ERROR: 'error',
  ERROR_CODES: {
    NOT_FOUND: 'NOT_FOUND',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_DATA: 'INVALID_DATA',
  }
};

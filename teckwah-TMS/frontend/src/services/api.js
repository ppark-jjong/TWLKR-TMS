/**
 * API 관련 기본 설정
 */
import axios from 'axios';
import { message } from 'antd';

// 로그인 페이지에서의 API 요청 여부를 확인하는 플래그
const isLoginPage = () => {
  return window.location.pathname === '/login';
};

// 에러 메시지 중복 표시 방지를 위한 변수
let errorDisplayed = false;
const showErrorOnce = (errorMsg) => {
  if (!errorDisplayed) {
    errorDisplayed = true;
    message.error(errorMsg, 3, () => {
      errorDisplayed = false;
    });
  }
};

// 기본 응답 데이터 생성 함수 (API 오류 시 기본값 반환)
const createEmptyResponse = (path) => {
  // 경로에 따라 적절한 빈 데이터 반환
  switch (path) {
    case 'dashboard':
      return {
        success: true,
        message: "데이터 조회 성공",
        data: {
          items: [],
          total: 0,
          page: 1,
          limit: 10,
          status_counts: {
            WAITING: 0,
            IN_PROGRESS: 0,
            COMPLETE: 0,
            ISSUE: 0,
            CANCEL: 0
          }
        }
      };
    case 'handover':
      return {
        success: true,
        message: "인수인계 목록 조회 성공",
        data: {
          items: [],
          total: 0,
          page: 1,
          limit: 10
        }
      };
    case 'visualization':
      return {
        success: true,
        message: "시각화 데이터 조회 성공",
        data: {
          date_range: {
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString()
          },
          daily_orders: [],
          status_distribution: [],
          warehouse_distribution: [],
          avg_delivery_time_minutes: 0,
          avg_distance_by_warehouse: []
        }
      };
    case 'users':
      return {
        success: true,
        message: "사용자 목록 조회 성공",
        data: {
          items: [],
          total: 0,
          page: 1,
          limit: 10
        }
      };
    default:
      return {
        success: false,
        message: "데이터 조회 실패",
        data: null
      };
  }
};

// axios 인스턴스 생성
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '', // 환경 변수에서 API URL 가져오기 (없으면 빈 문자열 - 상대 경로)
  timeout: 30000, // 30초 타임아웃
  withCredentials: true, // 쿠키 자동 전송을 위해 필요
});

// 요청 인터셉터 설정
api.interceptors.request.use(
  (config) => {
    // 요청 데이터 camelCase → snake_case 변환 
    if (config.data) {
      config.data = camelToSnake(config.data);
    }
    
    // API 요청 경로 구성
    const apiMapping = {
      '/dashboard': '/dashboard',
      '/handover': '/handover',
      '/visualization': '/visualization',
      '/users': '/users',
      '/auth': '/auth'
    };
    
    // URL 매핑 처리
    for (const [key, value] of Object.entries(apiMapping)) {
      if (config.url.startsWith(key)) {
        config.url = config.url.replace(key, value);
        break;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정
api.interceptors.response.use(
  (response) => {
    // 응답 데이터 snake_case → camelCase 변환
    if (response.data) {
      response.data = snakeToCamel(response.data);
    }
    
    return response;
  },
  (error) => {
    // 요청 경로 추출
    const path = error.config?.url?.split('/')?.[1] || '';
    
    // 401 인증 오류 처리 (리다이렉트 루프 방지)
    if (error.response && error.response.status === 401) {
      // 로그인 페이지에서의 401은 정상 케이스로 처리 (리다이렉트 안함)
      if (!isLoginPage() && !error.config.url.includes('/auth/me')) {
        window.location.href = '/login';
      }
    } 
    // 404, 500 등 서버 오류
    else if (error.response) {
      // 오류 메시지 표시 (중복 방지)
      showErrorOnce(
        error.response.data?.detail || 
        error.response.data?.message || 
        '데이터를 불러오는 중 오류가 발생했습니다'
      );
      
      // 페이지 렌더링을 위해 기본 데이터 반환 (UI 표시 목적)
      const emptyResponse = createEmptyResponse(path);
      return Promise.resolve({ data: emptyResponse });
    } 
    // 네트워크 오류
    else {
      showErrorOnce('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
      
      // 페이지 렌더링을 위해 기본 데이터 반환
      const emptyResponse = createEmptyResponse(path);
      return Promise.resolve({ data: emptyResponse });
    }
    
    return Promise.reject(error);
  }
);

// camelCase → snake_case 변환 함수
function camelToSnake(data) {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data !== 'object') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => camelToSnake(item));
  }
  
  const result = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      // camelCase를 snake_case로 변환
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = camelToSnake(data[key]);
    }
  }
  
  return result;
}

// snake_case → camelCase 변환 함수
function snakeToCamel(data) {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data !== 'object') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => snakeToCamel(item));
  }
  
  const result = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      // snake_case를 camelCase로 변환
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      result[camelKey] = snakeToCamel(data[key]);
    }
  }
  
  return result;
}

export default api;
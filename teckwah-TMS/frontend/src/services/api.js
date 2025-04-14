/**
 * API 관련 기본 설정
 */
import axios from 'axios';

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
    // 401 인증 오류 시 자동 로그아웃 처리
    if (error.response && error.response.status === 401) {
      window.location.href = '/login';
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

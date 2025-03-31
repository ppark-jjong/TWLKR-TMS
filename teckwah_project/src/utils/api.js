// src/utils/api.js
import axios from 'axios';
import { getToken } from './authHelpers';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 추가
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 토큰 만료 처리
    if (error.response && error.response.status === 401) {
      // 로그인 페이지로 리디렉션
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 인증 관련 API 함수들
export const login = async (credentials) => {
  return api.post('/auth/login', credentials);
};

export const logout = async () => {
  return api.post('/auth/logout');
};

export const checkSession = async () => {
  return api.get('/auth/check-session');
};

export default api;

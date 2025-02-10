// src/services/api.js
import axios from 'axios';

const api = axios.create({
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    // tokenStore에서 직접 액세스 토큰 가져오기
    const token = window.tokenStore?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    // HTML 응답이 오면 빈 배열이나 객체 반환
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      return [];
    }
    return response.data;
  },
  (error) => {
    // 401 에러시 로그인 페이지로 리다이렉트
    if (error.response?.status === 401) {
      window.location.href = '/login';
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default api;
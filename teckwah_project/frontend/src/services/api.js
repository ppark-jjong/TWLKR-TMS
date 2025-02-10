// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터 설정
api.interceptors.request.use(
  async (config) => {
    // AuthContext에서 토큰 가져오기
    const auth = window.authContext;  // AuthProvider에서 설정한 전역 context
    const token = auth?.getAccessToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터 설정
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 에러이고 토큰 갱신 시도를 하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const auth = window.authContext;
        const success = await auth?.refreshToken();

        if (success) {
          // 새로운 액세스 토큰으로 재시도
          originalRequest.headers.Authorization = `Bearer ${auth.getAccessToken()}`;
          return api(originalRequest);
        }
        
        // 토큰 갱신 실패 시 로그인 페이지로 리다이렉트
        auth?.logout();
        return Promise.reject(error);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
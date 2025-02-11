// frontend/src/services/mainApi.js

import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 토큰 만료 여부 확인
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const [, payload] = token.split('.');
    const decodedPayload = JSON.parse(atob(payload));
    return decodedPayload.exp * 1000 < Date.now();
  } catch (error) {
    console.error('토큰 검증 실패:', error);
    return true;
  }
};

// 토큰 갱신
const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('리프레시 토큰이 없습니다');
    }
    
    const response = await axios.post(`${BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken
    });
    
    const { access_token } = response.data;
    localStorage.setItem('accessToken', access_token);
    return access_token;
  } catch (error) {
    localStorage.clear();
    window.location.href = '/login';
    throw error;
  }
};

// 요청 인터셉터
api.interceptors.request.use(
  async (config) => {
    const accessToken = localStorage.getItem('accessToken');
    
    if (accessToken) {
      if (isTokenExpired(accessToken)) {
        try {
          const newToken = await refreshAccessToken();
          config.headers.Authorization = `Bearer ${newToken}`;
        } catch (error) {
          return Promise.reject(error);
        }
      } else {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 에러 && 토큰 갱신 시도하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    // 기타 에러 처리
    if (error.response) {
      console.error('API 에러:', error.response.data);
    } else if (error.request) {
      console.error('서버 응답 없음:', error.request);
    } else {
      console.error('요청 설정 에러:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
// frontend/src/utils/AxiosConfig.js
import axios from 'axios';
import { message } from 'antd';
import AuthService from '../services/AuthService';

/**
 * Axios 인터셉터 설정
 * - 요청 시 토큰 자동 포함
 * - 401 에러 시 토큰 갱신 후 재시도
 */
const setupAxiosInterceptors = () => {
  // 요청 인터셉터
  axios.interceptors.request.use(
    (config) => {
      const token = AuthService.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 응답 인터셉터
  axios.interceptors.response.use(
    response => response,
    async error => {
      if (error.response?.status === 401 && !error.config._retry) {
        error.config._retry = true;
        try {
          const refreshToken = localStorage.getItem('refresh_token');
          const response = await axios.post('/auth/refresh', { refresh_token: refreshToken });
          const { access_token, refresh_token } = response.data;
          
          localStorage.setItem('access_token', access_token);
          if (refresh_token) {
            localStorage.setItem('refresh_token', refresh_token);
          }
          
          error.config.headers.Authorization = `Bearer ${access_token}`;
          return axios(error.config);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;
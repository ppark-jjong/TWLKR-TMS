// frontend/src/utils/AxiosConfig.js
import axios from 'axios';
import { message } from 'antd';
import AuthService from '../services/AuthService';

const setupAxiosInterceptors = () => {
  let isRefreshing = false;
  let failedQueue = [];

  const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    failedQueue = [];
  };

  // 요청 인터셉터
  axios.interceptors.request.use(
    config => {
      const token = AuthService.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );

  // 응답 인터셉터
  axios.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      // 401 에러 처리 (토큰 만료)
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          try {
            const token = await new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            });
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axios(originalRequest);
          } catch (err) {
            return Promise.reject(err);
          }
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newTokens = await AuthService.refreshToken();
          const { access_token, refresh_token } = newTokens;
          
          localStorage.setItem('access_token', access_token);
          if (refresh_token) {
            localStorage.setItem('refresh_token', refresh_token);
          }

          axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          processQueue(null, access_token);
          
          return axios(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          AuthService.logout();
          message.error('세션이 만료되었습니다. 다시 로그인해주세요.');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // 그 외 에러 처리
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('요청 처리 중 오류가 발생했습니다');
      }
      
      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;
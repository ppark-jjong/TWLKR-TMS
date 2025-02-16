// frontend/src/utils/AxiosConfig.js
import axios from 'axios';
import { message } from 'antd';
import AuthService from '../services/AuthService';
import ErrorHandler from './ErrorHandler';

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
      const token = localStorage.getItem('access_token');
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

      // 토큰 갱신 시도 중이거나 갱신 요청인 경우 큐에 추가
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
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            throw new Error('리프레시 토큰이 없습니다');
          }

          const response = await AuthService.refreshToken(refreshToken);
          const { access_token, refresh_token } = response;
          
          localStorage.setItem('access_token', access_token);
          if (refresh_token) {
            localStorage.setItem('refresh_token', refresh_token);
          }

          axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          processQueue(null, access_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return axios(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          
          // 세션 만료 메시지는 한 번만 표시
          if (!refreshError.handled) {
            message.error({
              content: '세션이 만료되었습니다. 다시 로그인해주세요.',
              key: 'session-expired'
            });
            refreshError.handled = true;
          }
          
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // ErrorHandler를 통한 에러 처리
      if (!error.handled) {
        ErrorHandler.handle(error);
      }
      
      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;
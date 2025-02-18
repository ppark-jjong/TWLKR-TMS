// frontend/src/utils/AxiosConfig.js
import axios from 'axios';
import { message } from 'antd';
import AuthService from '../services/AuthService';

const setupAxiosInterceptors = () => {
  let isRefreshing = false;
  let failedQueue = [];
  let isShowingLoginMessage = false; // 메시지 중복 표시 방지를 위한 플래그

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

  const handleSessionExpired = () => {
    // 로컬 스토리지 클리어
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    // 중복 메시지 방지
    if (!isShowingLoginMessage) {
      isShowingLoginMessage = true;
      
      // 메시지 표시 후 리다이렉션
      message.warning({
        content: '토큰이 만료되어 재로그인이 필요합니다.',
        duration: 2,
        onClose: () => {
          // 현재 페이지 URL 저장 (로그인 후 복귀를 위해)
          const currentPath = window.location.pathname;
          if (currentPath !== '/login') {
            localStorage.setItem('returnUrl', currentPath);
          }
          // 로그인 페이지로 리다이렉션
          window.location.href = '/login';
          isShowingLoginMessage = false;
        }
      });
    }
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

      // 토큰 갱신이 실패했거나, 리프레시 토큰도 만료된 경우
      if (error.response?.status === 401 && (originalRequest._retry || originalRequest.url.includes('/auth/refresh'))) {
        handleSessionExpired();
        return Promise.reject(error);
      }

      // 액세스 토큰만 만료된 경우 토큰 갱신 시도
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
          handleSessionExpired();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;
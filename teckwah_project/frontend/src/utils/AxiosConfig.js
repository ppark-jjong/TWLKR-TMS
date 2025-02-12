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
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // 토큰 만료로 인한 401 에러 처리
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // 토큰 갱신 시도
          await AuthService.refreshToken();
          
          // 새로운 토큰으로 원래 요청 재시도
          const token = AuthService.getAccessToken();
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axios(originalRequest);
        } catch (refreshError) {
          // 토큰 갱신 실패 시 로그인 페이지로 이동
          message.error('세션이 만료되었습니다. 다시 로그인해주세요.');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      // 기타 에러 처리
      const errorMessage = error.response?.data?.detail || '요청 처리 중 오류가 발생했습니다';
      message.error(errorMessage);
      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;
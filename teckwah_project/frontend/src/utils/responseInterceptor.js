// frontend/src/utils/responseInterceptor.js
import axios from 'axios';
import message from './message';

export const setupResponseInterceptor = () => {
  axios.interceptors.response.use(
    (response) => {
      // success true/false 체크
      if (response.data && !response.data.success) {
        // 서버에서 success: false로 응답한 경우
        message.error(response.data.message || '요청 처리 중 오류가 발생했습니다');
        return Promise.reject(new Error(response.data.message));
      }

      // data 필드가 있는 경우 data 필드만 반환
      if (response.data && response.data.data !== undefined) {
        return response.data.data;
      }

      return response.data;
    },
    (error) => {
      // 에러 응답 처리
      if (error.response?.data) {
        const errorMessage = error.response.data.message || error.response.data.detail || '오류가 발생했습니다';
        message.error(errorMessage);
      } else {
        message.error('네트워크 오류가 발생했습니다');
      }
      return Promise.reject(error);
    }
  );
};

export const setupRequestInterceptor = () => {
  axios.interceptors.request.use(
    (config) => {
      // 요청 전 처리
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};
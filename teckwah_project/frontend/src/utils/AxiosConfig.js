// frontend/src/utils/AxiosConfig.js
import axios from 'axios';
import message from './message';

const setupAxiosInterceptors = () => {
  // 요청 인터셉터
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // 응답 인터셉터
  axios.interceptors.response.use(
    (response) => {
      // 성공 응답 처리
      if (response.data) {
        return response;
      }
      return Promise.reject(new Error('Empty response data'));
    },
    (error) => {
      // 에러 응답 처리
      if (error.response) {
        // 서버에서 에러 응답이 온 경우
        const errorMessage =
          error.response.data.detail ||
          error.response.data.message ||
          '오류가 발생했습니다';
        console.error('API Error:', error.response.data);
        return Promise.reject(error);
      } else if (error.request) {
        // 요청은 보냈지만 응답을 받지 못한 경우
        console.error('Network Error:', error);
        message.error('네트워크 연결을 확인해주세요');
        return Promise.reject(error);
      } else {
        // 요청 설정 중 에러가 발생한 경우
        console.error('Request Error:', error);
        return Promise.reject(error);
      }
    }
  );
};

export default setupAxiosInterceptors;

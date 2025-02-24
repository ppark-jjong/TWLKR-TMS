// frontend/src/utils/AxiosConfig.js
import axios from 'axios';
import message from './message';
import { MessageTemplates } from './message';
import AuthService from '../services/AuthService';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const setupAxiosInterceptors = () => {
  // axios 기본 설정
  axios.defaults.withCredentials = true; // 모든 요청에 쿠키 포함

  // 요청 인터셉터
  axios.interceptors.request.use(
    (config) => {
      return config;
    },
    (error) => Promise.reject(error)
  );

  // 응답 인터셉터
  axios.interceptors.response.use(
    (response) => {
      if (response.data) {
        return response;
      }
      return Promise.reject(new Error('Empty response data'));
    },
    async (error) => {
      const originalRequest = error.config;

      if (error.response) {
        const { status, data } = error.response;

        // 토큰 만료
        if (status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            }).then(() => axios(originalRequest));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            await AuthService.refreshToken();
            processQueue(null);
            return axios(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            message.error('세션이 만료되었습니다. 다시 로그인해주세요');
            AuthService.clearAuthData();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        // 권한 없음
        if (status === 403) {
          message.error('접근 권한이 없습니다');
          return Promise.reject(new Error('접근 권한이 없습니다'));
        }

        // 요청한 리소스 없음
        if (status === 404) {
          message.error('요청한 데이터를 찾을 수 없습니다');
          return Promise.reject(new Error('요청한 데이터를 찾을 수 없습니다'));
        }

        // 서버 에러
        if (status >= 500) {
          message.error(MessageTemplates.ERROR.SERVER);
          return Promise.reject(new Error('서버 오류가 발생했습니다'));
        }

        // 유효성 검사 에러
        if (status === 422 && Array.isArray(data.detail)) {
          const errorMessage = data.detail.map((err) => err.msg).join('\n');
          message.error(errorMessage);
          return Promise.reject(new Error(errorMessage));
        }

        // 기타 에러 응답
        const errorMessage = data?.detail || '오류가 발생했습니다';
        message.error(errorMessage);
        return Promise.reject(error);
      }

      // 네트워크 에러
      if (error.request) {
        message.error(MessageTemplates.ERROR.NETWORK);
        return Promise.reject(new Error('네트워크 연결을 확인해주세요'));
      }

      // 기타 에러
      message.error('오류가 발생했습니다');
      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;

// frontend/src/utils/AxiosConfig.js
import axios from 'axios';
import { message } from './message';
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

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

const setupAxiosInterceptors = () => {
  // 요청 인터셉터
  axiosInstance.interceptors.request.use(
    (config) => {
      // 요청 전 처리
      return config;
    },
    (error) => {
      message.error('요청 중 오류가 발생했습니다.'); // 에러 메시지 처리
      return Promise.reject(error);
    }
  );

  // 응답 인터셉터
  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response) {
        message.error(
          error.response.data.detail || '서버 오류가 발생했습니다.'
        ); // 에러 메시지 처리
      } else {
        message.error('네트워크 오류가 발생했습니다.'); // 네트워크 오류 처리
      }
      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;

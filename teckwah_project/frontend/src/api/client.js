// frontend/src/api/client.js
import axios from 'axios';
import { message } from 'antd';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  timeout: 10000, // 10초
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    // 토큰이 있으면 헤더에 추가
    const token = localStorage.getItem('accessToken');
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
api.interceptors.response.use(
  (response) => {
    // 표준 응답 구조 확인 및 변환
    if (response.data && typeof response.data === 'object') {
      // success 필드가 있는 경우 그대로 반환
      if ('success' in response.data) {
        return response;
      }
      // 표준 구조 아닌 경우 변환
      response.data = {
        success: true,
        message: '데이터를 조회했습니다',
        data: response.data,
      };
    }
    return response;
  },
  async (error) => {
    // 에러 응답 처리
    const { response } = error;

    // 네트워크 오류
    if (!response) {
      message.error('서버와 통신할 수 없습니다.');
      return Promise.reject(error);
    }

    // HTTP 상태 코드별 처리
    switch (response.status) {
      case 401:
        // 토큰 만료 처리
        try {
          // 로컬 스토리지에서 리프레시 토큰 가져오기
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            // 리프레시 토큰이 없으면 로그인 페이지로 이동
            window.location.href = '/login';
            return Promise.reject(error);
          }

          // 리프레시 토큰으로 새 토큰 발급 요청
          const { data } = await axios.post(
            `${process.env.REACT_APP_API_URL || ''}/auth/refresh`,
            { refresh_token: refreshToken }
          );

          // 새 토큰 저장
          if (data.success) {
            localStorage.setItem('accessToken', data.data.token.access_token);
            localStorage.setItem('refreshToken', data.data.token.refresh_token);

            // 원래 요청 재시도
            error.config.headers.Authorization = `Bearer ${data.data.token.access_token}`;
            return axios(error.config);
          } else {
            // 리프레시 실패
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        } catch (refreshError) {
          // 갱신 실패 처리
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
        break;
      case 403:
        message.error('권한이 없습니다.');
        break;
      case 404:
        message.error('요청한 리소스를 찾을 수 없습니다.');
        break;
      case 423:
        // 비관적 락 충돌 처리
        const lockInfo = response.data?.error?.detail || {};
        message.warning(
          `현재 ${lockInfo.locked_by || '다른 사용자'}님이 편집 중입니다.`
        );
        break;
      case 500:
        message.error('서버 내부 오류가 발생했습니다.');
        break;
      default:
        // 기타 에러 처리
        const errorMsg =
          response.data?.message || '요청 처리 중 오류가 발생했습니다.';
        message.error(errorMsg);
    }

    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';
import { getToken } from '../utils/auth';

// API 기본 URL 설정
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * axios 인스턴스 생성
 */
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000, // 20초 타임아웃 설정
  withCredentials: true, // 쿠키 전송을 위해 필요 (리프레시 토큰)
});

// 요청 인터셉터 설정
apiClient.interceptors.request.use(
  (config) => {
    // 요청 헤더에 인증 토큰 추가
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정
apiClient.interceptors.response.use(
  (response) => {
    // 성공 응답 처리
    return response.data;
  },
  async (error) => {  // async 추가
    // 에러 응답 처리
    const { response } = error;

    // 서버 응답이 없는 경우 (네트워크 오류 등)
    if (!response) {
      console.error('서버에 연결할 수 없습니다.');
      return Promise.reject({
        success: false,
        message: '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.',
        error_code: 'NETWORK_ERROR',
      });
    }

    // 인증 오류인 경우 (401)
    if (response.status === 401) {
      // 리프레시 토큰이 있는 경우 토큰 갱신 시도
      try {
        const refreshResult = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
          withCredentials: true // 쿠키 전송을 위해 필요
        });
        
        if (refreshResult.data.success && refreshResult.data.data.access_token) {
          // 토큰 갱신 성공 시 기존 요청 다시 시도
          const newToken = refreshResult.data.data.access_token;
          localStorage.setItem('teckwah_tms_token', newToken);
          
          // 원래 요청의 헤더에 새 토큰 설정
          const originalRequest = error.config;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // 원래 요청 다시 시도
          return axios(originalRequest).then(response => response.data);
        }
      } catch (refreshError) {
        // 토큰 갱신 실패 시 로그아웃
        localStorage.removeItem('teckwah_tms_token');
        localStorage.removeItem('teckwah_tms_user');
        window.location.href = '/login';
      }
      
      // 저장된 에러 응답 데이터가 있으면 해당 형식으로 반환
      if (response.data) {
        return Promise.reject(response.data);
      }

      // 기본 형식으로 반환
      return Promise.reject({
        success: false,
        message: '인증이 필요합니다. 다시 로그인해주세요.',
        error_code: 'UNAUTHORIZED',
      });
    }

    // 서버에서 반환한 에러 데이터가 있는 경우
    if (response.data) {
      return Promise.reject(response.data);
    }

    // HTTP 상태 코드별 적절한 오류 메시지 제공
    let errorMessage = '요청 처리 중 오류가 발생했습니다.';
    let errorCode = 'UNKNOWN_ERROR';
    
    switch (response.status) {
      case 400:
        errorMessage = '잘못된 요청입니다.';
        errorCode = 'BAD_REQUEST';
        break;
      case 403:
        errorMessage = '접근 권한이 없습니다.';
        errorCode = 'FORBIDDEN';
        break;
      case 404:
        errorMessage = '요청한 리소스를 찾을 수 없습니다.';
        errorCode = 'NOT_FOUND';
        break;
      case 500:
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        errorCode = 'SERVER_ERROR';
        break;
      case 503:
        errorMessage = '서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
        errorCode = 'SERVICE_UNAVAILABLE';
        break;
    }
    
    // 그 외 오류
    return Promise.reject({
      success: false,
      message: errorMessage,
      error_code: errorCode,
    });
  }
);

export default apiClient;

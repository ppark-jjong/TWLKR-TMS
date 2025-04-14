import axios from 'axios';
import { logout } from '../utils/Auth';

/**
 * snake_case를 camelCase로 변환하는 함수
 * @param {Object} data - 변환할 객체
 * @returns {Object} - 변환된 객체
 */
const snakeToCamel = (data) => {
  if (typeof data !== 'object' || data === null) return data;

  if (Array.isArray(data)) {
    return data.map((item) => snakeToCamel(item));
  }

  return Object.keys(data).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, p1) => p1.toUpperCase());
    acc[camelKey] =
      typeof data[key] === 'object' && data[key] !== null
        ? snakeToCamel(data[key])
        : data[key];
    return acc;
  }, {});
};

/**
 * camelCase를 snake_case로 변환하는 함수
 * @param {Object} data - 변환할 객체
 * @returns {Object} - 변환된 객체
 */
const camelToSnake = (data) => {
  if (typeof data !== 'object' || data === null) return data;

  if (Array.isArray(data)) {
    return data.map((item) => camelToSnake(item));
  }

  return Object.keys(data).reduce((acc, key) => {
    const snakeKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`
    );
    acc[snakeKey] =
      typeof data[key] === 'object' && data[key] !== null
        ? camelToSnake(data[key])
        : data[key];
    return acc;
  }, {});
};

/**
 * axios 인스턴스 생성 - 세션 기반 인증을 위한 설정
 * 단순성과 YAGNI 원칙에 따라 필요한 기능만 구현
 */
const apiClient = axios.create({
<<<<<<< HEAD
  baseURL: process.env.REACT_APP_API_URL || '',  // .env 파일에서 환경변수 사용
=======
  // 상대 경로 사용 (package.json의 proxy 설정 활용)
  baseURL: '',
>>>>>>> main
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 10000, // 10초 타임아웃 설정
  withCredentials: true, // 세션 쿠키 전송을 위해 필수
});

// axios 전역 설정 - 쿠키 처리 강화
axios.defaults.withCredentials = true;

// 브라우저 쿠키 디버깅
console.log('현재 쿠키:', document.cookie);

// 요청 인터셉터 - camelCase를 snake_case로 변환
apiClient.interceptors.request.use(
  (config) => {
    // 요청별 withCredentials 설정 강제
    config.withCredentials = true;

    // 디버깅용 헤더 추가
    config.headers = {
      ...config.headers,
      'Cache-Control': 'no-cache',
    };

    // 요청 데이터가 있는 경우 snake_case로 변환
    if (config.data) {
      config.data = camelToSnake(config.data);
    }

    // params가 있는 경우 snake_case로 변환
    if (config.params) {
      config.params = camelToSnake(config.params);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - snake_case를 camelCase로 변환
apiClient.interceptors.response.use(
  (response) => {
    // 응답 데이터가 있는 경우 camelCase로 변환
    if (response.data) {
      // success, message, error_code는 그대로 유지
      const { success, message, error_code } = response.data;

      // data 필드만 camelCase로 변환
      const transformedData = response.data.data
        ? snakeToCamel(response.data.data)
        : undefined;

      return {
        success,
        message,
        data: transformedData,
        error_code,
      };
    }

    return response.data;
  },
  (error) => {
    console.log('API 응답 오류:', error);

    // 401 Unauthorized 에러 (인증 실패) 처리
    if (error.response && error.response.status === 401) {
      console.log('인증 실패 - 로그인 페이지로 리다이렉션');

      // 세션 정보 초기화
      localStorage.removeItem('userInfo');
      localStorage.removeItem('accessToken');

      // 로그인 페이지로 즉시 리다이렉션
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 서버에서 반환한 에러 데이터가 있는 경우
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data);
    }

    // HTTP 상태 코드별 적절한 오류 메시지 제공 (단순화)
    const errorMessages = {
      400: { message: '잘못된 요청입니다.', code: 'BAD_REQUEST' },
      403: { message: '접근 권한이 없습니다.', code: 'FORBIDDEN' },
      404: { message: '요청한 리소스를 찾을 수 없습니다.', code: 'NOT_FOUND' },
      500: {
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: 'SERVER_ERROR',
      },
      503: {
        message:
          '서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
        code: 'SERVICE_UNAVAILABLE',
      },
    };

    const defaultError = {
      message: '요청 처리 중 오류가 발생했습니다.',
      code: 'UNKNOWN_ERROR',
    };

    const { message, code } =
      errorMessages[error.response.status] || defaultError;

    // 오류 객체 반환
    return Promise.reject({
      success: false,
      message,
      error_code: code,
    });
  }
);

export default apiClient;

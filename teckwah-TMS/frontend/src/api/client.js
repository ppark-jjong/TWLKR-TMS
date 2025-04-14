import axios from "axios";
import { logout } from "../utils/Auth";

/**
 * snake_case를 camelCase로 변환하는 함수
 * @param {Object} data - 변환할 객체
 * @returns {Object} - 변환된 객체
 */
const snakeToCamel = (data) => {
  if (typeof data !== 'object' || data === null) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => snakeToCamel(item));
  }
  
  return Object.keys(data).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, p1) => p1.toUpperCase());
    acc[camelKey] = typeof data[key] === 'object' && data[key] !== null 
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
    return data.map(item => camelToSnake(item));
  }
  
  return Object.keys(data).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    acc[snakeKey] = typeof data[key] === 'object' && data[key] !== null 
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
  baseURL: window.ENV?.API_URL || '',  // 런타임 환경 설정 또는 상대 경로
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10초 타임아웃 설정
  withCredentials: true, // 세션 쿠키 전송을 위해 필수
});

// 요청 인터셉터 - camelCase를 snake_case로 변환
apiClient.interceptors.request.use(
  (config) => {
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
        error_code
      };
    }
    
    return response.data;
  },
  (error) => {
    // 에러 응답 처리
    const { response } = error;

    // 서버 응답이 없는 경우 (네트워크 오류 등)
    if (!response) {
      console.error("서버에 연결할 수 없습니다.");
      return Promise.reject({
        success: false,
        message: "서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.",
        error_code: "NETWORK_ERROR",
      });
    }

    // 인증 오류인 경우 (401) - 로그인 페이지로 리다이렉트
    if (response.status === 401) {
      // 로컬 스토리지 데이터 삭제
      logout();
      
      // 현재 경로가 로그인 페이지가 아닌 경우만 리다이렉트
      if (!window.location.pathname.includes('/login')) {
        window.location.href = "/login";
      }
      
      // 명확한 오류 메시지 반환
      return Promise.reject({
        success: false,
        message: "인증이 필요합니다. 다시 로그인해주세요.",
        error_code: "UNAUTHORIZED",
      });
    }

    // 서버에서 반환한 에러 데이터가 있는 경우
    if (response.data) {
      return Promise.reject(response.data);
    }

    // HTTP 상태 코드별 적절한 오류 메시지 제공 (단순화)
    const errorMessages = {
      400: { message: "잘못된 요청입니다.", code: "BAD_REQUEST" },
      403: { message: "접근 권한이 없습니다.", code: "FORBIDDEN" },
      404: { message: "요청한 리소스를 찾을 수 없습니다.", code: "NOT_FOUND" },
      500: { message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", code: "SERVER_ERROR" },
      503: { message: "서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.", code: "SERVICE_UNAVAILABLE" }
    };

    const defaultError = { 
      message: "요청 처리 중 오류가 발생했습니다.", 
      code: "UNKNOWN_ERROR" 
    };

    const { message, code } = errorMessages[response.status] || defaultError;

    // 오류 객체 반환
    return Promise.reject({
      success: false,
      message,
      error_code: code,
    });
  }
);

export default apiClient;
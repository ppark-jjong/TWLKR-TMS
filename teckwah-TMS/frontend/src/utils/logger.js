/**
 * 간결한 로깅 유틸리티
 */

// 개발 환경에서만 상세 로그 출력
const isDev = process.env.NODE_ENV !== 'production';

// 간단한 로깅 유틸리티
const logger = {
  // API 관련 로그
  api: (method, url) => {
    if (isDev) {
      console.log(`[API] ${method} ${url}`);
    }
  },
  
  // 응답 로그
  response: (url, success) => {
    if (isDev) {
      console.log(`[API] 응답: ${url} - ${success ? '성공' : '실패'}`);
    }
  },
  
  // 서비스 로그
  service: (service, method) => {
    if (isDev) {
      console.log(`[SVC] ${service}.${method}() 호출`);
    }
  },
  
  // 데이터 관련 로그
  data: (message) => {
    if (isDev) {
      console.log(`[DATA] ${message}`);
    }
  },
  
  // 일반 로그
  info: (message) => {
    console.log(message);
  },
  
  // 경고 로그
  warn: (message) => {
    console.warn(message);
  },
  
  // 오류 로그
  error: (message, error) => {
    if (error) {
      console.error(`${message}:`, error);
    } else {
      console.error(message);
    }
  }
};

export default logger;

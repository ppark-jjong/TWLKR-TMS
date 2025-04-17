/**
 * 간소화된 로깅 유틸리티
 * 핵심 실행 포인트에서만 로그를 남기도록 수정
 */

// 프로덕션 환경 여부 확인
const isProduction = process.env.NODE_ENV === 'production';

// 간소화된 로깅 유틸리티
const logger = {
  // API 호출 로그 - 핵심 실행 포인트만 기록
  api: (method, url) => {
    // 프로덕션 환경에서도 중요 API 호출은 로깅
    if (url.includes('/auth/login') || url.includes('/auth/logout')) {
      console.log(`[API] ${method} ${url}`);
    } else if (!isProduction) {
      // 개발 환경에서는 기본 API 호출도 로깅 (파라미터 제외)
      console.log(`[API] ${method} ${url}`);
    }
  },
  
  // API 응답 로그 - 핵심 실행 포인트만 기록
  response: (url, success) => {
    // 프로덕션 환경에서는 중요 API 응답이나 실패한 응답만 로깅
    if (url.includes('/auth/') || !success) {
      console.log(`[API] 응답: ${url} - ${success ? '성공' : '실패'}`);
    } else if (!isProduction) {
      // 개발 환경에서는 모든 API 응답 상태 로깅
      console.log(`[API] 응답: ${url} - ${success ? '성공' : '실패'}`);
    }
  },
  
  // 서비스 호출 로그 - 핵심 실행 포인트만 기록
  service: (service, method) => {
    // 프로덕션 환경에서는 인증 관련 서비스만 로깅
    if (service === 'AuthService') {
      console.log(`[SVC] ${service}.${method}() 호출`);
    } else if (!isProduction) {
      // 개발 환경에서는 주요 서비스 호출 로깅
      console.log(`[SVC] ${service}.${method}() 호출`);
    }
  },
  
  // 중요 데이터 검증 로그 - 필수 실행 포인트만 기록
  data: (message) => {
    // 데이터 검증 관련 중요 로그만 유지
    if (message.includes('타입 검증') || message.includes('데이터 변환')) {
      console.log(`[DATA] ${message}`);
    }
  },
  
  // 디버그 로그 - 프로덕션에서는 사용하지 않음
  debug: () => {},
  
  // 일반 로그 - 중요 정보만 기록
  info: (message) => {
    // 핵심 실행 포인트에 관련된 정보만 기록
    if (message.includes('인증') || message.includes('시작') || message.includes('완료')) {
      console.log(message);
    }
  },
  
  // 경고 로그 - 실제 문제가 있는 경우만 기록
  warn: (message) => {
    console.warn(message);
  },
  
  // 오류 로그 - 항상 기록
  error: (message, error) => {
    if (error) {
      console.error(`${message}:`, error);
    } else {
      console.error(message);
    }
  }
};

export default logger;

/**
 * API 관련 기본 설정 및 인터셉터
 */
import axios from 'axios';
import { message } from 'antd';

// 로그인 페이지 확인 함수
const isLoginPage = () => {
  return window.location.pathname === '/login';
};

// 에러 메시지 중복 표시 방지
let errorDisplayed = false;
const showErrorOnce = (errorMsg, duration = 3) => {
  if (!errorDisplayed) {
    errorDisplayed = true;
    message.error({
      content: errorMsg,
      duration: duration,
      onClose: () => {
        errorDisplayed = false;
      }
    });
  }
};

// 성공 메시지 표시 함수
const showSuccess = (successMsg) => {
  message.success(successMsg);
};

// 기본 응답 데이터 생성 함수 (API 오류 시 기본값 반환)
const createEmptyResponse = (path) => {
  // 경로에 따라 적절한 빈 데이터 반환
  switch (path) {
    case 'dashboard':
      return {
        success: true,
        message: "데이터 조회 성공",
        data: {
          items: [],
          total: 0,
          page: 1,
          limit: 10,
          status_counts: {
            WAITING: 0,
            IN_PROGRESS: 0,
            COMPLETE: 0,
            ISSUE: 0,
            CANCEL: 0
          }
        }
      };
    case 'handover':
      return {
        success: true,
        message: "인수인계 목록 조회 성공",
        data: {
          items: [],
          total: 0,
          page: 1,
          limit: 10
        }
      };
    case 'visualization':
      return {
        success: true,
        message: "시각화 데이터 조회 성공",
        data: {
          departments: [],
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString(),
          visualization_type: "time_based"
        }
      };
    case 'users':
      return {
        success: true,
        message: "사용자 목록 조회 성공",
        data: {
          items: [],
          total: 0,
          page: 1,
          limit: 10
        }
      };
    case 'postal-codes':
      return {
        success: true,
        message: "우편번호 정보 조회 성공",
        data: null
      };
    default:
      return {
        success: false,
        message: "데이터 조회 실패",
        data: null
      };
  }
};

// 디버그 모드 설정
const DEBUG = true;

// 백엔드 기본 URL 설정 (비어있으면 동일 호스트 사용)
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30초 타임아웃
  withCredentials: true, // 쿠키 자동 전송
});

// API 호출 통계
const apiStats = {
  success: 0,
  error: 0,
  lastCall: null,
  lastError: null,
  calls: {}
};

// 요청 인터셉터 설정
api.interceptors.request.use(
  (config) => {
    // 요청 ID 생성
    const requestId = Math.random().toString(36).substring(2, 10);
    config.headers['X-Request-ID'] = requestId;
    
    // 요청 시작 시간 기록
    config.metadata = { startTime: new Date().getTime(), requestId };
    
    // URL 경로 그대로 사용 (백엔드와 이미 동일하게 설정됨)
    // 이제 URL 매핑이 필요 없습니다. 프론트엔드의 /dashboard는 백엔드의 /dashboard와 일치
    
    // 디버그 로그
    if (DEBUG) {
      console.log(`API 요청: ${config.method.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
        requestId
      });
    }
    
    // API 통계 업데이트
    apiStats.lastCall = new Date();
    const endpoint = config.url.split('?')[0]; // 쿼리 파라미터 제외
    if (!apiStats.calls[endpoint]) {
      apiStats.calls[endpoint] = { count: 0, success: 0, error: 0 };
    }
    apiStats.calls[endpoint].count++;
    
    return config;
  },
  (error) => {
    console.error('API 요청 준비 중 오류:', error);
    showErrorOnce('요청 준비 중 오류가 발생했습니다.');
    
    // API 통계 업데이트
    apiStats.error++;
    apiStats.lastError = {
      time: new Date(),
      message: error.message,
      type: 'request-setup'
    };
    
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정
api.interceptors.response.use(
  (response) => {
    // 응답 시간 계산
    const endTime = new Date().getTime();
    const requestTime = endTime - response.config.metadata.startTime;
    
    // 디버그 로그
    if (DEBUG) {
      console.log(
        `API 응답 (${requestTime}ms): ${response.config.method.toUpperCase()} ${response.config.url}`, 
        response.data
      );
    }
    
    // API 통계 업데이트
    apiStats.success++;
    const endpoint = response.config.url.split('?')[0];
    if (apiStats.calls[endpoint]) {
      apiStats.calls[endpoint].success++;
    }
    
    // 응답이 성공적으로 왔지만 success가 false인 경우 사용자에게 알림
    if (response.data && response.data.success === false) {
      console.warn('API 응답 success=false:', response.data);
      showErrorOnce(response.data.message || '요청이 처리되었지만 오류가 발생했습니다.');
    }
    
    return response;
  },
  (error) => {
    // 디버그 로그
    console.error('API 오류:', error);
    
    // 요청 정보 추출
    const requestMethod = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const requestUrl = error.config?.url || 'UNKNOWN';
    const requestId = error.config?.metadata?.requestId || 'UNKNOWN';
    const path = requestUrl.split('/')[1] || '';
    
    // API 통계 업데이트
    apiStats.error++;
    apiStats.lastError = {
      time: new Date(),
      message: error.message,
      url: requestUrl,
      status: error.response?.status,
      type: 'response'
    };
    
    const endpoint = requestUrl.split('?')[0];
    if (apiStats.calls[endpoint]) {
      apiStats.calls[endpoint].error++;
    }
    
    // 401 인증 오류 처리 (리다이렉트 루프 방지)
    if (error.response && error.response.status === 401) {
      // 로그인 페이지에서의 401은 정상 케이스로 처리 (리다이렉트 안함)
      if (!isLoginPage() && !requestUrl.includes('/auth/me')) {
        showErrorOnce('세션이 만료되었습니다. 다시 로그인해주세요.');
        
        // 약간의 지연 후 리다이렉션 (알림 표시를 위해)
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
      
      return Promise.reject(error);
    } 
    // 403 - 권한 부족
    else if (error.response && error.response.status === 403) {
      showErrorOnce('이 작업을 수행할 권한이 없습니다.');
      return Promise.reject(error);
    }
    // 404 - 리소스 없음
    else if (error.response && error.response.status === 404) {
      const errorMessage = error.response.data?.detail || 
                           error.response.data?.message || 
                           '요청한 정보를 찾을 수 없습니다.';
      
      showErrorOnce(errorMessage);
      
      // 페이지 렌더링을 위해 기본 데이터 반환 (UI 표시 목적)
      const emptyResponse = createEmptyResponse(path);
      return Promise.resolve({ data: emptyResponse });
    }
    // 422 - 검증 오류
    else if (error.response && error.response.status === 422) {
      // 검증 오류 메시지 표시
      const errorDetail = error.response.data?.detail || '입력 데이터가 유효하지 않습니다.';
      showErrorOnce(errorDetail);
      
      // 검증 오류는 거부하여 폼에서 적절히 처리하도록 함
      return Promise.reject(error);
    }
    // 500 등 서버 오류
    else if (error.response) {
      // 오류 메시지 표시 (중복 방지)
      const errorMessage = error.response.data?.detail || 
                          error.response.data?.message || 
                          `서버 오류가 발생했습니다. (${error.response.status})`;
      
      showErrorOnce(errorMessage);
      
      // 페이지 렌더링을 위해 기본 데이터 반환 (UI 표시 목적)
      const emptyResponse = createEmptyResponse(path);
      return Promise.resolve({ data: emptyResponse });
    } 
    // 네트워크 오류
    else {
      showErrorOnce('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
      
      // 페이지 렌더링을 위해 기본 데이터 반환
      const emptyResponse = createEmptyResponse(path);
      return Promise.resolve({ data: emptyResponse });
    }
  }
);

// API 상태 확인 함수 (디버깅용)
api.getStats = () => apiStats;

// API 상태 초기화 함수 (디버깅용)
api.resetStats = () => {
  apiStats.success = 0;
  apiStats.error = 0;
  apiStats.lastCall = null;
  apiStats.lastError = null;
  apiStats.calls = {};
  return { message: 'API 통계가 초기화되었습니다.' };
};

export { showErrorOnce, showSuccess };
export default api;
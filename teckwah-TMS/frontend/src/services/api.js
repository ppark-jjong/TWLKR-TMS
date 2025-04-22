/**
 * API 관련 기본 설정 및 인터셉터
 * - 표준화된 오류 처리
 * - 로깅 패턴 통일화
 */
import axios from 'axios';
import { message } from 'antd';
import logger from '../utils/logger';

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
      },
    });
  }
};

// 성공 메시지 표시 함수
const showSuccess = (successMsg) => {
  message.success(successMsg);
};

// 백엔드에서 이미 Pydantic alias를 통해 camelCase로 변환되어 오므로 별도 변환 불필요

// 기본 응답 데이터 생성 함수 (API 오류 시 기본값 반환 - camelCase 사용)
const createEmptyResponse = (path) => {
  switch (path) {
    case 'dashboard':
      return {
        success: true,
        message: '데이터 조회 성공 (기본값)',
        data: {
          items: [],
          total: 0,
          page: 1,
          limit: 10,
          statusCounts: {
            // camelCase
            WAITING: 0,
            IN_PROGRESS: 0,
            COMPLETE: 0,
            ISSUE: 0,
            CANCEL: 0,
          },
          filter: {
            // camelCase
            startDate: null,
            endDate: null,
          },
        },
      };
    case 'handover':
      return {
        success: true,
        message: '인수인계 목록 조회 성공 (기본값)',
        data: {
          items: [],
          total: 0,
          page: 1,
          limit: 10,
          notices: [], // camelCase (HandoverListResponseData 모델 기준)
        },
      };
    case 'visualization':
      return {
        success: true,
        message: '시각화 데이터 조회 성공 (기본값)',
        data: {
          visualizationType: 'department_based', // camelCase
          startDate: null,
          endDate: null,
          timeStats: [], // camelCase
          departmentStats: [], // camelCase
        },
      };
    case 'users':
      return {
        success: true,
        message: '사용자 목록 조회 성공 (기본값)',
        data: {
          items: [],
          total: 0,
          page: 1,
          limit: 10,
        },
      };
    default:
      return {
        success: false,
        message: '데이터 조회 실패',
        data: null,
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

// 디버그 모드 설정에 따라 로깅 활성화/비활성화

/**
 * 변수명 자동 변환 로직 제거
 * Pydantic의 alias 기능을 사용하도록 변경되어 더 이상 필요하지 않음
 */

// 요청 인터셉터 설정
api.interceptors.request.use(
  (config) => {
    // 요청 ID 생성
    const requestId = Math.random().toString(36).substring(2, 10);
    config.headers['X-Request-ID'] = requestId;

    // 요청 시작 시간 기록
    config.metadata = { startTime: new Date().getTime(), requestId };

    // URL 경로 그대로 사용
    const method = config.method.toUpperCase();
    const url = config.url;

    // Pydantic alias 기능을 사용하므로 변환 로직 불필요
    // 클라이언트는 camelCase 형식 그대로 사용

    // 통합 로거를 사용한 로깅
    logger.api(method, url, {
      requestId,
      params: config.params,
      hasData: !!config.data,
    });

    return config;
  },
  (error) => {
    logger.error('API 요청 준비 중 오류 발생', error);
    showErrorOnce('요청 준비 중 오류가 발생했습니다.');

    // 오류 로깅 (통계 제거)

    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정
api.interceptors.response.use(
  (response) => {
    // 응답 시간 계산
    const endTime = new Date().getTime();
    const requestTime = endTime - response.config.metadata.startTime;

    // 요청 정보
    const method = response.config.method.toUpperCase();
    const url = response.config.url;

    // 백엔드 응답은 이미 Pydantic alias를 통해 camelCase로 변환되어 옴

    // 간소화된 로깅
    logger.response(url, true);

    // 응답이 성공적으로 왔지만 success가 false인 경우 사용자에게 알림
    if (response.data && response.data.success === false) {
      logger.warn(`API 로직 실패: ${response.data.message || ''}`);
      showErrorOnce(
        response.data.message || '요청이 처리되었지만 오류가 발생했습니다.'
      );
    }

    return response;
  },
  (error) => {
    // 요청 정보 추출
    const requestUrl = error.config?.url || 'UNKNOWN';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';

    // 간소화된 로깅
    logger.error(`API 오류: ${method} ${requestUrl}`, error);

    // 401 인증 오류 처리 (리다이렉트 루프 방지) - 개선된 버전
    if (error.response && error.response.status === 401) {
      // 로그인 페이지나 /auth/me 엔드포인트에서의 401은 정상 처리
      if (!isLoginPage() && !requestUrl.includes('/auth/me')) {
        console.error('인증되지 않은 API 접근 감지:', requestUrl);
        showErrorOnce('세션이 만료되었습니다. 다시 로그인해주세요.');

        // 현재 URL을 state로 전달하여 로그인 후 원래 페이지로 돌아올 수 있게 함
        const currentPath = window.location.pathname;
        const loginPath = `/login?redirect=${encodeURIComponent(currentPath)}`;

        // 즉시 리다이렉션
        window.location.href = loginPath;
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
      const errorMessage =
        error.response.data?.detail ||
        error.response.data?.message ||
        '요청한 정보를 찾을 수 없습니다.';

      showErrorOnce(errorMessage);

      // 페이지 렌더링을 위해 기본 데이터 반환 (UI 표시 목적)
      const path = requestUrl.split('/')[1] || '';
      const emptyResponse = createEmptyResponse(path);
      return Promise.resolve({ data: emptyResponse });
    }
    // 422 - 검증 오류 (프론트엔드에서 주로 처리해야 함)
    else if (error.response && error.response.status === 422) {
      // 검증 오류 메시지 표시
      const errorDetail =
        error.response.data?.detail || '입력 데이터가 유효하지 않습니다.';
      showErrorOnce(errorDetail);

      // 검증 오류는 거부하여 폼에서 적절히 처리하도록 함
      return Promise.reject(error);
    }
    // 500 등 서버 오류
    else if (error.response) {
      // 오류 메시지 표시
      const errorMessage =
        error.response.data?.detail ||
        error.response.data?.message ||
        `서버 오류가 발생했습니다. 다시 시도해주세요.`;

      showErrorOnce(errorMessage);
      return Promise.reject(error);
    }
    // 네트워크 오류
    else {
      showErrorOnce('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
      return Promise.reject(error);
    }
  }
);

// 불필요한 통계 함수 제거

export { showErrorOnce, showSuccess };
export default api;

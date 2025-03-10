// frontend/src/utils/AxiosConfig.js
import axios from 'axios';
import message from './message';
import { MessageTemplates, MessageKeys } from './message';
import AuthService from '../services/AuthService';
import ErrorHandler from './ErrorHandler';

// 진행중인 요청을 추적하는 객체
const pendingRequests = {};

// 토큰 갱신 상태 관리
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

// 에러 타입에 따른 메시지 처리
const handleErrorResponse = (error) => {
  // 이미 처리된 에러
  if (error.handled) return Promise.reject(error);

  if (error.response) {
    const { status, data } = error.response;

    // 401 (인증 실패) - 토큰 갱신 로직은 별도 처리
    if (status === 401 && !error.config._retry) {
      return Promise.reject(error); // 아래 토큰 갱신 로직에서 처리
    }

    // 403 (권한 없음)
    if (status === 403) {
      message.error('접근 권한이 없습니다', MessageKeys.AUTH.PERMISSION);
      return Promise.reject({ ...error, handled: true });
    }

    // 404 (리소스 없음)
    if (status === 404) {
      message.error('요청한 데이터를 찾을 수 없습니다');
      return Promise.reject({ ...error, handled: true });
    }

    // 409 (낙관적 락 충돌)
    if (status === 409) {
      const currentVersion = data?.detail?.current_version;
      let errorMessage =
        '다른 사용자가 이미 데이터를 수정했습니다. 최신 정보를 확인 후 다시 시도해주세요.';

      // 충돌한 주문번호가 포함된 경우
      if (data?.detail?.conflicted_orders) {
        const conflictedOrders = data.detail.conflicted_orders.join(', ');
        errorMessage = `다음 주문(${conflictedOrders})이 이미 다른 사용자에 의해 수정되었습니다.`;
      }

      message.error(errorMessage, 'optimistic-lock-error');
      return Promise.reject({ ...error, handled: true });
    }

    // 423 (비관적 락 충돌)
    if (status === 423) {
      const lockedBy = data?.detail?.locked_by || '다른 사용자';
      const lockType = data?.detail?.lock_type || '';
      let lockTypeText = '';

      // 락 타입에 따른 메시지 차별화
      switch (lockType) {
        case 'EDIT':
          lockTypeText = '편집';
          break;
        case 'STATUS':
          lockTypeText = '상태 변경';
          break;
        case 'ASSIGN':
          lockTypeText = '배차';
          break;
        case 'REMARK':
          lockTypeText = '메모 작성';
          break;
        default:
          lockTypeText = '수정';
      }

      message.error(
        `현재 ${lockedBy}님이 ${lockTypeText} 중입니다. 잠시 후 다시 시도해주세요.`,
        'pessimistic-lock-error'
      );
      return Promise.reject({ ...error, handled: true });
    }

    // 422 (유효성 검사 오류) 처리 개선
    if (status === 422 && Array.isArray(data.detail)) {
      const errorMessage = data.detail.map((err) => err.msg).join('\n');
      message.error(errorMessage);
      return Promise.reject({ ...error, handled: true });
    } else if (status === 422) {
      // 단일 에러 메시지 처리
      const errorMessage = data?.detail || '입력값 검증에 실패했습니다';
      message.error(errorMessage);
      return Promise.reject({ ...error, handled: true });
    }

    // 500 (서버 오류)
    if (status >= 500) {
      message.error(MessageTemplates.ERROR.SERVER, 'server-error');
      return Promise.reject({ ...error, handled: true });
    }

    // 기타 에러 응답
    const errorMessage = data?.detail || '오류가 발생했습니다';
    message.error(errorMessage);
    error.handled = true;
    return Promise.reject(error);
  }

  // 네트워크 에러
  if (error.request) {
    message.error(MessageTemplates.ERROR.NETWORK, 'network-error');
    error.handled = true;
    return Promise.reject(error);
  }

  // 기타 에러
  message.error('오류가 발생했습니다');
  error.handled = true;
  return Promise.reject(error);
};

const setupAxiosInterceptors = () => {
  // axios 기본 설정
  axios.defaults.baseURL = '/'; // 동일 도메인에서 실행하므로 루트 경로 설정
  axios.defaults.withCredentials = true; // 모든 요청에 쿠키 포함
  axios.defaults.timeout = 20000; // 20초 타임아웃 설정

  // 요청 인터셉터
  axios.interceptors.request.use(
    (config) => {
      // 액세스 토큰 확인 및 헤더 추가
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 요청 트래킹을 위한 ID 생성
      const requestId = `${config.method}-${config.url}-${Date.now()}`;
      config.requestId = requestId;

      // 진행중인 요청 목록에 추가
      pendingRequests[requestId] = true;

      return config;
    },
    (error) => Promise.reject(error)
  );

  // 응답 인터셉터
  axios.interceptors.response.use(
    (response) => {
      // 요청 완료 후 목록에서 제거
      if (response.config.requestId) {
        delete pendingRequests[response.config.requestId];
      }

      // 응답 데이터 검증 추가
      if (response.data) {
        return response;
      }
      return Promise.reject(new Error('Empty response data'));
    },
    async (error) => {
      // 요청 완료 후 목록에서 제거
      if (error.config?.requestId) {
        delete pendingRequests[error.config.requestId];
      }

      // 디버깅 로깅 추가
      if (error.response) {
        console.error('응답 에러:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('요청 에러:', error.request);
      } else {
        console.error('기타 에러:', error.message);
      }

      // 토큰 만료 처리
      if (error.response?.status === 401 && !error.config._retry) {
        if (isRefreshing) {
          // 토큰 갱신 중인 경우 대기 후 재시도
          try {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                error.config.headers.Authorization = `Bearer ${token}`;
                return axios(error.config);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          } catch (err) {
            return handleErrorResponse(err);
          }
        }

        error.config._retry = true;
        isRefreshing = true;

        try {
          // 토큰 갱신 시도
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await AuthService.refreshToken(refreshToken);

          // 갱신된 토큰으로 원래 요청 재시도
          const newToken = localStorage.getItem('access_token');
          error.config.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return axios(error.config);
        } catch (refreshError) {
          processQueue(refreshError, null);
          message.error(
            '세션이 만료되었습니다. 다시 로그인해주세요',
            MessageKeys.AUTH.SESSION_EXPIRED
          );
          AuthService.clearAuthData();

          // 현재 페이지가 로그인 페이지가 아닌 경우만 리다이렉트
          if (!window.location.pathname.includes('/login')) {
            // 현재 URL 저장
            localStorage.setItem('returnUrl', window.location.pathname);
            // 수정: 콘솔 로그 추가 및 리다이렉션 보장
            console.log('로그인 페이지로 리다이렉션합니다...');
            setTimeout(() => {
              window.location.href = '/login';
            }, 100);
          }

          return Promise.reject({ ...refreshError, handled: true });
        }
      }

      return handleErrorResponse(error);
    }
  );

  // 전역 에러 핸들링
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.isAxiosError) {
      const error = event.reason;
      if (!error.handled) {
        handleErrorResponse(error);
      }
    }
  });
};

// 진행 중인 모든 요청 취소
export const cancelAllPendingRequests = () => {
  Object.keys(pendingRequests).forEach((requestId) => {
    delete pendingRequests[requestId];
  });
};

export default setupAxiosInterceptors;

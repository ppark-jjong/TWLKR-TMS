// src/utils/api.js
import axios from 'axios';
import { getAccessToken, refreshToken, removeTokens } from './authHelpers';
import { handleApiError } from './errorHandlers';
import { message } from 'antd';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 추가
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API 요청 인터셉터 오류:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리 및 토큰 갱신
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 오류 응답 로깅 강화
    if (error.response) {
      console.error(
        `API 응답 오류: ${error.response.status} - ${error.response.statusText}`,
        error.response.data
      );

      // 422 오류 (Unprocessable Entity) 처리
      if (error.response.status === 422) {
        console.error('데이터 유효성 검증 오류:', error.response.data);

        // 날짜 형식 문제가 발생한 경우 콘솔에 표시
        if (
          originalRequest.params &&
          (originalRequest.params.start_date || originalRequest.params.end_date)
        ) {
          console.error('날짜 파라미터 확인 필요:', {
            start_date: originalRequest.params.start_date,
            end_date: originalRequest.params.end_date,
          });
        }
      }
    } else {
      console.error('API 요청 오류 (응답 없음):', error);
    }

    // 401 에러이고 재시도하지 않은 경우
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // 리프레시 토큰으로 액세스 토큰 재발급 시도
        const refreshed = await refreshToken();
        if (refreshed) {
          // 토큰 재발급 성공 시 원래 요청 재시도
          return api(originalRequest);
        } else {
          // 액세스 토큰 갱신 실패 시
          removeTokens();
          redirectToLogin();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // 리프레시 실패 시
        removeTokens();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// 로그인 페이지로 리다이렉션하는 함수
const redirectToLogin = () => {
  if (!window.location.pathname.includes('/login')) {
    console.log('인증되지 않은 상태, 로그인 페이지로 이동합니다.');
    window.location.href = '/login';
  }
};

/**
 * 안전한 API 호출 함수 - 더 간소화된 버전
 * @param {Function} apiCall - 실행할 API 함수
 * @param {Object} options - 옵션
 * @param {string} options.context - 작업 컨텍스트
 * @param {boolean} options.showErrorMessage - 오류 발생 시 메시지 표시 여부
 * @param {Function} options.onSuccess - 성공 시 실행할 콜백
 * @param {Function} options.onError - 오류 발생 시 실행할 콜백
 * @returns {Promise<any>} - API 호출 결과 (백엔드 응답 구조 그대로 반환)
 */
export const safeApiCall = async (apiCall, options = {}) => {
  const {
    context = 'API 호출',
    showErrorMessage = true,
    onSuccess,
    onError,
  } = options;

  try {
    const response = await apiCall();
    const data = response.data;

    // API 응답이 success: false인 경우 처리
    if (data && data.success === false) {
      if (showErrorMessage) {
        handleApiError(
          {
            response: {
              data,
              status: response.status,
            },
          },
          { context }
        );
      }

      if (onError)
        onError(new Error(data.message || `${context} 중 오류가 발생했습니다`));
      return data; // success: false여도 응답 그대로 반환
    }

    if (onSuccess) onSuccess(data);
    return data; // 백엔드 응답 그대로 반환
  } catch (error) {
    if (showErrorMessage) {
      handleApiError(error, { context });
    }

    if (onError) onError(error);
    return null;
  }
};

// API 함수들 - 백엔드 응답 구조를 그대로 반환
export const login = (credentials) => api.post('/auth/login', credentials);

export const checkSession = () => api.get('/auth/check-session');

export const logout = () => api.post('/auth/logout');

// 대시보드 API
export const fetchDashboards = async (params) => {
  try {
    const response = await api.get('/dashboard/list', { params });
    return response;
  } catch (error) {
    console.error('대시보드 목록 조회 실패:', error);

    // 422 에러(Unprocessable Entity) 처리
    if (error.response?.status === 422) {
      console.error('Unprocessable Entity 오류. 파라미터 확인:', params);
      // 날짜 파라미터 로깅
      if (params?.start_date || params?.end_date) {
        console.error('날짜 파라미터:', {
          start_date: params.start_date,
          end_date: params.end_date,
        });
      }
    }

    return {
      data: {
        success: false,
        message: '대시보드 목록을 불러오는데 실패했습니다.',
        error_code: error.response?.status || 'API_ERROR',
      },
    };
  }
};

export const fetchAdminData = async (params) => {
  try {
    const response = await api.get('/dashboard/admin-list', { params });
    return response;
  } catch (error) {
    console.error('관리자 대시보드 목록 조회 실패:', error);

    // 422 에러(Unprocessable Entity) 처리
    if (error.response?.status === 422) {
      console.error('Unprocessable Entity 오류. 파라미터 확인:', params);
      // 날짜 파라미터 로깅
      if (params?.start_date || params?.end_date) {
        console.error('날짜 파라미터:', {
          start_date: params.start_date,
          end_date: params.end_date,
        });
      }
    }

    return {
      data: {
        success: false,
        message: '관리자 대시보드 목록을 불러오는데 실패했습니다.',
        error_code: error.response?.status || 'API_ERROR',
      },
    };
  }
};

export const getDashboardDetail = async (id) => {
  try {
    const response = await api.get(`/dashboard/${id}`);
    return response;
  } catch (error) {
    console.error(`대시보드 상세 조회 실패 (ID: ${id}):`, error);
    return {
      data: {
        success: false,
        message: '상세 정보를 불러오는데 실패했습니다.',
        error_code: error.response?.status || 'API_ERROR',
      },
    };
  }
};

export const createDashboard = async (data) => {
  try {
    const response = await api.post('/dashboard', data);
    return response;
  } catch (error) {
    console.error('대시보드 생성 실패:', error);
    return {
      data: {
        success: false,
        message: '대시보드 생성에 실패했습니다.',
        error_code: error.response?.status || 'API_ERROR',
      },
    };
  }
};

export const updateDashboard = async (id, data) => {
  try {
    const response = await api.put(`/dashboard/${id}`, data);
    return response;
  } catch (error) {
    console.error(`대시보드 업데이트 실패 (ID: ${id}):`, error);
    return {
      data: {
        success: false,
        message: '대시보드 업데이트에 실패했습니다.',
        error_code: error.response?.status || 'API_ERROR',
      },
    };
  }
};

export const updateStatus = async (id, data) => {
  try {
    const response = await api.patch(`/dashboard/${id}/status`, data);
    return response;
  } catch (error) {
    console.error(`상태 업데이트 실패 (ID: ${id}):`, error);
    return {
      data: {
        success: false,
        message: '상태 변경에 실패했습니다.',
        error_code: error.response?.status || 'API_ERROR',
      },
    };
  }
};

export const assignDriver = async (data) => {
  try {
    const response = await api.post('/dashboard/assign', data);
    return response;
  } catch (error) {
    console.error('배차 처리 실패:', error);
    return {
      data: {
        success: false,
        message: '배차 처리에 실패했습니다.',
        error_code: error.response?.status || 'API_ERROR',
      },
    };
  }
};

export const deleteDashboards = async (ids) => {
  try {
    const response = await api.delete('/dashboard', {
      data: { dashboard_ids: ids },
    });
    return response;
  } catch (error) {
    console.error('대시보드 삭제 실패:', error);
    return {
      data: {
        success: false,
        message: '삭제에 실패했습니다.',
        error_code: error.response?.status || 'API_ERROR',
      },
    };
  }
};

// 락 관련 API
export const acquireLock = async (id, lockType, isMultiple = false) => {
  try {
    if (isMultiple) {
      const response = await api.post(`/dashboard-lock/multiple/lock`, {
        dashboard_ids: Array.isArray(id) ? id : [id],
        lock_type: lockType,
      });
      return response;
    }
    const response = await api.post(`/dashboard-lock/${id}/lock`, {
      lock_type: lockType,
    });
    return response;
  } catch (error) {
    console.error(`락 획득 실패 (ID: ${id}, Type: ${lockType}):`, error);
    return {
      data: {
        success: false,
        message: '수정 권한을 획득하는데 실패했습니다.',
        error_code: error.response?.data?.error_code || 'LOCK_ERROR',
      },
    };
  }
};

export const releaseLock = async (id, lockType, isMultiple = false) => {
  try {
    if (isMultiple) {
      const response = await api.delete(`/dashboard-lock/multiple/lock`, {
        data: {
          dashboard_ids: Array.isArray(id) ? id : [id],
          lock_type: lockType,
        },
      });
      return response;
    }
    const response = await api.delete(
      `/dashboard-lock/${id}/lock?lock_type=${lockType}`
    );
    return response;
  } catch (error) {
    console.error(`락 해제 실패 (ID: ${id}, Type: ${lockType}):`, error);
    return {
      data: {
        success: false,
        message: '수정 권한을 해제하는데 실패했습니다.',
        error_code: 'LOCK_ERROR',
      },
    };
  }
};

export const getLockInfo = async (id, lockType) => {
  try {
    const response = await api.get(
      `/dashboard-lock/${id}/lock?lock_type=${lockType}`
    );
    return response;
  } catch (error) {
    console.error(`락 정보 조회 실패 (ID: ${id}, Type: ${lockType}):`, error);
    return {
      data: {
        success: false,
        message: '락 정보 조회에 실패했습니다.',
        error_code: 'LOCK_ERROR',
      },
    };
  }
};

// 인수인계 API
export const getHandovers = async (params) => {
  try {
    const response = await api.get('/handover', { params });
    return response;
  } catch (error) {
    console.error('인수인계 목록 조회 실패:', error);
    return {
      data: {
        success: false,
        message: '인수인계 목록을 불러오는데 실패했습니다.',
        error_code: 'API_ERROR',
      },
    };
  }
};

export const getHandoverDetail = (id) => api.get(`/handover/${id}`);

export const createHandover = async (data) => {
  try {
    const response = await api.post('/handover', data);
    return response;
  } catch (error) {
    console.error('인수인계 생성 실패:', error);
    return {
      data: {
        success: false,
        message: '인수인계 작성에 실패했습니다.',
        error_code: 'API_ERROR',
      },
    };
  }
};

export const updateHandover = async (id, data) => {
  try {
    const response = await api.put(`/handover/${id}`, data);
    return response;
  } catch (error) {
    console.error('인수인계 수정 실패:', error);
    return {
      data: {
        success: false,
        message: '인수인계 수정에 실패했습니다.',
        error_code: 'API_ERROR',
      },
    };
  }
};

export const deleteHandover = async (id) => {
  try {
    const response = await api.delete(`/handover/${id}`);
    return response;
  } catch (error) {
    console.error('인수인계 삭제 실패:', error);
    return {
      data: {
        success: false,
        message: '인수인계 삭제에 실패했습니다.',
        error_code: 'API_ERROR',
      },
    };
  }
};

// 인수인계 락 API
export const acquireHandoverLock = async (id, timeout = 300) => {
  try {
    const response = await api.post(`/handover/${id}/lock`, { timeout });
    return response;
  } catch (error) {
    console.error('인수인계 락 획득 실패:', error);
    const errorResponse = error.response?.data || {
      success: false,
      message: '수정 권한을 획득하는데 실패했습니다.',
      error_code: error.response?.data?.error_code || 'LOCK_ERROR',
    };
    return { data: errorResponse };
  }
};

export const releaseHandoverLock = async (id) => {
  try {
    const response = await api.delete(`/handover/${id}/lock`);
    return response;
  } catch (error) {
    console.error('인수인계 락 해제 실패:', error);
    return {
      data: {
        success: false,
        message: '수정 권한을 해제하는데 실패했습니다.',
        error_code: 'LOCK_ERROR',
      },
    };
  }
};

export const getHandoverLockInfo = async (id) => {
  try {
    const response = await api.get(`/handover/${id}/lock`);
    return response;
  } catch (error) {
    console.error('인수인계 락 정보 조회 실패:', error);
    return {
      data: {
        success: true,
        data: { is_locked: false, id },
      },
    };
  }
};

/**
 * 엑셀 다운로드 API
 * @param {Object} params - 다운로드 파라미터
 * @returns {Promise<Blob>} - 엑셀 파일 Blob
 */
export const downloadExcel = async (params) => {
  try {
    const response = await api.get('/download/excel', {
      params,
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('엑셀 다운로드 오류:', error);
    message.error('엑셀 다운로드 중 오류가 발생했습니다');
    return null;
  }
};

// 다운로드 가능한 날짜 범위 조회 API
export const getDownloadDateRange = () => api.get('/download/date-range');

// 사용자 관리 API
export const fetchUsers = () => api.get('/user');

export const createUser = (userData) => api.post('/user', userData);

export const updateUser = (userId, userData) =>
  api.put(`/user/${userId}`, userData);

export const deleteUser = (userId) => api.delete(`/user/${userId}`);

export default api;

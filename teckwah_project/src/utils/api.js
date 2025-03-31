// src/utils/api.js
import axios from "axios";
import { getAccessToken, refreshToken, removeTokens } from "./authHelpers";
import { validateApiData } from "../types.js";
import { handleApiError } from "./errorHandlers";
import { message } from "antd";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터 - 토큰 추가
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("API 요청 인터셉터 오류:", error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리 및 토큰 갱신
api.interceptors.response.use(
  (response) => {
    // success: true인 경우에만 정상 처리
    if (response.data && response.data.success === false) {
      return Promise.reject({
        response: {
          data: response.data,
          status: response.status,
        },
      });
    }

    // 데이터 유효성 검증 (타입 안정성)
    if (response.config.validateResponseType) {
      const { data, type } = response.config.validateResponseType;
      if (data && !validateApiData(data, type)) {
        console.warn(
          `API 응답 데이터가 예상된 형식 (${type})과 일치하지 않습니다:`,
          data
        );
      }
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

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
          // 액세스 토큰 갱신 실패 시 로그아웃 처리
          removeTokens();
          // 인터셉터에서는 메시지를 표시하지 않음 (중복 방지)
          redirectToLogin();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // 리프레시 실패 시 로그아웃 처리
        removeTokens();
        // 인터셉터에서는 메시지를 표시하지 않음 (중복 방지)
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    // 에러 로깅 (콘솔에만)
    if (error.response && error.response.status === 500) {
      console.error("서버 내부 오류:", error);
    } else {
      console.error("API 요청 오류:", error);
    }

    // 인터셉터에서는 에러 처리 함수를 호출하지 않고, 오류를 그대로 전파
    // 각 컴포넌트에서 처리하도록 함
    return Promise.reject(error);
  }
);

// 로그인 페이지로 리다이렉션하는 함수
const redirectToLogin = () => {
  // 현재 경로가 로그인 페이지가 아닐 경우에만 리다이렉션
  if (!window.location.pathname.includes("/login")) {
    console.log("인증되지 않은 상태, 로그인 페이지로 이동합니다.");
    window.location.href = "/login";
  }
};

/**
 * 안전한 API 호출 함수 - 모든 에러 처리 및 타입 검증 포함
 * @param {Function} apiCall - 실행할 API 함수
 * @param {Object} options - 옵션
 * @param {string} options.context - 작업 컨텍스트
 * @param {string} options.dataType - 응답 데이터 타입 (타입 검증용)
 * @param {boolean} options.showErrorMessage - 오류 발생 시 메시지 표시 여부
 * @param {Function} options.onSuccess - 성공 시 실행할 콜백
 * @param {Function} options.onError - 오류 발생 시 실행할 콜백
 * @param {Function} options.onComplete - 성공/실패 후 공통으로 실행할 콜백
 * @returns {Promise<any>} - API 호출 결과
 */
export const safeApiCall = async (apiCall, options = {}) => {
  const {
    context = "API 호출",
    dataType,
    showErrorMessage = true,
    onSuccess,
    onError,
    onComplete,
  } = options;

  try {
    const response = await apiCall();

    // API 응답이 success: false인 경우
    if (response.data && response.data.success === false) {
      const errorMsg =
        response.data.message || `${context} 중 오류가 발생했습니다`;

      if (showErrorMessage) {
        // handleApiError에서 중복 메시지 체크를 수행
        handleApiError(
          {
            response: {
              data: response.data,
              status: response.status,
            },
          },
          { showMessage: true }
        );
      }

      if (onError) onError(new Error(errorMsg));
      return null;
    }

    // 데이터 유효성 검증
    if (dataType && response.data?.data) {
      if (!validateApiData(response.data.data, dataType)) {
        console.warn(
          `API 응답 데이터가 예상된 형식 (${dataType})과 일치하지 않습니다:`,
          response.data.data
        );
      }
    }

    if (onSuccess) onSuccess(response.data);
    return response.data;
  } catch (error) {
    console.error(`${context} 중 오류 발생:`, error);

    if (showErrorMessage) {
      handleApiError(error, {
        showMessage: true,
      });
    }

    if (onError) onError(error);
    return null;
  } finally {
    if (onComplete) onComplete();
  }
};

// API 함수들
export const login = (credentials) => api.post("/auth/login", credentials);

export const checkSession = () => api.get("/auth/check-session");

export const logout = () => api.post("/auth/logout");

// 대시보드 API
export const fetchDashboards = (params) =>
  api.get("/dashboard/list", { params });

export const fetchAdminData = (params) =>
  api.get("/dashboard/admin-list", { params });

export const getDashboardDetail = (id) => api.get(`/dashboard/${id}`);

export const createDashboard = (data) => api.post("/dashboard", data);

export const updateDashboard = (id, data) => api.put(`/dashboard/${id}`, data);

export const updateStatus = (id, data) =>
  api.patch(`/dashboard/${id}/status`, data);

export const assignDriver = (data) => api.post("/dashboard/assign", data);

export const deleteDashboards = (ids) =>
  api.delete("/dashboard", { data: { dashboard_ids: ids } });

// 락 관련 API
export const acquireLock = (id, lockType, isMultiple = false) => {
  // 다중 락 요청 처리
  if (isMultiple) {
    return api.post(`/dashboard-lock/multiple/lock`, {
      dashboard_ids: Array.isArray(id) ? id : [id],
      lock_type: lockType,
    });
  }

  // 단일 락 요청 처리
  return api.post(`/dashboard-lock/${id}/lock`, { lock_type: lockType });
};

export const releaseLock = (id, lockType, isMultiple = false) => {
  // 다중 락 해제 처리
  if (isMultiple) {
    return api.delete(`/dashboard-lock/multiple/lock`, {
      data: {
        dashboard_ids: Array.isArray(id) ? id : [id],
        lock_type: lockType,
      },
    });
  }

  // 단일 락 해제 처리
  return api.delete(`/dashboard-lock/${id}/lock?lock_type=${lockType}`);
};

export const getLockInfo = (id, lockType) =>
  api.get(`/dashboard-lock/${id}/lock?lock_type=${lockType}`);

// 인수인계 API
export const getHandovers = (params) => api.get("/handover", { params });

export const getHandoverDetail = (id) => api.get(`/handover/${id}`);

export const createHandover = (data) => api.post("/handover", data);

export const updateHandover = (id, data) => api.put(`/handover/${id}`, data);

export const deleteHandover = (id) => api.delete(`/handover/${id}`);

// 인수인계 락 API
export const acquireHandoverLock = (id, timeout = 300) =>
  api.post(`/handover/${id}/lock`, { timeout });

export const releaseHandoverLock = (id) => api.delete(`/handover/${id}/lock`);

export const getHandoverLockInfo = (id) => api.get(`/handover/${id}/lock`);

/**
 * 엑셀 다운로드 API
 * @param {Object} params - 다운로드 파라미터
 * @returns {Promise} 다운로드 결과
 */
export const downloadExcel = async (params) => {
  try {
    const response = await api.get("/dashboard/export/excel", {
      params,
      responseType: "blob",
    });

    // 파일명 결정
    let filename = "dashboard_data.xlsx";

    // Content-Disposition 헤더에서 파일명 추출 시도
    const contentDisposition = response.headers["content-disposition"];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(
        /filename="?(.+?)"?(?:;|$)/
      );
      if (filenameMatch && filenameMatch[1]) {
        filename = decodeURIComponent(filenameMatch[1]);
      }
    } else {
      // 파일명 생성 (날짜 기반)
      const startDate = params.start_date?.replace(/-/g, "") || "";
      const endDate = params.end_date?.replace(/-/g, "") || "";
      if (startDate && endDate) {
        filename = `dashboard_data_${startDate}_${endDate}.xlsx`;
      }
    }

    // Blob URL 생성 및 다운로드
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return response;
  } catch (error) {
    handleApiError(error, {
      context: "엑셀 다운로드",
      showMessage: true,
    });
    throw error;
  }
};

export const getDownloadDateRange = () => api.get("/download/date-range");

// 사용자 관리 API
export const fetchUsers = () => api.get("/user");

export const createUser = (userData) => api.post("/user", userData);

export const updateUser = (userId, userData) =>
  api.put(`/user/${userId}`, userData);

export const deleteUser = (userId) => api.delete(`/user/${userId}`);

export default api;

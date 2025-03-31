// src/utils/api.js
import axios from 'axios';
import { getAccessToken, refreshToken, removeTokens } from './authHelpers';

const API_BASE_URL = 'http://localhost:8000/api';

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
  (error) => Promise.reject(error)
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
        }
      } catch (refreshError) {
        // 리프레시 실패 시 로그아웃 처리
        removeTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API 함수들
export const login = (credentials) => api.post('/auth/login', credentials);

export const checkSession = () => api.get('/auth/check-session');

export const logout = () => api.post('/auth/logout');

// 대시보드 API
export const fetchDashboards = (params) =>
  api.get('/dashboard/list', { params });

export const getDashboardDetail = (id) => api.get(`/dashboard/${id}`);

export const createDashboard = (data) => api.post('/dashboard', data);

export const updateDashboard = (id, data) => api.put(`/dashboard/${id}`, data);

export const updateStatus = (id, data) =>
  api.patch(`/dashboard/${id}/status`, data);

export const assignDriver = (data) => api.post('/dashboard/assign', data);

export const deleteDashboards = (ids) =>
  api.delete('/dashboard', { data: { dashboard_ids: ids } });

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
export const getHandovers = (params) => api.get('/api/handover', { params });

export const getHandoverDetail = (id) => api.get(`/api/handover/${id}`);

export const createHandover = (data) => api.post('/api/handover', data);

export const updateHandover = (id, data) =>
  api.put(`/api/handover/${id}`, data);

export const deleteHandover = (id) => api.delete(`/api/handover/${id}`);

// 인수인계 락 API
export const acquireHandoverLock = (id, timeout = 300) =>
  api.post(`/api/handover/${id}/lock`, { timeout });

export const releaseHandoverLock = (id) =>
  api.delete(`/api/handover/${id}/lock`);

export const getHandoverLockInfo = (id) => api.get(`/api/handover/${id}/lock`);

// 다운로드 API
export const downloadExcel = (params) =>
  api.post('/download/excel', params, { responseType: 'blob' });

export const getDownloadDateRange = () => api.get('/download/date-range');

// 사용자 관리 API
export const fetchUsers = () => api.get('/user');

export const createUser = (userData) => api.post('/user', userData);

export const updateUser = (userId, userData) =>
  api.put(`/user/${userId}`, userData);

export const deleteUser = (userId) => api.delete(`/user/${userId}`);

export default api;

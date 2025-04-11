import apiClient from './client';

/**
 * 대시보드 목록 조회 API
 * @param {Object} params - 조회 파라미터
 * @param {string} params.start - 시작 날짜 (ETA 기준)
 * @param {string} params.end - 종료 날짜 (ETA 기준)
 * @param {number} params.page - 페이지 번호
 * @param {number} params.limit - 페이지 사이즈
 * @returns {Promise<Object>} - 대시보드 목록 응답 데이터
 */
export const getDashboardList = async (params) => {
  return await apiClient.get('/dashboard/list', { params });
};

/**
 * 대시보드 상세 조회 API
 * @param {number} id - 대시보드 ID
 * @returns {Promise<Object>} - 대시보드 상세 응답 데이터
 */
export const getDashboardDetail = async (id) => {
  return await apiClient.get(`/dashboard/${id}`);
};

/**
 * 대시보드 생성 API
 * @param {Object} data - 대시보드 생성 데이터
 * @returns {Promise<Object>} - 대시보드 생성 응답 데이터
 */
export const createDashboard = async (data) => {
  return await apiClient.post('/dashboard', data);
};

/**
 * 대시보드 수정 API
 * @param {number} id - 대시보드 ID
 * @param {Object} data - 대시보드 수정 데이터
 * @returns {Promise<Object>} - 대시보드 수정 응답 데이터
 */
export const updateDashboard = async (id, data) => {
  return await apiClient.put(`/dashboard/${id}`, data);
};

/**
 * 대시보드 삭제 API
 * @param {number} id - 대시보드 ID
 * @returns {Promise<Object>} - 대시보드 삭제 응답 데이터
 */
export const deleteDashboard = async (id) => {
  return await apiClient.delete(`/dashboard/${id}`);
};

/**
 * 상태 변경 API
 * @param {number} id - 대시보드 ID
 * @param {Object} data - 상태 변경 데이터
 * @param {string} data.status - 변경할 상태
 * @returns {Promise<Object>} - 상태 변경 응답 데이터
 */
export const updateStatus = async (id, data) => {
  return await apiClient.patch(`/dashboard/${id}/status`, data);
};

/**
 * 배차 처리 API
 * @param {number} id - 대시보드 ID
 * @param {Object} data - 배차 처리 데이터
 * @param {string} data.driver_name - 배송기사 이름
 * @param {string} data.driver_contact - 배송기사 연락처
 * @returns {Promise<Object>} - 배차 처리 응답 데이터
 */
export const assignDriver = async (id, data) => {
  return await apiClient.patch(`/dashboard/${id}/assign`, data);
};

/**
 * 다중 배차 처리 API
 * @param {Object} data - 다중 배차 처리 데이터
 * @param {Array<number>} data.ids - 대시보드 ID 배열
 * @param {string} data.driver_name - 배송기사 이름
 * @param {string} data.driver_contact - 배송기사 연락처
 * @returns {Promise<Object>} - 다중 배차 처리 응답 데이터
 */
export const assignMultiDrivers = async (data) => {
  return await apiClient.patch('/dashboard/multi-assign', data);
};

/**
 * 시각화 데이터 조회 API
 * @param {Object} params - 조회 파라미터
 * @param {string} params.chart_type - 차트 타입 (time/department)
 * @param {string} params.start_date - 시작 날짜
 * @param {string} params.end_date - 종료 날짜
 * @param {string} params.department - 부서
 * @returns {Promise<Object>} - 시각화 데이터 응답 데이터
 */
export const getVisualizationData = async (params) => {
  return await apiClient.get('/dashboard/visualization', { params });
};

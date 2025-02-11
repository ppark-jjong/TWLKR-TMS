// frontend/src/services/dashboardService.js

/**
 * 대시보드 관련 API 호출 서비스
 * @module DashboardService
 */

import api from './main_api';

const DashboardService = {
  /**
   * 날짜별 대시보드 목록 조회
   * @param {string} date - YYYY-MM-DD 형식의 날짜
   * @returns {Promise<Array>}
   */
  getList: async (date) => {
    const response = await api.get(`/dashboard?date=${date}`);
    return response.data;
  },

  /**
   * 대시보드 상세 정보 조회
   * @param {number} id - 대시보드 ID
   * @returns {Promise<Object>}
   */
  getDetail: async (id) => {
    const response = await api.get(`/dashboard/${id}`);
    return response.data;
  },

  /**
   * 대시보드 생성
   * @param {Object} data - 생성할 대시보드 데이터
   * @returns {Promise<Object>}
   */
  create: async (data) => {
    const response = await api.post('/dashboard', data);
    return response.data;
  },

  /**
   * 상태 업데이트
   * @param {number} id - 대시보드 ID
   * @param {string} status - 변경할 상태
   * @returns {Promise<Object>}
   */
  updateStatus: async (id, status) => {
    const response = await api.put(`/dashboard/${id}/status`, { status });
    return response.data;
  },

  /**
   * 메모 업데이트
   * @param {number} id - 대시보드 ID
   * @param {string} remark - 변경할 메모
   * @returns {Promise<Object>}
   */
  updateRemark: async (id, remark) => {
    const response = await api.put(`/dashboard/${id}/remark`, { remark });
    return response.data;
  },

  /**
   * 기사 배차
   * @param {Array<number>} dashboardIds - 대시보드 ID 목록
   * @param {number} driverId - 기사 ID
   * @param {string} [driverRemark] - 기사 메모
   * @returns {Promise<Object>}
   */
  assignDriver: async (dashboardIds, driverId, driverRemark) => {
    const response = await api.post('/dashboard/assign', {
      dashboard_ids: dashboardIds,
      driver_id: driverId,
      driver_remark: driverRemark
    });
    return response.data;
  },

  /**
   * 대시보드 삭제
   * @param {Array<number>} ids - 삭제할 대시보드 ID 목록
   * @returns {Promise<Object>}
   */
  deleteMultiple: async (ids) => {
    const response = await api.delete('/dashboard', { data: { dashboard_ids: ids } });
    return response.data;
  }
};

export default DashboardService;
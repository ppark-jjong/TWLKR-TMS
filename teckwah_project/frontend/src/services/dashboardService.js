// src/services/dashboardService.js
import api from './api';
import { format } from 'date-fns';

export const dashboardService = {
  /**
   * 대시보드 생성
   * @param {Object} data - 생성할 대시보드 데이터
   * @returns {Promise<Object>} 생성된 대시보드 정보
   */
  create: async (data) => {
    const { data: response } = await api.post('/dashboard', data);
    return response;
  },

  /**
   * 대시보드 목록 조회
   * @param {Date} date - 조회할 날짜
   * @returns {Promise<Array>} 대시보드 목록
   */
  getList: async (date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const { data } = await api.get(`/dashboard?date=${formattedDate}`);
    return data;
  },

  /**
   * 대시보드 상세 정보 조회
   * @param {number} id - 대시보드 ID
   * @returns {Promise<Object>} 대시보드 상세 정보
   */
  getDetail: async (id) => {
    const { data } = await api.get(`/dashboard/${id}`);
    return data;
  },

  /**
   * 배송 상태 업데이트
   * @param {number} id - 대시보드 ID
   * @param {string} status - 새로운 상태
   * @returns {Promise<Object>} 업데이트된 대시보드 정보
   */
  updateStatus: async (id, status) => {
    const { data } = await api.put(`/dashboard/${id}/status`, { status });
    return data;
  },

  /**
   * 메모 업데이트
   * @param {number} id - 대시보드 ID
   * @param {string} remark - 새로운 메모
   * @returns {Promise<Object>} 업데이트된 대시보드 정보
   */
  updateRemark: async (id, remark) => {
    const { data } = await api.put(`/dashboard/${id}/remark`, { remark });
    return data;
  },

  /**
   * 기사 배차
   * @param {Array<number>} dashboardIds - 대시보드 ID 목록
   * @param {number} driverId - 기사 ID
   * @param {string} [driverRemark] - 기사 메모
   * @returns {Promise<Object>} 배차 결과
   */
  assignDriver: async (dashboardIds, driverId, driverRemark) => {
    const { data } = await api.post('/dashboard/assign', {
      dashboard_ids: dashboardIds,
      driver_id: driverId,
      driver_remark: driverRemark,
    });
    return data;
  },

  /**
   * 대시보드 삭제
   * @param {Array<number>} dashboardIds - 삭제할 대시보드 ID 목록
   * @returns {Promise<Object>} 삭제 결과
   */
  deleteDashboards: async (dashboardIds) => {
    const { data } = await api.delete('/dashboard', {
      data: { dashboard_ids: dashboardIds },
    });
    return data;
  },
};
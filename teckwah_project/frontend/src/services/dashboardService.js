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
    try {
      // ETA 날짜 포맷 변환
      const formattedData = {
        ...data,
        eta: format(data.eta, "yyyy-MM-dd'T'HH:mm:ss")
      };
      return await api.post('/dashboard', formattedData);
    } catch (error) {
      console.error('대시보드 생성 실패:', error);
      throw error;
    }
  },

  /**
   * 대시보드 목록 조회
   * @param {Date} date - 조회할 날짜
   * @returns {Promise<Array>} 대시보드 목록
   */
  getList: async (date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      return await api.get(`/dashboard?date=${formattedDate}`);
    } catch (error) {
      console.error('대시보드 목록 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 대시보드 상세 정보 조회
   * @param {number} id - 대시보드 ID
   * @returns {Promise<Object>} 대시보드 상세 정보
   */
  getDetail: async (id) => {
    try {
      return await api.get(`/dashboard/${id}`);
    } catch (error) {
      console.error('대시보드 상세 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 배송 상태 업데이트
   * @param {number} id - 대시보드 ID
   * @param {string} status - 새로운 상태
   * @returns {Promise<Object>} 업데이트된 대시보드 정보
   */
  updateStatus: async (id, status) => {
    try {
      return await api.put(`/dashboard/${id}/status`, { status });
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
      throw error;
    }
  },

  /**
   * 메모 업데이트
   * @param {number} id - 대시보드 ID
   * @param {string} remark - 새로운 메모
   * @returns {Promise<Object>} 업데이트된 대시보드 정보
   */
  updateRemark: async (id, remark) => {
    try {
      return await api.put(`/dashboard/${id}/remark`, { remark });
    } catch (error) {
      console.error('메모 업데이트 실패:', error);
      throw error;
    }
  },

  /**
   * 기사 배차
   * @param {Array<number>} dashboardIds - 대시보드 ID 목록
   * @param {number} driverId - 기사 ID
   * @param {string} [driverRemark] - 기사 메모
   * @returns {Promise<Object>} 배차 결과
   */
  assignDriver: async (dashboardIds, driverId, driverRemark) => {
    try {
      return await api.post('/dashboard/assign', {
        dashboard_ids: dashboardIds,
        driver_id: driverId,
        driver_remark: driverRemark
      });
    } catch (error) {
      console.error('기사 배차 실패:', error);
      throw error;
    }
  },

  /**
   * 대시보드 삭제
   * @param {Array<number>} dashboardIds - 삭제할 대시보드 ID 목록
   * @returns {Promise<Object>} 삭제 결과
   */
  deleteDashboards: async (dashboardIds) => {
    try {
      return await api.delete('/dashboard', {
        data: { dashboard_ids: dashboardIds }
      });
    } catch (error) {
      console.error('대시보드 삭제 실패:', error);
      throw error;
    }
  },
};
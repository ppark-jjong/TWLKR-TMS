// frontend/src/services/visualizationService.js

/**
 * 시각화 데이터 조회 서비스
 * @module VisualizationService
 */

import api from './mainApi';

const VisualizationService = {
  /**
   * 배송 현황 통계 조회
   * @param {string} startDate - 시작일자 (YYYY-MM-DD)
   * @param {string} endDate - 종료일자 (YYYY-MM-DD)
   * @returns {Promise<Object>}
   */
  getDeliveryStatus: async (startDate, endDate) => {
    const response = await api.get('/visualization/status', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  /**
   * 시간대별 접수량 조회
   * @param {string} startDate - 시작일자 (YYYY-MM-DD)
   * @param {string} endDate - 종료일자 (YYYY-MM-DD)
   * @returns {Promise<Object>}
   */
  getHourlyVolume: async (startDate, endDate) => {
    const response = await api.get('/visualization/hourly', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  }
};

export default VisualizationService;
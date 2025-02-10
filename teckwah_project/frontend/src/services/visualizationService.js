// src/services/visualizationService.js
import api from "./api";

export const visualizationService = {
  /**
   * 배송 현황 통계 조회
   * @param {string} startDate - 시작일 (YYYY-MM-DD)
   * @param {string} endDate - 종료일 (YYYY-MM-DD)
   * @returns {Promise<Object>} 배송 현황 통계
   */
  getDeliveryStatus: async (startDate, endDate) => {
    const { data } = await api.get("/visualization/delivery-status", {
      params: { start_date: startDate, end_date: endDate },
    });
    return data;
  },

  /**
   * 시간대별 접수량 조회
   * @param {string} startDate - 시작일 (YYYY-MM-DD)
   * @param {string} endDate - 종료일 (YYYY-MM-DD)
   * @returns {Promise<Object>} 시간대별 접수량
   */
  getHourlyVolume: async (startDate, endDate) => {
    const { data } = await api.get("/visualization/hourly-volume", {
      params: { start_date: startDate, end_date: endDate },
    });
    return data;
  },
};

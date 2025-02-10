// src/services/visualizationService.js
import api from './api';
import { format } from 'date-fns';

export const visualizationService = {
  /**
   * 배송 현황 통계 조회
   * @param {Date} startDate - 시작일
   * @param {Date} endDate - 종료일
   * @returns {Promise<Object>} 배송 현황 통계
   */
  getDeliveryStatus: async (startDate, endDate) => {
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      return await api.get('/visualization/delivery-status', {
        params: {
          start_date: formattedStartDate,
          end_date: formattedEndDate
        }
      });
    } catch (error) {
      console.error('배송 현황 통계 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 시간대별 접수량 조회
   * @param {Date} startDate - 시작일
   * @param {Date} endDate - 종료일
   * @returns {Promise<Object>} 시간대별 접수량
   */
  getHourlyVolume: async (startDate, endDate) => {
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      return await api.get('/visualization/hourly-volume', {
        params: {
          start_date: formattedStartDate,
          end_date: formattedEndDate
        }
      });
    } catch (error) {
      console.error('시간대별 접수량 조회 실패:', error);
      throw error;
    }
  },
};
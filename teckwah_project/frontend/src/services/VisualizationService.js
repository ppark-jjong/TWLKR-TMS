// frontend/src/services/VisualizationService.js
import axios from 'axios';
import { CHART_TYPES } from '../utils/Constants';

class VisualizationService {
  /**
   * 시각화 데이터 조회
   * @param {string} type - 시각화 타입
   * @param {Date} startDate - 시작 날짜
   * @param {Date} endDate - 종료 날짜
   * @returns {Promise<Object>} 시각화 데이터
   */
  async getVisualizationData(type, startDate, endDate) {
    try {
      const endpoint = type === CHART_TYPES.DELIVERY_STATUS ? 'delivery_status' : 'hourly_orders';
      const params = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      };

      const response = await axios.get(`/visualization/${endpoint}`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 데이터 조회 가능한 가장 오래된 날짜 조회
   * @returns {Promise<string>} YYYY-MM-DD 형식의 날짜
   */
  async getOldestDataDate() {
    try {
      const response = await axios.get('/visualization/oldest-date');
      return response.data.oldest_date;
    } catch (error) {
      throw error;
    }
  }
}

export default new VisualizationService();
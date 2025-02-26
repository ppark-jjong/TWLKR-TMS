// frontend/src/services/VisualizationService.js
import axios from 'axios';
import message from '../utils/message';
import { MessageKeys, MessageTemplates } from '../utils/message';

class VisualizationService {
  /**
   * 배송 현황 데이터 조회 (create_time 기준)
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Object>} - 응답 객체
   */
  async getDeliveryStatus(startDate, endDate) {
    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      console.log('배송 현황 데이터 요청:', startDate, '~', endDate);

      const response = await axios.get('/visualization/delivery_status', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      // 응답 데이터 안전 검증
      if (!response.data || !response.data.data) {
        console.error('Invalid visualization response:', response);
        message.error('서버 응답 형식이 올바르지 않습니다', key);
        return null;
      }

      console.log('배송 현황 데이터 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('Delivery status fetch error:', error);
      throw error;
    }
  }

  /**
   * 시간대별 접수량 데이터 조회 (create_time 기준)
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Object>} - 응답 객체
   */
  async getHourlyOrders(startDate, endDate) {
    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      console.log('시간대별 접수량 데이터 요청:', startDate, '~', endDate);

      const response = await axios.get('/visualization/hourly_orders', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      // 응답 데이터 안전 검증
      if (!response.data || !response.data.data) {
        console.error('Invalid hourly orders response:', response);
        message.error('서버 응답 형식이 올바르지 않습니다', key);
        return null;
      }

      console.log('시간대별 접수량 데이터 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('Hourly orders fetch error:', error);
      throw error;
    }
  }
}

export default new VisualizationService();

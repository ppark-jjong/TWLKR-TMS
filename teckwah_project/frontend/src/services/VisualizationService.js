// frontend/src/services/VisualizationService.js
import axios from 'axios';
import message from '../utils/message';
import { MessageKeys, MessageTemplates } from '../utils/message';

class VisualizationService {
  async getDeliveryStatus(startDate, endDate) {
    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      message.loading('데이터 조회 중...', key);
      const response = await axios.get('/visualization/delivery_status', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
        withCredentials: true,
      });

      // 응답 데이터 안전 검증
      if (!response.data || !response.data.data) {
        console.error('Invalid visualization response:', response);
        message.error('서버 응답 형식이 올바르지 않습니다', key);
        return null;
      }

      const { data } = response.data;

      if (!data.total_count) {
        message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
      } else {
        message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
      }

      return response.data;
    } catch (error) {
      console.error('Delivery status fetch error:', error);
      message.error(MessageTemplates.DATA.LOAD_ERROR, key);
      throw error;
    }
  }

  async getHourlyOrders(startDate, endDate) {
    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      message.loading('데이터 조회 중...', key);
      const response = await axios.get('/visualization/hourly_orders', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
        withCredentials: true,
      });

      // 응답 데이터 안전 검증
      if (!response.data || !response.data.data) {
        console.error('Invalid hourly orders response:', response);
        message.error('서버 응답 형식이 올바르지 않습니다', key);
        return null;
      }

      const { data } = response.data;

      if (!data.total_count) {
        message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
      } else {
        message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
      }

      return response.data;
    } catch (error) {
      console.error('Hourly orders fetch error:', error);
      message.error(MessageTemplates.DATA.LOAD_ERROR, key);
      throw error;
    }
  }
}

export default new VisualizationService();

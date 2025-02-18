// frontend/src/services/VisualizationService.js
import axios from 'axios';
import { CHART_TYPES } from '../utils/Constants';

class VisualizationService {
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

  async getDateRange() {
    try {
      const response = await axios.get('/visualization/date-range');
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new VisualizationService();
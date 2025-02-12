// frontend/src/services/VisualizationService.js
import axios from 'axios';

/**
 * 시각화 관련 API 호출을 담당하는 서비스
 */
class VisualizationService {
  /**
   * 시각화 데이터 조회
   * @param {string} type - 시각화 타입 ('배송 현황' | '시간별 접수량')
   * @param {Date} startDate - 시작 날짜
   * @param {Date} endDate - 종료 날짜
   * @returns {Promise<Object>} 시각화 데이터
   */
  async getVisualizationData(type, startDate, endDate) {
    const response = await axios.post(`/visualization/${type}`, {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    });
    return response.data;
  }
}

export default new VisualizationService();
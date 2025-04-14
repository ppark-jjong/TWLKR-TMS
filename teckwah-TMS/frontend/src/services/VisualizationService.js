/**
 * 시각화 관련 API 서비스
 */
import api from './api';

const VisualizationService = {
  /**
   * 시각화용 통계 데이터 조회 (관리자 전용)
   * @param {Object} params 기간 등 필터 조건
   * @returns {Promise} 시각화 데이터
   */
  getStats: async (params) => {
    const response = await api.get('/visualization/stats', { params });
    return response.data;
  }
};

export default VisualizationService;

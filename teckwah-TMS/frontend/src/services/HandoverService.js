/**
 * 인수인계 관련 API 서비스
 */
import api from './api';

const HandoverService = {
  /**
   * 인수인계 목록 조회
   * @param {Object} params 검색 조건
   * @returns {Promise} 인수인계 목록
   */
  getHandovers: async (params) => {
    const response = await api.get('/handover', { params });
    return response.data;
  },
  
  /**
   * 특정 인수인계 조회
   * @param {number} handoverId 인수인계 ID
   * @returns {Promise} 인수인계 상세 정보
   */
  getHandover: async (handoverId) => {
    const response = await api.get(`/handover/${handoverId}`);
    return response.data;
  },
  
  /**
   * 인수인계 생성
   * @param {Object} handoverData 인수인계 데이터
   * @returns {Promise} 생성된 인수인계 정보
   */
  createHandover: async (handoverData) => {
    const response = await api.post('/handover', handoverData);
    return response.data;
  },
  
  /**
   * 인수인계 삭제
   * @param {number} handoverId 인수인계 ID
   * @returns {Promise} 삭제 결과
   */
  deleteHandover: async (handoverId) => {
    const response = await api.delete(`/handover/${handoverId}`);
    return response.data;
  }
};

export default HandoverService;

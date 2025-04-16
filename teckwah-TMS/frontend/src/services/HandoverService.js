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
    try {
      console.log('인수인계 목록 조회 요청:', params);
      const response = await api.get('/handover', { params });
      console.log('인수인계 목록 조회 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('인수인계 목록 조회 오류:', error);
      throw error;
    }
  },
  
  /**
   * 특정 인수인계 조회
   * @param {number} handoverId 인수인계 ID
   * @returns {Promise} 인수인계 상세 정보
   */
  getHandover: async (handoverId) => {
    try {
      console.log(`인수인계 상세 조회 요청: ID=${handoverId}`);
      const response = await api.get(`/handover/${handoverId}`);
      console.log('인수인계 상세 조회 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error(`인수인계 상세 조회 오류: ID=${handoverId}`, error);
      throw error;
    }
  },
  
  /**
   * 인수인계 생성
   * @param {Object} handoverData 인수인계 데이터
   * @returns {Promise} 생성된 인수인계 정보
   */
  createHandover: async (handoverData) => {
    try {
      console.log('인수인계 생성 요청:', handoverData);
      const response = await api.post('/handover', handoverData);
      console.log('인수인계 생성 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('인수인계 생성 오류:', error);
      throw error;
    }
  },
  
  /**
   * 인수인계 수정
   * @param {number} handoverId 인수인계 ID
   * @param {Object} handoverData 인수인계 데이터
   * @returns {Promise} 수정된 인수인계 정보
   */
  updateHandover: async (handoverId, handoverData) => {
    try {
      console.log(`인수인계 수정 요청: ID=${handoverId}`, handoverData);
      const response = await api.put(`/handover/${handoverId}`, handoverData);
      console.log('인수인계 수정 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error(`인수인계 수정 오류: ID=${handoverId}`, error);
      throw error;
    }
  },
  
  /**
   * 인수인계 락 획득
   * @param {number} handoverId 인수인계 ID
   * @returns {Promise} 락 획득 결과
   */
  lockHandover: async (handoverId) => {
    try {
      console.log(`인수인계 락 획득 요청: ID=${handoverId}`);
      const response = await api.post(`/handover/${handoverId}/lock`);
      console.log('인수인계 락 획득 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error(`인수인계 락 획득 오류: ID=${handoverId}`, error);
      throw error;
    }
  },
  
  /**
   * 인수인계 락 해제
   * @param {number} handoverId 인수인계 ID
   * @returns {Promise} 락 해제 결과
   */
  unlockHandover: async (handoverId) => {
    try {
      console.log(`인수인계 락 해제 요청: ID=${handoverId}`);
      const response = await api.post(`/handover/${handoverId}/unlock`);
      console.log('인수인계 락 해제 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error(`인수인계 락 해제 오류: ID=${handoverId}`, error);
      throw error;
    }
  },
  
  /**
   * 인수인계 삭제
   * @param {number} handoverId 인수인계 ID
   * @returns {Promise} 삭제 결과
   */
  deleteHandover: async (handoverId) => {
    try {
      console.log(`인수인계 삭제 요청: ID=${handoverId}`);
      const response = await api.delete(`/handover/${handoverId}`);
      console.log('인수인계 삭제 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error(`인수인계 삭제 오류: ID=${handoverId}`, error);
      throw error;
    }
  }
};

export default HandoverService;
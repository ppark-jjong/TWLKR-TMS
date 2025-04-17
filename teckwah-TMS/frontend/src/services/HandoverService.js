/**
 * 인수인계 관련 API 서비스
 */
import api from './api';
import logger from '../utils/logger';

// 서비스 이름 상수
const SERVICE_NAME = 'HandoverService';

const HandoverService = {
  /**
   * 인수인계 목록 조회
   * @param {Object} params 검색 조건
   * @returns {Promise} 인수인계 목록
   */
  getHandovers: async (params) => {
    try {
      logger.service(SERVICE_NAME, 'getHandovers');
      logger.api('GET', '/handover');
      
      const response = await api.get('/handover', { params });
      
      logger.apiResponse('/handover', 'success');
      return response.data;
    } catch (error) {
      logger.error('인수인계 목록 조회 실패', error);
      throw error; // api 인터셉터에서 처리
    }
  },
  
  /**
   * 특정 인수인계 조회
   * @param {number} handoverId 인수인계 ID
   * @returns {Promise} 인수인계 상세 정보
   */
  getHandover: async (handoverId) => {
    try {
      logger.service(SERVICE_NAME, 'getHandover', { handoverId });
      logger.api('GET', `/handover/${handoverId}`);
      
      const response = await api.get(`/handover/${handoverId}`);
      
      logger.apiResponse(`/handover/${handoverId}`, 'success');
      return response.data;
    } catch (error) {
      logger.error(`인수인계 상세 조회 실패: ID=${handoverId}`, error);
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
      logger.service(SERVICE_NAME, 'createHandover');
      logger.api('POST', '/handover');
      
      const response = await api.post('/handover', handoverData);
      
      logger.apiResponse('/handover', 'success');
      return response.data;
    } catch (error) {
      logger.error('인수인계 생성 실패', error);
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
      logger.service(SERVICE_NAME, 'updateHandover', { handoverId });
      logger.api('PUT', `/handover/${handoverId}`);
      
      const response = await api.put(`/handover/${handoverId}`, handoverData);
      
      logger.apiResponse(`/handover/${handoverId}`, 'success');
      return response.data;
    } catch (error) {
      logger.error(`인수인계 수정 실패: ID=${handoverId}`, error);
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
      logger.service(SERVICE_NAME, 'lockHandover', { handoverId });
      logger.api('POST', `/handover/${handoverId}/lock`);
      
      const response = await api.post(`/handover/${handoverId}/lock`);
      
      logger.apiResponse(`/handover/${handoverId}/lock`, 'success', {
        acquired: response.data?.success === true
      });
      return response.data;
    } catch (error) {
      logger.error(`인수인계 락 획득 실패: ID=${handoverId}`, error);
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
      logger.service(SERVICE_NAME, 'unlockHandover', { handoverId });
      logger.api('POST', `/handover/${handoverId}/unlock`);
      
      const response = await api.post(`/handover/${handoverId}/unlock`);
      
      logger.apiResponse(`/handover/${handoverId}/unlock`, 'success', {
        released: response.data?.success === true
      });
      return response.data;
    } catch (error) {
      logger.error(`인수인계 락 해제 실패: ID=${handoverId}`, error);
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
      logger.service(SERVICE_NAME, 'deleteHandover', { handoverId });
      logger.api('DELETE', `/handover/${handoverId}`);
      
      const response = await api.delete(`/handover/${handoverId}`);
      
      logger.apiResponse(`/handover/${handoverId}`, 'success');
      return response.data;
    } catch (error) {
      logger.error(`인수인계 삭제 실패: ID=${handoverId}`, error);
      throw error;
    }
  }
};

export default HandoverService;
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
    const url = '/handover';
    try {
      logger.service(SERVICE_NAME, 'getHandovers');
      logger.api('GET', url);

      const response = await api.get(url, { params });

      logger.response(url, response.data?.success);
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
    const url = `/handover/${handoverId}`;
    try {
      logger.service(SERVICE_NAME, 'getHandover', { handoverId });
      logger.api('GET', url);

      const response = await api.get(url);

      logger.response(url, response.data?.success);
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
    const url = '/handover';
    try {
      logger.service(SERVICE_NAME, 'createHandover');
      logger.api('POST', url);

      const response = await api.post(url, handoverData);

      logger.response(url, response.data?.success);
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
    const url = `/handover/${handoverId}`;
    try {
      logger.service(SERVICE_NAME, 'updateHandover', { handoverId });
      logger.api('PUT', url);

      const response = await api.put(url, handoverData);

      logger.response(url, response.data?.success);
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
    const url = `/handover/${handoverId}/lock`;
    try {
      logger.service(SERVICE_NAME, 'lockHandover', { handoverId });
      logger.api('POST', url);

      const response = await api.post(url);

      logger.response(url, response.data?.success);
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
    const url = `/handover/${handoverId}/unlock`;
    try {
      logger.service(SERVICE_NAME, 'unlockHandover', { handoverId });
      logger.api('POST', url);

      const response = await api.post(url);

      logger.response(url, response.data?.success);
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
    const url = `/handover/${handoverId}`;
    try {
      logger.service(SERVICE_NAME, 'deleteHandover', { handoverId });
      logger.api('DELETE', url);

      const response = await api.delete(url);

      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error(`인수인계 삭제 실패: ID=${handoverId}`, error);
      throw error;
    }
  },
};

export default HandoverService;

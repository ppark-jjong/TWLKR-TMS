/**
 * 사용자 관리 관련 API 서비스
 */
import api from './api';
import logger from '../utils/logger';

// 서비스 이름 상수
const SERVICE_NAME = 'UserService';

const UserService = {
  /**
   * 사용자 목록 조회 (관리자 전용)
   * 모든 사용자를 한 번에 조회하도록 페이지 크기를 1000으로 설정
   * @param {Object} params 검색 조건
   * @returns {Promise} 사용자 목록
   */
  getUsers: async (params = {}) => {
    const url = '/users';
    try {
      logger.service(SERVICE_NAME, 'getUsers');

      // 페이지 크기를 1000으로 설정하여 모든 유저를 한 번에 가져옴
      const defaultParams = { limit: 1000, ...params };

      logger.api('GET', url, defaultParams);
      const response = await api.get(url, { params: defaultParams });

      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error('사용자 목록 조회 실패', error);
      throw error; // api 인터셉터에서 처리
    }
  },

  /**
   * 사용자 생성 (관리자 전용)
   * @param {Object} userData 사용자 데이터
   * @returns {Promise} 생성된 사용자 정보
   */
  createUser: async (userData) => {
    const url = '/users';
    try {
      logger.service(SERVICE_NAME, 'createUser');
      logger.api('POST', url);

      const response = await api.post(url, userData);

      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error('사용자 생성 실패', error);
      throw error; // api 인터셉터에서 통합 처리
    }
  },

  /**
   * 사용자 삭제 (관리자 전용)
   * @param {string} userId 사용자 ID
   * @returns {Promise} 삭제 결과
   */
  deleteUser: async (userId) => {
    const url = `/users/${userId}`;
    try {
      logger.service(SERVICE_NAME, 'deleteUser', { userId });
      logger.api('DELETE', url);

      const response = await api.delete(url);

      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error(`사용자 삭제 실패: ID=${userId}`, error);
      throw error; // api 인터셉터에서 통합 처리
    }
  },
};

export default UserService;

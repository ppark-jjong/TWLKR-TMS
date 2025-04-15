/**
 * 사용자 관리 관련 API 서비스 (간소화 버전)
 */
import api from './api';

const UserService = {
  /**
   * 사용자 목록 조회 (관리자 전용)
   * 모든 사용자를 한 번에 조회하도록 페이지 크기를 1000으로 설정
   * @param {Object} params 검색 조건
   * @returns {Promise} 사용자 목록
   */
  getUsers: async (params = {}) => {
    // 페이지 크기를 1000으로 설정하여 모든 유저를 한 번에 가져옴
    const defaultParams = { limit: 1000, ...params };
    const response = await api.get('/users', { params: defaultParams });
    return response.data;
  },
  
  /**
   * 사용자 생성 (관리자 전용)
   * @param {Object} userData 사용자 데이터
   * @returns {Promise} 생성된 사용자 정보
   */
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  
  /**
   * 사용자 삭제 (관리자 전용)
   * @param {string} userId 사용자 ID
   * @returns {Promise} 삭제 결과
   */
  deleteUser: async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  }
};

export default UserService;

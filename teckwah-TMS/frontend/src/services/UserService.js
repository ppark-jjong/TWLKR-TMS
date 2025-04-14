/**
 * 사용자 관리 관련 API 서비스
 */
import api from './api';

const UserService = {
  /**
   * 사용자 목록 조회 (관리자 전용)
   * @param {Object} params 검색 조건
   * @returns {Promise} 사용자 목록
   */
  getUsers: async (params) => {
    const response = await api.get('/users', { params });
    return response.data;
  },
  
  /**
   * 특정 사용자 조회 (관리자 전용)
   * @param {string} userId 사용자 ID
   * @returns {Promise} 사용자 정보
   */
  getUser: async (userId) => {
    const response = await api.get(`/users/${userId}`);
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

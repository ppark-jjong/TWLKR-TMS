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
    try {
      // 페이지 크기를 1000으로 설정하여 모든 유저를 한 번에 가져옴
      const defaultParams = { limit: 1000, ...params };
      
      console.log('사용자 목록 조회 요청:', defaultParams);
      const response = await api.get('/users', { params: defaultParams });
      console.log('사용자 목록 조회 응답:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error);
      throw error; // api 인터셉터에서 처리
    }
  },
  
  /**
   * 사용자 생성 (관리자 전용)
   * @param {Object} userData 사용자 데이터
   * @returns {Promise} 생성된 사용자 정보
   */
  createUser: async (userData) => {
    try {
      console.log('사용자 생성 요청:', userData);
      const response = await api.post('/users', userData);
      console.log('사용자 생성 응답:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('사용자 생성 오류:', error);
      
      // 오류 메시지 상세화
      let errorMessage = '사용자 생성 중 오류가 발생했습니다.';
      
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = '관리자 권한이 필요합니다.';
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.detail || '잘못된 요청입니다. 입력 정보를 확인해주세요.';
        } else {
          errorMessage = error.response.data?.detail || 
                        error.response.data?.message || 
                        `서버 오류가 발생했습니다. (${error.response.status})`;
        }
      }
      
      throw {
        success: false,
        message: errorMessage,
        error_code: error.response?.status || 'UNKNOWN'
      };
    }
  },
  
  /**
   * 사용자 삭제 (관리자 전용)
   * @param {string} userId 사용자 ID
   * @returns {Promise} 삭제 결과
   */
  deleteUser: async (userId) => {
    try {
      console.log(`사용자 삭제 요청: ID=${userId}`);
      const response = await api.delete(`/users/${userId}`);
      console.log('사용자 삭제 응답:', response.data);
      
      return response.data;
    } catch (error) {
      console.error(`사용자 삭제 오류: ID=${userId}`, error);
      
      // 오류 메시지 상세화
      let errorMessage = '사용자 삭제 중 오류가 발생했습니다.';
      
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = '관리자 권한이 필요합니다.';
        } else if (error.response.status === 404) {
          errorMessage = '해당 사용자를 찾을 수 없습니다.';
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.detail || '현재 로그인한 사용자는 삭제할 수 없습니다.';
        } else {
          errorMessage = error.response.data?.detail || 
                        error.response.data?.message || 
                        `서버 오류가 발생했습니다. (${error.response.status})`;
        }
      }
      
      throw {
        success: false,
        message: errorMessage,
        error_code: error.response?.status || 'UNKNOWN'
      };
    }
  }
};

export default UserService;
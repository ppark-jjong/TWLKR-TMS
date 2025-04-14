/**
 * 인증 관련 API 서비스
 */
import api from './api';

const AuthService = {
  /**
   * 로그인 요청
   * @param {string} userId 사용자 ID
   * @param {string} password 비밀번호
   * @returns {Promise} 로그인 결과
   */
  login: async (userId, password) => {
    // HTTP Basic Auth 형식의 Base64 인코딩
    const credentials = btoa(`${userId}:${password}`);
    
    const response = await api.post('/auth/login', null, {
      headers: {
        Authorization: `Basic ${credentials}`
      }
    });
    
    return response.data;
  },
  
  /**
   * 로그아웃 요청
   * @returns {Promise} 로그아웃 결과
   */
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  
  /**
   * 현재 로그인 사용자 정보 조회
   * @returns {Promise} 사용자 정보
   */
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  /**
   * 세션 체크 (로그인 상태 확인)
   * @returns {Promise<boolean>} 로그인 상태
   */
  checkSession: async () => {
    try {
      await api.get('/auth/me');
      return true;
    } catch (error) {
      return false;
    }
  }
};

export default AuthService;

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
    try {
      console.log(`로그인 시도: ${userId}`);
      
      // HTTP Basic Auth 대신 일반 POST 요청으로 변경
      const response = await api.post('/auth/login', {
        username: userId,
        password: password
      });
      
      console.log('로그인 응답:', response);
      
      // 쿠키 확인
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('session_id='));
      console.log('세션 쿠키 존재:', !!sessionCookie);
      
      return response.data;
    } catch (error) {
      console.error('로그인 오류:', error);
      throw error;
    }
  },
  
  /**
   * 로그아웃 요청
   * @returns {Promise} 로그아웃 결과
   */
  logout: async () => {
    try {
      console.log('로그아웃 시도...');
      const response = await api.post('/auth/logout');
      console.log('로그아웃 응답:', response);
      
      // 쿠키 확인
      const cookiesAfter = document.cookie.split(';');
      const sessionCookieAfter = cookiesAfter.find(cookie => cookie.trim().startsWith('session_id='));
      console.log('로그아웃 후 세션 쿠키 존재:', !!sessionCookieAfter);
      
      return response.data;
    } catch (error) {
      console.error('로그아웃 오류:', error);
      throw error;
    }
  },
  
  /**
   * 현재 로그인 사용자 정보 조회
   * @returns {Promise} 사용자 정보
   */
  getCurrentUser: async () => {
    try {
      console.log('현재 사용자 정보 조회 중...');
      const response = await api.get('/auth/me');
      console.log('사용자 정보 응답:', response);
      return response.data;
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
      throw error;  // 이 오류는 상위에서 처리
    }
  },
  
  /**
   * 세션 체크 (로그인 상태 확인)
   * @returns {Promise<boolean>} 로그인 상태
   */
  checkSession: async () => {
    try {
      console.log('세션 상태 확인 중...');
      const response = await api.get('/auth/me');
      console.log('세션 상태 응답:', response);
      return true;
    } catch (error) {
      console.warn('세션 만료 또는 오류:', error);
      return false;
    }
  }
};

export default AuthService;
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
      // 핵심 로그: 로그인 시도
      console.log('[인증] 로그인 시도');
      
      // 백엔드 명명 규칙에 맞춰 요청
      const response = await api.post('/auth/login', {
        username: userId,  // 백엔드 필드명: username
        password: password
      });
      
      // 핵심 로그: 로그인 성공
      console.log('[인증] 로그인 성공');
      
      // 세션 쿠키 확인 로깅 (디버깅 목적)
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('session_id='));
      console.log('[인증] 세션 쿠키 존재:', !!sessionCookie);
      
      return response.data;
    } catch (error) {
      // 핵심 로그: 로그인 실패
      console.error('[인증] 로그인 실패');
      
      // 오류 상태 코드 로깅 (필수 디버깅 정보)
      if (error.response) {
        console.error('[인증] 오류 상태 코드:', error.response.status);
      }
      
      throw error; // 상위에서 처리하도록 전파
    }
  },
  
  /**
   * 로그아웃 요청
   * @returns {Promise} 로그아웃 결과
   */
  logout: async () => {
    try {
      // 핵심 로그: 로그아웃 시도
      console.log('[인증] 로그아웃 시도');
      
      const response = await api.post('/auth/logout');
      
      // 핵심 로그: 로그아웃 성공
      console.log('[인증] 로그아웃 완료');
      
      // 세션 쿠키 삭제 확인
      document.cookie = 'session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      return response.data;
    } catch (error) {
      // 핵심 로그: 로그아웃 실패
      console.error('[인증] 로그아웃 실패');
      throw error;
    }
  },
  
  /**
   * 현재 로그인 사용자 정보 조회
   * @returns {Promise} 사용자 정보
   */
  getCurrentUser: async () => {
    try {
      // API 레이어에서 처리하므로 여기서는 로깅하지 않음
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      // 핵심 오류는 기록
      console.error('[인증] 사용자 정보 조회 실패');
      throw error;
    }
  },
  
  /**
   * 세션 체크 (로그인 상태 확인)
   * @returns {Promise<boolean>} 로그인 상태
   */
  checkSession: async () => {
    try {
      // 호출이 너무 자주 발생하므로 로깅하지 않음
      const response = await api.get('/auth/me');
      return true;
    } catch (error) {
      // 일반적인 세션 만료는 오류가 아니므로 로깅하지 않음
      return false;
    }
  }
};

export default AuthService;
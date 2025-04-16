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
      
      // 오류 정보에 따른 적절한 메시지 구성
      let errorMessage = '로그인 중 오류가 발생했습니다.';
      
      if (error.response) {
        // 서버에서 응답이 왔지만 오류 상태 코드인 경우
        if (error.response.status === 401) {
          errorMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';
        } else {
          errorMessage = error.response.data?.detail || 
                        error.response.data?.message || 
                        `서버 오류가 발생했습니다. (${error.response.status})`;
        }
      } else if (error.request) {
        // 요청은 보냈지만 응답이 없는 경우
        errorMessage = '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.';
      }
      
      // 적절한 오류 객체 반환
      return {
        success: false,
        message: errorMessage
      };
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
      return {
        success: false,
        message: '로그아웃 처리 중 오류가 발생했습니다.'
      };
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
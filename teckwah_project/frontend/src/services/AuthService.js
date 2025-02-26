// frontend/src/services/AuthService.js
import axios from 'axios';

/**
 * 인증 서비스
 */
const AuthService = {
  /**
   * 현재 사용자 정보 가져오기
   * 클라이언트 측에 저장된 사용자 정보를 반환
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('사용자 정보 파싱 오류:', error);
      localStorage.removeItem('user');
      return null;
    }
  },

  /**
   * 사용자 로그인
   * @param {string} user_id - 사용자 ID
   * @param {string} password - 비밀번호
   * @returns {Promise} - 로그인 응답
   */
  login: async (user_id, password) => {
    try {
      console.log('로그인 요청:', user_id);
      // 요청 데이터 구조 로깅
      const requestData = {
        user_id,
        password,
      };
      console.log('로그인 요청 데이터:', requestData);

      // 백엔드 요구사항에 맞는 요청 본문 구조
      const response = await axios.post('/auth/login', {
        user_id,
        password,
      });

      // 응답 로깅 (디버깅용)
      console.log('로그인 응답:', response.data);

      // 응답에서 토큰과 사용자 정보 추출하여 저장
      if (response.data && response.data.token) {
        localStorage.setItem('access_token', response.data.token.access_token);
        localStorage.setItem(
          'refresh_token',
          response.data.token.refresh_token
        );
      } else {
        console.error('로그인 응답에 토큰 정보가 없습니다');
      }

      if (response.data && response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } else {
        console.error('로그인 응답에 사용자 정보가 없습니다');
      }

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  /**
   * 토큰 갱신
   * 서버에 토큰 갱신 요청을 보내고 새 토큰을 받음
   * @param {string} refreshToken - 리프레시 토큰
   * @returns {Promise} - 갱신된 토큰 정보
   */
  refreshToken: async (refreshToken) => {
    try {
      console.log('토큰 갱신 요청');

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post('/auth/refresh', {
        refresh_token: refreshToken,
      });

      // 새 토큰 저장
      if (response.data && response.data.token) {
        localStorage.setItem('access_token', response.data.token.access_token);
        if (response.data.token.refresh_token) {
          localStorage.setItem(
            'refresh_token',
            response.data.token.refresh_token
          );
        }
      }

      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  },

  /**
   * 로그아웃
   * 서버에 로그아웃 요청을 보내고 클라이언트 측 인증 데이터 삭제
   */
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await axios.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      AuthService.clearAuthData();
    }
  },

  /**
   * 인증 데이터 초기화
   * 클라이언트 측에 저장된 사용자 정보 삭제
   */
  clearAuthData: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};

export default AuthService;

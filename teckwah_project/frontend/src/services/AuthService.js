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
      // 백엔드 요구사항에 맞는 요청 본문 구조
      const response = await axios.post('/auth/login', {
        user_id,
        password,
      });

      // 응답에서 토큰과 사용자 정보 추출하여 저장
      if (response.data && response.data.token) {
        localStorage.setItem('access_token', response.data.token.access_token);
        localStorage.setItem(
          'refresh_token',
          response.data.token.refresh_token
        );
      }

      if (response.data && response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
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
   */
  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
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
      AuthService.clearAuthData();
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
      await axios.post('/auth/logout', { refresh_token: refreshToken });
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

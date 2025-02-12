// frontend/src/services/AuthService.js
import axios from 'axios';

/**
 * 인증 관련 API 호출을 담당하는 서비스
 */
class AuthService {
  /**
   * 로그인 요청
   * @param {string} userId - 사용자 ID
   * @param {string} password - 비밀번호
   * @returns {Promise<Object>} 로그인 응답 데이터 (토큰 및 사용자 정보)
   */
  async login(userId, password) {
    try {
      const response = await axios.post('/auth/login', {
        user_id: userId,
        user_password: password
      });
      
      if (response.data.token) {
        localStorage.setItem('access_token', response.data.token.access_token);
        localStorage.setItem('refresh_token', response.data.token.refresh_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || '로그인 중 오류가 발생했습니다');
    }
  }

  /**
   * 토큰 갱신 요청
   * @returns {Promise<Object>} 새로운 액세스 토큰
   */
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      const response = await axios.post('/auth/refresh', {
        refresh_token: refreshToken
      });
      
      if (response.data.token) {
        localStorage.setItem('access_token', response.data.token.access_token);
        if (response.data.token.refresh_token) {
          localStorage.setItem('refresh_token', response.data.token.refresh_token);
        }
      }
      
      return response.data;
    } catch (error) {
      this.logout();
      throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
    }
  }

  /**
   * 로그아웃 요청
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      await axios.post('/auth/logout', {
        refresh_token: refreshToken
      });
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  /**
   * 현재 로그인한 사용자 정보 반환
   * @returns {Object|null} 사용자 정보
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * 액세스 토큰 반환
   * @returns {string|null} 액세스 토큰
   */
  getAccessToken() {
    return localStorage.getItem('access_token');
  }
}

export default new AuthService();
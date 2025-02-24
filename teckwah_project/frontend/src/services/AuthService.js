// frontend/src/services/AuthService.js
import axios from '../utils/AxiosConfig';

/**
 * 인증 서비스
 */
const AuthService = {
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
    const response = await axios.post('/auth/login', { user_id, password });
    return response.data;
  },

  async refreshToken() {
    try {
      const response = await axios.post(
        '/auth/refresh',
        {},
        {
          withCredentials: true, // 쿠키 전송을 위해 필요
        }
      );
      return response.data;
    } catch (error) {
      this.clearAuthData();
      throw error;
    }
  },

  async logout() {
    try {
      await axios.post(
        '/auth/logout',
        {},
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthData();
    }
  },

  clearAuthData() {
    localStorage.removeItem('user');
  },
};

export default AuthService;

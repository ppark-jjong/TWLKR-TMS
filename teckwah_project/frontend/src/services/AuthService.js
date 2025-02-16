// frontend/src/services/AuthService.js
import axios from 'axios';
import ErrorHandler from '../utils/ErrorHandler';

class AuthService {
  /**
   * 로그인 요청
   * @param {string} userId - 사용자 ID
   * @param {string} password - 비밀번호
   * @returns {Promise<Object>} 로그인 응답 데이터
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
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token.access_token}`;
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 토큰 갱신 요청
   * @param {string} refreshToken - 리프레시 토큰
   * @returns {Promise<Object>} 새로운 토큰 데이터
   */
  async refreshToken(refreshToken) {
    try {
      const response = await axios.post('/auth/refresh', {
        refresh_token: refreshToken
      });
      
      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        
        return response.data;
      }
      throw new Error('토큰 갱신에 실패했습니다');
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      // 에러 처리는 인터셉터에서 수행
      throw error;
    }
  }

  /**
   * 로그아웃
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await axios.post('/auth/logout', {
          refresh_token: refreshToken
        });
      }
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
    }
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getAccessToken() {
    return localStorage.getItem('access_token');
  }
}

export default new AuthService();
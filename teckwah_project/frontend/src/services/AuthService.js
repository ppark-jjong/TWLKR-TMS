// frontend/src/services/AuthService.js
import axios from 'axios';

class AuthService {
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      this.logout();
      return null;
    }
  }

  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  async login(userId, password) {
    try {
      const response = await axios.post('/auth/login', {
        user_id: userId,
        user_password: password,
      });

      // 로그인 성공 시 토큰 및 사용자 정보 저장
      const { token, user } = response.data;
      localStorage.setItem('access_token', token.access_token);
      localStorage.setItem('refresh_token', token.refresh_token);
      localStorage.setItem('user', JSON.stringify(user));

      // axios 기본 헤더 설정
      axios.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${token.access_token}`;

      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error);
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post('/auth/refresh', {
        refresh_token: refreshToken,
      });

      if (response.data.token) {
        localStorage.setItem('access_token', response.data.token.access_token);
        if (response.data.token.refresh_token) {
          localStorage.setItem(
            'refresh_token',
            response.data.token.refresh_token
          );
        }

        axios.defaults.headers.common[
          'Authorization'
        ] = `Bearer ${response.data.token.access_token}`;
      }

      return response.data.token;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await axios.post('/auth/logout', {
          refresh_token: refreshToken,
        });
      }
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
    }
  }
}

export default new AuthService();

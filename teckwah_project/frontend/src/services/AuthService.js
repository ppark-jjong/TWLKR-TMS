// frontend/src/services/AuthService.js
import axios from 'axios';
import jwt_decode from 'jwt-decode';

class AuthService {
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      this.clearAuthData();
      return null;
    }
  }

  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  setTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  }

  clearAuthData() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  }

  isTokenExpired(token) {
    if (!token) return true;
    try {
      const decoded = jwt_decode(token);
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  async login(userId, password) {
    try {
      const response = await axios.post('/auth/login', {
        user_id: userId,
        user_password: password,
      });

      const { token, user } = response.data;
      this.setTokens(token.access_token, token.refresh_token);
      localStorage.setItem('user', JSON.stringify(user));

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('아이디 또는 비밀번호가 잘못되었습니다');
      }
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post('/auth/refresh', {
        refresh_token: refreshToken,
      });

      if (response.data.token) {
        this.setTokens(
          response.data.token.access_token,
          response.data.token.refresh_token
        );
        return response.data.token;
      }
      throw new Error('토큰 갱신 실패');
    } catch (error) {
      this.clearAuthData();
      throw error;
    }
  }

  async logout() {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await axios.post('/auth/logout', {
          refresh_token: refreshToken,
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthData();
    }
  }
}

export default new AuthService();

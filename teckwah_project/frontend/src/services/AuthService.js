// frontend/src/services/AuthService.js
import axios from 'axios';

class AuthService {
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      localStorage.removeItem('user');
      return null;
    }
  }

  async login(userId, password) {
    try {
      const response = await axios.post(
        '/auth/login',
        {
          user_id: userId,
          user_password: password,
        },
        {
          withCredentials: true, // 쿠키를 받기 위해 필요
        }
      );

      // 사용자 정보만 localStorage에 저장
      localStorage.setItem('user', JSON.stringify(response.data.user));

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('아이디 또는 비밀번호가 잘못되었습니다');
      }
      throw error;
    }
  }

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
  }

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
  }

  clearAuthData() {
    localStorage.removeItem('user');
  }
}

export default new AuthService();

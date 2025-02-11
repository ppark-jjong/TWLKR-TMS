// frontend/src/services/authService.js

/**
 * 인증 관련 API 호출 서비스
 * @module AuthService
 */

import api from './mainApi';

/** @typedef {Object} LoginCredentials
 * @property {string} user_id - 사용자 ID
 * @property {string} password - 비밀번호
 */

/** @typedef {Object} LoginResponse
 * @property {string} access_token - JWT 액세스 토큰
 * @property {string} refresh_token - JWT 리프레시 토큰
 * @property {Object} user - 사용자 정보
 */

const AuthService = {
  /**
   * 로그인 요청
   * @param {LoginCredentials} credentials
   * @returns {Promise<LoginResponse>}
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const { access_token, refresh_token, user } = response.data;
    localStorage.setItem('accessToken', access_token);
    localStorage.setItem('refreshToken', refresh_token);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  },

  /**
   * 로그아웃
   * @returns {Promise<void>}
   */
  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    await api.post('/auth/logout', { refresh_token: refreshToken });
    localStorage.clear();
  },

  /**
   * 현재 사용자 정보 조회
   * @returns {Promise<Object>}
   */
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export default AuthService;
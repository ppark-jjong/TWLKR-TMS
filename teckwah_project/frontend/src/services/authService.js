// src/services/authService.js
import api from "./api";

export const authService = {
  /**
   * 로그인 요청
   * @param {string} userId - 사용자 ID
   * @param {string} password - 비밀번호
   * @returns {Promise<Object>} 로그인 응답 데이터
   */
  login: async (userId, password) => {
    const { data } = await api.post("/auth/login", {
      user_id: userId,
      password,
    });
    return data;
  },
    /**
   * 리프레시 토큰 요청
   * @param {string} refreshToken - 리프레시 토큰
   * @returns {Promise<Object>} 리프레시 토큰 응답 데이터
   */
    refreshToken: async (refreshToken) => {
      const { data } = await api.post("/auth/refresh", {
          refresh_token: refreshToken,
      });
      return data;
  },

  /**
   * 로그아웃 요청
   * @param {string} refreshToken - 리프레시 토큰
   * @returns {Promise<void>}
   */
  logout: async (refreshToken) => {
    await api.post("/auth/logout", { refresh_token: refreshToken });
  },
};

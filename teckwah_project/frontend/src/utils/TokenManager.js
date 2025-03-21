// src/utils/TokenManager.js (수정)
/**
 * 간소화된 토큰 관리 유틸리티
 * 액세스 토큰 및 리프레시 토큰의 저장, 접근, 삭제 기능 제공
 */
class TokenManager {
  /**
   * 액세스 토큰 저장
   * @param {string} token - JWT 액세스 토큰
   */
  static setAccessToken(token) {
    localStorage.setItem('access_token', token);
  }

  /**
   * 액세스 토큰 가져오기
   * @returns {string|null} - 저장된 액세스 토큰 또는 null
   */
  static getAccessToken() {
    return localStorage.getItem('access_token');
  }

  /**
   * 리프레시 토큰 저장
   * @param {string} token - JWT 리프레시 토큰
   */
  static setRefreshToken(token) {
    localStorage.setItem('refresh_token', token);
  }

  /**
   * 리프레시 토큰 가져오기
   * @returns {string|null} - 저장된 리프레시 토큰 또는 null
   */
  static getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  /**
   * 사용자 정보 저장
   * @param {Object} user - 사용자 정보 객체
   */
  static setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * 사용자 정보 가져오기
   * @returns {Object|null} - 저장된 사용자 정보 또는 null
   */
  static getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * 인증 정보 모두 제거
   */
  static clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  /**
   * 리턴 URL 저장 (로그인 후 리디렉션용)
   * @param {string} url - 리디렉션할 URL
   */
  static setReturnUrl(url) {
    localStorage.setItem('returnUrl', url);
  }

  /**
   * 저장된 리턴 URL 가져오기
   * @returns {string|null} - 저장된 리턴 URL 또는 null
   */
  static getReturnUrl() {
    return localStorage.getItem('returnUrl');
  }

  /**
   * 리턴 URL 제거
   */
  static clearReturnUrl() {
    localStorage.removeItem('returnUrl');
  }
}

export default TokenManager;

// src/utils/TokenManager.js
/**
 * 토큰 관리 유틸리티
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
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('사용자 정보 저장 실패:', error);
    }
  }

  /**
   * 사용자 정보 가져오기
   * @returns {Object|null} - 저장된 사용자 정보 또는 null
   */
  static getUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('사용자 정보 파싱 오류:', error);
      return null;
    }
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
   * 액세스 토큰의 만료 여부 확인
   *
   * 주의: 이 메서드는 클라이언트 측에서만 사용 가능한 간단한 체크로,
   * 토큰 유효성에 대한 최종 확인은 서버에서 수행해야 합니다.
   *
   * @returns {boolean} - 토큰 만료 여부 (true: 만료됨)
   */
  static isAccessTokenExpired() {
    const token = this.getAccessToken();
    if (!token) return true;

    try {
      // JWT의 페이로드 부분 디코딩
      const payload = JSON.parse(atob(token.split('.')[1]));

      // exp 클레임 확인 (토큰 만료 시간, UNIX 타임스탬프)
      if (!payload.exp) return true;

      // 현재 시간과 비교 (10초 여유 추가)
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime + 10;
    } catch (error) {
      console.error('토큰 만료 여부 확인 실패:', error);
      return true; // 안전을 위해 만료된 것으로 처리
    }
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

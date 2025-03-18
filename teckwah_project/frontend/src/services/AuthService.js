// src/services/AuthService.js
import axios from 'axios';
import TokenManager from '../utils/TokenManager';
import message from '../utils/message';
import { MessageKeys } from '../utils/message';

/**
 * 인증 서비스
 * 로그인, 토큰 관리, 세션 확인 등 인증 관련 기능 제공
 */
class AuthService {
  /**
   * 현재 사용자 정보 가져오기
   * @returns {Object|null} - 사용자 정보 또는 null
   */
  static getCurrentUser() {
    return TokenManager.getUser();
  }

  /**
   * 사용자 로그인
   * @param {string} user_id - 사용자 ID
   * @param {string} password - 비밀번호
   * @returns {Promise} - 로그인 응답
   */
  static async login(user_id, password) {
    try {
      console.log('로그인 요청:', user_id);

      // 백엔드 요구사항에 맞는 요청 본문 구조
      const response = await axios.post('/auth/login', {
        user_id,
        password,
      });

      // 응답 로깅 (디버깅용)
      console.log('로그인 응답:', response.data);

      // 응답 유효성 검증
      if (!response.data || !response.data.success) {
        throw new Error('로그인 응답이 올바르지 않습니다');
      }

      // 토큰 및 사용자 정보 저장
      if (response.data.data?.token) {
        const { access_token, refresh_token } = response.data.data.token;
        TokenManager.setAccessToken(access_token);
        TokenManager.setRefreshToken(refresh_token);
      } else {
        throw new Error('로그인 응답에 토큰 정보가 없습니다');
      }

      if (response.data.data?.user) {
        TokenManager.setUser(response.data.data.user);
      } else {
        throw new Error('로그인 응답에 사용자 정보가 없습니다');
      }

      return response.data.data;
    } catch (error) {
      console.error('로그인 오류:', error);
      // 로그인 실패 시 로컬 인증 데이터 정리
      AuthService.clearAuthData();
      throw error;
    }
  }

  /**
   * 토큰 갱신
   * @param {string} refreshToken - 리프레시 토큰
   * @returns {Promise} - 갱신된 토큰 정보
   */
  static async refreshToken(refreshToken = null) {
    try {
      console.log('토큰 갱신 요청');

      // 파라미터가 없으면 저장된 리프레시 토큰 사용
      const tokenToUse = refreshToken || TokenManager.getRefreshToken();

      if (!tokenToUse) {
        throw new Error('갱신할 리프레시 토큰이 없습니다');
      }

      const response = await axios.post('/auth/refresh', {
        refresh_token: tokenToUse,
      });

      // 응답 유효성 검증
      if (!response.data || !response.data.success) {
        throw new Error('토큰 갱신 응답이 올바르지 않습니다');
      }

      const { access_token, refresh_token } = response.data.data?.token || {};
      if (!access_token) {
        throw new Error('토큰 갱신 응답에 액세스 토큰이 없습니다');
      }

      // 새 토큰 저장
      TokenManager.setAccessToken(access_token);
      if (refresh_token) {
        TokenManager.setRefreshToken(refresh_token);
      }

      // 사용자 정보 갱신 (존재하는 경우)
      if (response.data.data?.user) {
        TokenManager.setUser(response.data.data.user);
      }

      console.log('토큰 갱신 성공');
      return response.data.data;
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      // 갱신 실패 시 로컬 인증 데이터 정리
      this.clearAuthData();
      throw error;
    }
  }

  /**
   * 세션 유효성 검증
   * @returns {Promise<boolean>} - 세션 유효 여부
   */
  static async checkSession() {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        return false;
      }

      // 클라이언트 측 토큰 만료 확인 (빠른 검증)
      if (TokenManager.isAccessTokenExpired()) {
        console.log('토큰이 만료되었습니다. 갱신 시도 필요');

        // 리프레시 토큰으로 갱신 시도
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          try {
            await this.refreshToken(refreshToken);
            return true; // 토큰 갱신 성공
          } catch (refreshError) {
            console.error('자동 토큰 갱신 실패:', refreshError);
            return false;
          }
        }
        return false;
      }

      // 서버 측 세션 검증
      const response = await axios.get('/auth/check-session');

      // 응답 유효성 검증
      if (!response.data || !response.data.success) {
        return false;
      }

      // 사용자 정보 업데이트 (있는 경우)
      if (response.data.data?.user) {
        TokenManager.setUser(response.data.data.user);
      }

      return true;
    } catch (error) {
      console.error('세션 검증 실패:', error);
      return false;
    }
  }

  /**
   * 로그아웃
   * @returns {Promise} - 로그아웃 응답
   */
  static async logout() {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (refreshToken) {
        await axios.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
    } finally {
      AuthService.clearAuthData();
    }
  }

  /**
   * 인증 데이터 초기화
   */
  static clearAuthData() {
    TokenManager.clearTokens();

    // 사용자가 로그아웃했음을 다른 탭에 알림
    window.dispatchEvent(new Event('auth-status-change'));
  }

  /**
   * 권한 확인
   * @param {string} role - 확인할 권한
   * @returns {boolean} - 권한 보유 여부
   */
  static hasRole(role) {
    const user = this.getCurrentUser();
    return user && user.user_role === role;
  }

  /**
   * 관리자 확인
   * @returns {boolean} - 관리자 여부
   */
  static isAdmin() {
    return this.hasRole('ADMIN');
  }

  /**
   * 로그인 후 리디렉션 URL 저장
   * @param {string} url - 리디렉션할 URL
   */
  static saveReturnUrl(url) {
    TokenManager.setReturnUrl(url);
  }

  /**
   * 로그인 후 리디렉션 URL 가져오기
   * @returns {string} - 저장된 URL 또는 기본 URL
   */
  static getReturnUrl() {
    const returnUrl = TokenManager.getReturnUrl();
    // returnUrl이 없으면 사용자 권한에 따른 기본 URL 반환
    if (!returnUrl) {
      const user = this.getCurrentUser();
      return user && user.user_role === 'ADMIN' ? '/admin' : '/dashboard';
    }
    return returnUrl;
  }

  /**
   * 리디렉션 URL 정리
   */
  static clearReturnUrl() {
    TokenManager.clearReturnUrl();
  }

  /**
   * 자동 토큰 갱신 타이머 설정
   * @param {Function} onRefreshSuccess - 갱신 성공 시 콜백
   * @param {Function} onRefreshError - 갱신 실패 시 콜백
   * @returns {number} - 타이머 ID
   */
  static setupRefreshTimer(onRefreshSuccess, onRefreshError) {
    // 토큰 만료 시간 계산
    const token = TokenManager.getAccessToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // UNIX 타임스탬프를 밀리초로 변환
      const currentTime = Date.now();
      const timeRemaining = expiryTime - currentTime;

      // 만료 10분 전에 갱신 시작 (최소 1초)
      const refreshTime = Math.max(timeRemaining - 10 * 60 * 1000, 1000);

      console.log(`토큰 갱신 타이머 설정: ${refreshTime / 1000}초 후 갱신`);

      return setTimeout(async () => {
        try {
          const result = await this.refreshToken();
          if (onRefreshSuccess) {
            onRefreshSuccess(result);
          }

          // 갱신 성공 시 다시 타이머 설정
          this.setupRefreshTimer(onRefreshSuccess, onRefreshError);
        } catch (error) {
          console.error('자동 토큰 갱신 실패:', error);
          if (onRefreshError) {
            onRefreshError(error);
          }
        }
      }, refreshTime);
    } catch (error) {
      console.error('토큰 갱신 타이머 설정 실패:', error);
      return null;
    }
  }

  /**
   * 타이머 정리
   * @param {number} timerId - 타이머 ID
   */
  static clearRefreshTimer(timerId) {
    if (timerId) {
      clearTimeout(timerId);
    }
  }
}

export default AuthService;

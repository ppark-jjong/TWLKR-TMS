// src/services/AuthService.js
import ApiService from './ApiService';
import TokenManager from '../utils/TokenManager';
import message from '../utils/MessageService';
import { MessageKeys } from '../utils/Constants';
import Logger from '../utils/Logger';

const logger = Logger.getLogger('AuthService');

/**
 * 인증 서비스
 * 로그인, 토큰 관리, 세션 확인 등을 담당
 */
class AuthService {
  constructor() {
    this.refreshTimers = new Map(); // 자동 갱신 타이머 관리
  }

  /**
   * 현재 사용자 정보 가져오기
   */
  getCurrentUser() {
    return TokenManager.getUser();
  }

  /**
   * 사용자 로그인
   */
  async login(userId, password) {
    try {
      logger.info('로그인 요청:', userId);

      const response = await ApiService.login(userId, password);

      if (response && response.token && response.user) {
        // 토큰 및 사용자 정보 저장
        TokenManager.setAccessToken(response.token.access_token);
        TokenManager.setRefreshToken(response.token.refresh_token);
        TokenManager.setUser(response.user);

        message.success('로그인되었습니다', MessageKeys.AUTH.LOGIN);
        return response;
      } else {
        throw new Error('로그인 응답 형식이 올바르지 않습니다');
      }
    } catch (error) {
      logger.error('로그인 오류:', error);

      // 로그인 실패 시 로컬 인증 데이터 정리
      this.clearAuthData();

      // 에러 메시지 처리
      message.error(
        error.message || '로그인에 실패했습니다',
        MessageKeys.AUTH.LOGIN
      );

      throw error;
    }
  }

  /**
   * 토큰 갱신
   */
  async refreshToken(refreshToken = null) {
    try {
      logger.info('토큰 갱신 요청');

      const response = await ApiService.refreshToken(refreshToken);

      if (response && response.token) {
        // 새 토큰 저장
        TokenManager.setAccessToken(response.token.access_token);
        if (response.token.refresh_token) {
          TokenManager.setRefreshToken(response.token.refresh_token);
        }

        // 사용자 정보 갱신 (존재하는 경우)
        if (response.user) {
          TokenManager.setUser(response.user);
        }

        // 갱신 이벤트 발생
        window.dispatchEvent(
          new CustomEvent('token-refreshed', { detail: { success: true } })
        );

        return response;
      } else {
        throw new Error('토큰 갱신 응답 형식이 올바르지 않습니다');
      }
    } catch (error) {
      logger.error('토큰 갱신 실패:', error);

      // 갱신 실패 시 로컬 인증 데이터 정리
      if (error.response && error.response.status === 401) {
        this.clearAuthData();

        // 갱신 실패 이벤트 발생
        window.dispatchEvent(
          new CustomEvent('token-refresh-failed', {
            detail: { error: error.message },
          })
        );
      }

      throw error;
    }
  }

  /**
   * 세션 유효성 검증
   */
  async checkSession() {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        logger.warn('액세스 토큰이 없어 세션 검증 실패');
        return false;
      }

      const response = await ApiService.checkSession();

      // 사용자 정보 업데이트 (있는 경우)
      if (response && response.user) {
        TokenManager.setUser(response.user);
      }

      logger.info('세션 검증 성공');
      return true;
    } catch (error) {
      logger.error('세션 검증 실패:', error);

      // 인증 에러(401) 발생 시 토큰 정리
      if (error.response?.status === 401) {
        this.clearAuthData();
      }

      return false;
    }
  }

  /**
   * 로그아웃
   */
  async logout() {
    try {
      // 서버에 로그아웃 요청
      await ApiService.logout();
      logger.info('서버에 로그아웃 요청 성공');

      // 모든 자동 갱신 타이머 제거
      this.clearAllRefreshTimers();

      // 로컬 인증 데이터 정리
      this.clearAuthData();

      // 로그아웃 이벤트 발생
      window.dispatchEvent(new CustomEvent('auth-logout'));

      return true;
    } catch (error) {
      logger.warn('서버 로그아웃 요청 실패:', error);

      // 실패해도 로컬 데이터는 정리
      this.clearAuthData();
      this.clearAllRefreshTimers();

      // 로그아웃 이벤트 발생
      window.dispatchEvent(new CustomEvent('auth-logout'));

      return false;
    }
  }

  /**
   * 인증 데이터 초기화
   */
  clearAuthData() {
    TokenManager.clearTokens();
  }

  /**
   * 자동 토큰 갱신 타이머 설정
   */
  setupRefreshTimer(id, onSuccess, onError) {
    // 기존 타이머가 있으면 제거
    if (this.refreshTimers.has(id)) {
      this.clearRefreshTimer(id);
    }

    // 액세스 토큰 만료 시간 계산
    let expiryTime = 0;
    try {
      const token = TokenManager.getAccessToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp) {
          expiryTime = payload.exp * 1000; // 초 -> 밀리초 변환
        }
      }
    } catch (error) {
      logger.error('토큰 만료 시간 파싱 오류:', error);
    }

    // 현재 시간 기준 남은 시간 계산
    const now = Date.now();
    let timeUntilExpiry = Math.max(0, expiryTime - now);

    // 갱신 여유 시간 (만료 5분 전)
    const refreshBuffer = 5 * 60 * 1000; // 5분

    // 남은 시간이 5분 이하면 즉시 갱신, 아니면 만료 5분 전에 갱신
    let refreshDelay =
      timeUntilExpiry > refreshBuffer ? timeUntilExpiry - refreshBuffer : 0;

    logger.debug(
      `토큰 자동 갱신 타이머 설정: ${Math.round(refreshDelay / 1000)}초 후 갱신`
    );

    // 타이머 설정
    const timerId = setTimeout(async () => {
      try {
        const result = await this.refreshToken();

        if (onSuccess) {
          onSuccess(result);
        }

        // 갱신 성공 시 타이머 재설정
        this.setupRefreshTimer(id, onSuccess, onError);
      } catch (error) {
        logger.error('자동 토큰 갱신 실패:', error);

        if (onError) {
          onError(error);
        }
      }
    }, refreshDelay);

    // 타이머 관리 맵에 저장
    this.refreshTimers.set(id, timerId);

    return id;
  }

  /**
   * 특정 자동 갱신 타이머 제거
   */
  clearRefreshTimer(id) {
    if (this.refreshTimers.has(id)) {
      clearTimeout(this.refreshTimers.get(id));
      this.refreshTimers.delete(id);
    }
  }

  /**
   * 모든 자동 갱신 타이머 제거
   */
  clearAllRefreshTimers() {
    this.refreshTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this.refreshTimers.clear();
  }

  /**
   * 관리자 권한 확인
   */
  isAdmin() {
    const user = this.getCurrentUser();
    return user?.user_role === 'ADMIN';
  }

  /**
   * 권한 검증
   */
  verifyPermission(requiredRole) {
    const user = this.getCurrentUser();

    if (!user) return false;

    if (requiredRole === 'ADMIN') {
      return user.user_role === 'ADMIN';
    }

    return true; // USER 권한은 모든 인증된 사용자가 가짐
  }

  /**
   * 리턴 URL 관리
   */
  getReturnUrl() {
    return TokenManager.getReturnUrl();
  }

  clearReturnUrl() {
    TokenManager.clearReturnUrl();
  }
}

export default new AuthService();

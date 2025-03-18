// src/services/AuthService.js
import axios from 'axios';
import TokenManager from '../utils/TokenManager';
import message from '../utils/message';
import { MessageKeys, MessageTemplates } from '../utils/message';
import ErrorHandler from '../utils/ErrorHandler';
import { useLogger } from '../utils/LogUtils';

/**
 * 인증 서비스 클래스
 * 로그인, 토큰 관리, 세션 확인 등 인증 관련 기능 제공
 */
class AuthService {
  constructor() {
    this.logger = useLogger('AuthService');
    this.refreshTimers = new Map(); // 여러 타이머 관리를 위한 맵
  }

  /**
   * 현재 사용자 정보 가져오기
   * @returns {Object|null} - 사용자 정보 또는 null
   */
  getCurrentUser() {
    return TokenManager.getUser();
  }

  /**
   * 사용자 로그인
   * @param {string} user_id - 사용자 ID
   * @param {string} password - 비밀번호
   * @returns {Promise<Object>} - 로그인 응답
   */
  async login(user_id, password) {
    try {
      this.logger.info('로그인 요청:', user_id);

      // 백엔드 요구사항에 맞는 요청 본문 구조
      const response = await axios.post('/auth/login', {
        user_id,
        password,
      });

      // 응답 로깅 (디버깅용)
      this.logger.debug('로그인 응답:', response.data);

      // 응답 유효성 검증
      if (!response.data || !response.data.success) {
        throw new Error('로그인 응답이 올바르지 않습니다');
      }

      // 토큰 및 사용자 정보 저장
      if (response.data.data?.token) {
        const { access_token, refresh_token } = response.data.data.token;
        TokenManager.setAccessToken(access_token);
        TokenManager.setRefreshToken(refresh_token);

        // 토큰 만료 시간 추출
        try {
          const payload = JSON.parse(atob(access_token.split('.')[1]));
          const expiryTime = payload.exp * 1000; // UNIX 타임스탬프를 밀리초로 변환
          this.logger.debug(
            '토큰 만료 시간:',
            new Date(expiryTime).toLocaleString()
          );
        } catch (error) {
          this.logger.warn('토큰 만료 시간 추출 실패:', error);
        }
      } else {
        throw new Error('로그인 응답에 토큰 정보가 없습니다');
      }

      if (response.data.data?.user) {
        TokenManager.setUser(response.data.data.user);

        // 사용자 권한 저장
        const userRole = response.data.data.user.user_role || 'USER';
        TokenManager.setUserRole(userRole);

        this.logger.info('사용자 로그인 성공:', {
          user_id: response.data.data.user.user_id,
          role: userRole,
        });
      } else {
        throw new Error('로그인 응답에 사용자 정보가 없습니다');
      }

      // 자동 갱신 타이머 설정
      this.setupRefreshTimer('default');

      // 브라우저 탭 간 동기화를 위한 이벤트 발생
      window.dispatchEvent(new Event('auth-status-change'));

      return response.data.data;
    } catch (error) {
      this.logger.error('로그인 오류:', error);

      // 로그인 실패 시 로컬 인증 데이터 정리
      this.clearAuthData();

      // 에러 객체에 구체적인 정보 추가
      error.authError = true;
      error.loginFailed = true;

      throw error;
    }
  }

  /**
   * 토큰 갱신
   * @param {string} refreshToken - 리프레시 토큰
   * @returns {Promise<Object>} - 갱신된 토큰 정보
   */
  async refreshToken(refreshToken = null) {
    try {
      this.logger.info('토큰 갱신 요청');

      // 파라미터가 없으면 저장된 리프레시 토큰 사용
      const tokenToUse = refreshToken || TokenManager.getRefreshToken();

      if (!tokenToUse) {
        throw new Error('갱신할 리프레시 토큰이 없습니다');
      }

      const response = await axios.post('/auth/refresh', {
        refresh_token: tokenToUse,
      });

      // 응답 로깅 (디버깅용)
      this.logger.debug('토큰 갱신 응답:', response.data);

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
        // 사용자 권한 저장/갱신
        const userRole = response.data.data.user.user_role || 'USER';
        TokenManager.setUserRole(userRole);
      }

      this.logger.info('토큰 갱신 성공');

      // 브라우저 탭 간 동기화를 위한 이벤트 발생
      window.dispatchEvent(new Event('auth-status-change'));

      return response.data.data;
    } catch (error) {
      this.logger.error('토큰 갱신 실패:', error);

      // 갱신 실패 시 로컬 인증 데이터 정리
      this.clearAuthData();

      // 에러 객체에 구체적인 정보 추가
      error.authError = true;
      error.refreshFailed = true;

      throw error;
    }
  }

  /**
   * 세션 유효성 검증
   * @returns {Promise<boolean>} - 세션 유효 여부
   */
  async checkSession() {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        this.logger.warn('액세스 토큰이 없어 세션 검증 실패');
        return false;
      }

      // 클라이언트 측 토큰 만료 확인 (빠른 검증)
      if (TokenManager.isAccessTokenExpired()) {
        this.logger.info('토큰이 만료되었습니다. 갱신 시도 필요');

        // 리프레시 토큰으로 갱신 시도
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          try {
            await this.refreshToken(refreshToken);
            return true; // 토큰 갱신 성공
          } catch (refreshError) {
            this.logger.error('자동 토큰 갱신 실패:', refreshError);
            return false;
          }
        }
        return false;
      }

      // 서버 측 세션 검증
      const response = await axios.get('/auth/check-session');

      // 응답 유효성 검증
      if (!response.data || !response.data.success) {
        this.logger.warn('서버 세션 검증 실패:', response.data);
        return false;
      }

      // 사용자 정보 업데이트 (있는 경우)
      if (response.data.data?.user) {
        TokenManager.setUser(response.data.data.user);
        // 사용자 권한 저장/갱신
        const userRole = response.data.data.user.user_role || 'USER';
        TokenManager.setUserRole(userRole);
      }

      this.logger.info('세션 검증 성공');
      return true;
    } catch (error) {
      this.logger.error('세션 검증 실패:', error);

      // 인증 에러(401) 발생 시 토큰 정리
      if (error.response?.status === 401) {
        this.clearAuthData();
      }

      return false;
    }
  }

  /**
   * 로그아웃
   * @returns {Promise<void>} - 로그아웃 처리 결과
   */
  async logout() {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (refreshToken) {
        // 서버에 로그아웃 요청
        await axios.post('/auth/logout', { refresh_token: refreshToken });
        this.logger.info('서버에 로그아웃 요청 성공');
      }
    } catch (error) {
      this.logger.warn('서버 로그아웃 요청 실패:', error);
      // 로그아웃 실패 시에도 클라이언트 측에서는 세션 정리 진행
    } finally {
      // 토큰 갱신 타이머 취소
      this.clearAllRefreshTimers();

      // 로컬 인증 데이터 정리
      this.clearAuthData();

      // 브라우저 탭 간 동기화를 위한 이벤트 발생
      window.dispatchEvent(new Event('auth-status-change'));
    }
  }

  /**
   * 인증 데이터 초기화
   */
  clearAuthData() {
    TokenManager.clearTokens();
    // 토큰 갱신 타이머 취소
    this.clearAllRefreshTimers();
  }

  /**
   * 권한 확인
   * @param {string} role - 확인할 권한
   * @returns {boolean} - 권한 보유 여부
   */
  hasRole(role) {
    const userRole = TokenManager.getUserRole();
    return userRole === role;
  }

  /**
   * 관리자 확인
   * @returns {boolean} - 관리자 여부
   */
  isAdmin() {
    return this.hasRole('ADMIN');
  }

  /**
   * 로그인 후 리디렉션 URL 저장
   * @param {string} url - 리디렉션할 URL
   */
  saveReturnUrl(url) {
    TokenManager.setReturnUrl(url);
  }

  /**
   * 로그인 후 리디렉션 URL 가져오기
   * @returns {string} - 저장된 URL 또는 기본 URL
   */
  getReturnUrl() {
    const returnUrl = TokenManager.getReturnUrl();
    // returnUrl이 없으면 사용자 권한에 따른 기본 URL 반환
    if (!returnUrl) {
      const userRole = TokenManager.getUserRole();
      return userRole === 'ADMIN' ? '/admin' : '/dashboard';
    }
    return returnUrl;
  }

  /**
   * 리디렉션 URL 정리
   */
  clearReturnUrl() {
    TokenManager.clearReturnUrl();
  }

  /**
   * 자동 토큰 갱신 타이머 설정
   * @param {string} timerId - 타이머 식별자
   * @param {Function} onSuccess - 갱신 성공 시 콜백
   * @param {Function} onError - 갱신 실패 시 콜백
   * @returns {number} - 타이머 ID
   */
  setupRefreshTimer(timerId = 'default', onSuccess = null, onError = null) {
    // 기존 타이머가 있으면 제거
    if (this.refreshTimers.has(timerId)) {
      this.clearRefreshTimer(timerId);
    }

    // 토큰 만료 시간 계산
    const token = TokenManager.getAccessToken();
    if (!token) {
      this.logger.warn('토큰이 없어 자동 갱신 타이머를 설정할 수 없습니다');
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // UNIX 타임스탬프를 밀리초로 변환
      const currentTime = Date.now();
      const timeRemaining = expiryTime - currentTime;

      // 만료 5분 전에 갱신 시작 (최소 1초)
      const refreshTime = Math.max(timeRemaining - 5 * 60 * 1000, 1000);

      this.logger.debug(
        `토큰 갱신 타이머 설정: ${
          refreshTime / 1000
        }초 후 갱신 (ID: ${timerId})`
      );

      // 타이머 설정 및 저장
      const timerId = setTimeout(async () => {
        try {
          const result = await this.refreshToken();

          // 갱신 성공 콜백 호출
          if (onSuccess) {
            onSuccess(result);
          }

          // 갱신 성공 시 다시 타이머 설정
          this.setupRefreshTimer(timerId, onSuccess, onError);

          this.logger.info('토큰 자동 갱신 성공');
        } catch (error) {
          this.logger.error('자동 토큰 갱신 실패:', error);

          // 갱신 실패 콜백 호출
          if (onError) {
            onError(error);
          }

          // 실패 시 타이머 맵에서 제거
          this.refreshTimers.delete(timerId);
        }
      }, refreshTime);

      // 타이머 ID 저장
      this.refreshTimers.set(timerId, timerId);

      return timerId;
    } catch (error) {
      this.logger.error('토큰 갱신 타이머 설정 실패:', error);
      return null;
    }
  }

  /**
   * 특정 타이머 정리
   * @param {string|number} timerId - 타이머 식별자
   */
  clearRefreshTimer(timerId) {
    if (this.refreshTimers.has(timerId)) {
      clearTimeout(this.refreshTimers.get(timerId));
      this.refreshTimers.delete(timerId);
      this.logger.debug(`토큰 갱신 타이머 취소: ${timerId}`);
    }
  }

  /**
   * 모든 갱신 타이머 정리
   */
  clearAllRefreshTimers() {
    this.logger.debug(
      `모든 토큰 갱신 타이머 취소 (${this.refreshTimers.size}개)`
    );
    for (const [id, timer] of this.refreshTimers.entries()) {
      clearTimeout(timer);
      this.refreshTimers.delete(id);
    }
  }

  /**
   * 인증 상태 가져오기
   * @returns {Object} - 인증 상태 정보
   */
  getAuthStatus() {
    const accessToken = TokenManager.getAccessToken();
    const refreshToken = TokenManager.getRefreshToken();
    const user = this.getCurrentUser();
    const isAdmin = this.isAdmin();

    // 토큰 만료 시간 정보 추출
    let expiryTime = null;
    let isExpired = true;

    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        expiryTime = payload.exp * 1000;
        isExpired = Date.now() >= expiryTime;
      } catch (error) {
        this.logger.warn('토큰 만료 시간 추출 실패:', error);
      }
    }

    return {
      isAuthenticated: !!accessToken && !isExpired,
      user,
      isAdmin,
      hasRefreshToken: !!refreshToken,
      expiryTime,
      isExpired,
    };
  }

  /**
   * 사용자 권한 검증
   * @param {string} requiredRole - 필요한 권한
   * @returns {boolean} - 권한 만족 여부
   */
  verifyPermission(requiredRole) {
    // 권한이 필요하지 않으면 항상 true
    if (!requiredRole) return true;

    // 관리자는 모든 권한 보유
    if (this.isAdmin()) return true;

    // 일반 사용자는 'USER' 권한만 가진 경우
    const userRole = TokenManager.getUserRole();

    // 'USER' 권한으로 'ADMIN' 접근 불가
    if (requiredRole === 'ADMIN' && userRole === 'USER') {
      return false;
    }

    return true;
  }
}

export default new AuthService();

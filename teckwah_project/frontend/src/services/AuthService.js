// src/services/AuthService.js
import axios from 'axios';
import TokenManager from '../utils/TokenManager';
import message from '../utils/message';
import { MessageKeys } from '../utils/message';
import ErrorHandler from '../utils/ErrorHandler';
import { useLogger } from '../utils/LogUtils';

/**
 * 인증 서비스 클래스
 * 로그인, 토큰 관리, 세션 확인 등 인증 관련 기능 제공
 * 백엔드 API 명세와 일치하는 요청/응답 구조 구현
 */
class AuthService {
  constructor() {
    this.logger = useLogger('AuthService');
    this.refreshTimers = new Map(); // 자동 갱신 타이머 관리
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
   * POST /auth/login
   *
   * @param {string} user_id - 사용자 ID
   * @param {string} password - 비밀번호
   * @returns {Promise<Object>} - 로그인 응답 (토큰, 사용자 정보)
   */
  async login(user_id, password) {
    try {
      this.logger.info('로그인 요청:', user_id);

      // 백엔드 요구사항에 맞는 요청 본문 구조
      const response = await axios.post('/auth/login', {
        user_id,
        password,
      });

      this.logger.debug('로그인 응답:', response.data);

      // 응답 유효성 검증
      if (response.data && response.data.success) {
        // 토큰 및 사용자 정보 저장
        const { token, user } = response.data;

        if (token) {
          TokenManager.setAccessToken(token.access_token);
          TokenManager.setRefreshToken(token.refresh_token);
        } else {
          throw new Error('로그인 응답에 토큰 정보가 없습니다');
        }

        if (user) {
          TokenManager.setUser(user);
        } else {
          throw new Error('로그인 응답에 사용자 정보가 없습니다');
        }

        message.success('로그인되었습니다', MessageKeys.AUTH.LOGIN);
        return { token, user };
      } else {
        throw new Error(response.data?.message || '로그인에 실패했습니다');
      }
    } catch (error) {
      this.logger.error('로그인 오류:', error);

      // 로그인 실패 시 로컬 인증 데이터 정리
      this.clearAuthData();

      // 에러 메시지 정교화
      let errorMsg = '로그인에 실패했습니다';

      if (error.response) {
        if (error.response.status === 401) {
          errorMsg =
            error.response.data?.message ||
            '아이디 또는 비밀번호가 잘못되었습니다';
        } else {
          errorMsg =
            error.response.data?.message ||
            `서버 오류가 발생했습니다 (${error.response.status})`;
        }
      } else if (error.request) {
        errorMsg = '서버와 통신할 수 없습니다. 네트워크 연결을 확인하세요';
      } else {
        errorMsg = error.message || '알 수 없는 오류가 발생했습니다';
      }

      // 사용자 친화적 오류 처리
      message.error(errorMsg, MessageKeys.AUTH.LOGIN);
      ErrorHandler.handle(error, 'login');

      throw error;
    }
  }

  /**
   * 토큰 갱신
   * POST /auth/refresh
   *
   * @param {string} refreshToken - 리프레시 토큰 (선택적, 없으면 저장된 토큰 사용)
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

      if (response.data && response.data.success) {
        const { token, user } = response.data;

        // 새 토큰 저장
        if (token) {
          TokenManager.setAccessToken(token.access_token);
          if (token.refresh_token) {
            TokenManager.setRefreshToken(token.refresh_token);
          }
        }

        // 사용자 정보 갱신 (존재하는 경우)
        if (user) {
          TokenManager.setUser(user);
        }

        this.logger.info('토큰 갱신 성공');

        // 갱신 이벤트 발생 - 다른 컴포넌트에서 감지 가능
        window.dispatchEvent(
          new CustomEvent('token-refreshed', {
            detail: { success: true },
          })
        );

        return response.data;
      } else {
        throw new Error(response.data?.message || '토큰 갱신에 실패했습니다');
      }
    } catch (error) {
      this.logger.error('토큰 갱신 실패:', error);

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
   * GET /auth/check-session
   *
   * @returns {Promise<boolean>} - 세션 유효 여부
   */
  async checkSession() {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        this.logger.warn('액세스 토큰이 없어 세션 검증 실패');
        return false;
      }

      const response = await axios.get('/auth/check-session');

      if (response.data && response.data.success) {
        // 사용자 정보 업데이트 (있는 경우)
        if (response.data.user) {
          TokenManager.setUser(response.data.user);
        }

        this.logger.info('세션 검증 성공');
        return true;
      } else {
        this.logger.warn('서버 세션 검증 실패:', response.data);
        return false;
      }
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
   * POST /auth/logout
   *
   * @returns {Promise<boolean>} - 로그아웃 성공 여부
   */
  async logout() {
    try {
      const refreshToken = TokenManager.getRefreshToken();

      if (refreshToken) {
        // 서버에 로그아웃 요청
        await axios.post('/auth/logout', { refresh_token: refreshToken });
        this.logger.info('서버에 로그아웃 요청 성공');
      }

      // 모든 자동 갱신 타이머 제거
      this.clearAllRefreshTimers();

      // 로컬 인증 데이터 정리
      this.clearAuthData();

      // 로그아웃 이벤트 발생
      window.dispatchEvent(new CustomEvent('auth-logout'));

      return true;
    } catch (error) {
      this.logger.warn('서버 로그아웃 요청 실패:', error);

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
   *
   * @param {string} id - 타이머 식별자
   * @param {Function} onSuccess - 갱신 성공 콜백
   * @param {Function} onError - 갱신 실패 콜백
   * @returns {string} - 설정된 타이머 ID
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
      this.logger.error('토큰 만료 시간 파싱 오류:', error);
    }

    // 현재 시간 기준 남은 시간 계산
    const now = Date.now();
    let timeUntilExpiry = Math.max(0, expiryTime - now);

    // 갱신 여유 시간 (만료 5분 전)
    const refreshBuffer = 5 * 60 * 1000; // 5분

    // 남은 시간이 5분 이하면 즉시 갱신, 아니면 만료 5분 전에 갱신
    let refreshDelay =
      timeUntilExpiry > refreshBuffer ? timeUntilExpiry - refreshBuffer : 0;

    this.logger.debug(
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
        this.logger.error('자동 토큰 갱신 실패:', error);

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
   *
   * @param {string} id - 타이머 식별자
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
   *
   * @returns {boolean} - 관리자 여부
   */
  isAdmin() {
    const user = this.getCurrentUser();
    return user?.user_role === 'ADMIN';
  }

  /**
   * 권한 검증
   *
   * @param {string} requiredRole - 필요한 권한 (ADMIN 또는 USER)
   * @returns {boolean} - 권한 충족 여부
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

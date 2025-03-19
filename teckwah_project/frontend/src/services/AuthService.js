// src/services/AuthService.js - 개선된 버전
import axios from 'axios';
import TokenManager from '../utils/TokenManager';
import message from '../utils/message';
import { MessageKeys } from '../utils/message';
import { useLogger } from '../utils/LogUtils';

/**
 * 인증 서비스 클래스
 * 로그인, 토큰 관리, 세션 확인 등 인증 관련 기능 제공
 */
class AuthService {
  constructor() {
    this.logger = useLogger('AuthService');
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

        message.success('로그인되었습니다');
        return { token, user };
      } else {
        throw new Error(response.data?.message || '로그인에 실패했습니다');
      }
    } catch (error) {
      this.logger.error('로그인 오류:', error);
      // 로그인 실패 시 로컬 인증 데이터 정리
      this.clearAuthData();
      // 에러 객체에 구체적인 정보 추가
      error = new Error('로그인에 실패했습니다');
      error.responseData = response.data;
      error.statusCode = error.response?.status;
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
        return response.data;
      } else {
        throw new Error(response.data?.message || '토큰 갱신에 실패했습니다');
      }
    } catch (error) {
      this.logger.error('토큰 갱신 실패:', error);

      // 갱신 실패 시 로컬 인증 데이터 정리
      this.clearAuthData();
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
    } finally {
      // 로컬 인증 데이터 정리
      this.clearAuthData();
    }
  }

  /**
   * 인증 데이터 초기화
   */
  clearAuthData() {
    TokenManager.clearTokens();
  }

  /**
   * 관리자 확인
   * @returns {boolean} - 관리자 여부
   */
  isAdmin() {
    const user = this.getCurrentUser();
    return user?.user_role === 'ADMIN';
  }
}

export default new AuthService();

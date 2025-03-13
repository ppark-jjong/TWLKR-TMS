// frontend/src/services/AuthService.js

import axios from 'axios';

/**
 * 인증 서비스
 * 로그인, 토큰 관리, 세션 확인 등 인증 관련 기능 제공
 */
const AuthService = {
  /**
   * 현재 사용자 정보 가져오기
   * 클라이언트 측에 저장된 사용자 정보를 반환
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('사용자 정보 파싱 오류:', error);
      this.clearAuthData();
      return null;
    }
  },

  /**
   * 사용자 로그인
   * @param {string} user_id - 사용자 ID
   * @param {string} password - 비밀번호
   * @returns {Promise} - 로그인 응답
   */
  login: async (user_id, password) => {
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
      if (!response.data) {
        throw new Error('로그인 응답이 없습니다');
      }

      // 토큰 및 사용자 정보 저장
      if (response.data.token) {
        localStorage.setItem('access_token', response.data.token.access_token);
        localStorage.setItem(
          'refresh_token',
          response.data.token.refresh_token
        );
      } else {
        throw new Error('로그인 응답에 토큰 정보가 없습니다');
      }

      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } else {
        throw new Error('로그인 응답에 사용자 정보가 없습니다');
      }

      return response.data;
    } catch (error) {
      console.error('로그인 오류:', error);
      // 로그인 실패 시 로컬 인증 데이터 정리
      AuthService.clearAuthData();
      throw error;
    }
  },

  /**
   * 토큰 갱신
   * 서버에 토큰 갱신 요청을 보내고 새 토큰을 받음
   * @param {string} refreshToken - 리프레시 토큰
   * @returns {Promise} - 갱신된 토큰 정보
   */
  refreshToken: async (refreshToken) => {
    try {
      console.log('토큰 갱신 요청');

      if (!refreshToken) {
        throw new Error('갱신할 리프레시 토큰이 없습니다');
      }

      const response = await axios.post('/auth/refresh', {
        refresh_token: refreshToken,
      });

      // 응답 유효성 검증
      if (!response.data || !response.data.token) {
        throw new Error('토큰 갱신 응답이 유효하지 않습니다');
      }

      // 새 토큰 저장
      localStorage.setItem('access_token', response.data.token.access_token);
      if (response.data.token.refresh_token) {
        localStorage.setItem(
          'refresh_token',
          response.data.token.refresh_token
        );
      }

      console.log('토큰 갱신 성공');
      return response.data;
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      // 갱신 실패 시 로컬 인증 데이터 정리
      AuthService.clearAuthData();
      throw error;
    }
  },

  /**
   * 세션 유효성 검증
   * 서버에 현재 세션이 유효한지 확인 요청
   * @returns {Promise<boolean>} - 세션 유효 여부
   */
  checkSession: async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        return false;
      }

      const response = await axios.get('/auth/check-session', {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data && response.data.success;
    } catch (error) {
      console.error('세션 검증 실패:', error);
      return false;
    }
  },

  /**
   * 로그아웃
   * 서버에 로그아웃 요청을 보내고 클라이언트 측 인증 데이터 삭제
   * @returns {Promise} - 로그아웃 응답
   */
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await axios.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
    } finally {
      AuthService.clearAuthData();
    }
  },

  /**
   * 인증 데이터 초기화
   * 클라이언트 측에 저장된 인증 정보 삭제
   */
  clearAuthData: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    // 사용자가 로그아웃했음을 다른 탭에 알림
    window.dispatchEvent(new Event('auth-status-change'));
  },

  /**
   * 권한 확인
   * 현재 사용자가 특정 권한을 가지고 있는지 확인
   * @param {string} role - 확인할 권한
   * @returns {boolean} - 권한 보유 여부
   */
  hasRole: (role) => {
    const user = AuthService.getCurrentUser();
    return user && user.user_role === role;
  },

  /**
   * 관리자 확인
   * 현재 사용자가 관리자 권한을 가지고 있는지 확인
   * @returns {boolean} - 관리자 여부
   */
  isAdmin: () => {
    return AuthService.hasRole('ADMIN');
  },
};

export default AuthService;

// src/utils/authHelpers.js

import jwt_decode from 'jwt-decode';
import { login as apiLogin } from './api';

// 토큰 저장
export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

// 토큰 가져오기
export const getAccessToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');

// 토큰 삭제
export const removeTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// 토큰 디코딩하여 사용자 정보 가져오기
export const getUserFromToken = () => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const decoded = jwt_decode(token);
    return {
      user_id: decoded.sub,
      user_department: decoded.department,
      user_role: decoded.role,
    };
  } catch (error) {
    console.error('토큰 디코딩 오류:', error);
    return null;
  }
};

// 인증 상태 확인
export const isAuthenticated = () => {
  const token = getAccessToken();
  if (!token) return { isAuth: false, userData: null };

  try {
    const decoded = jwt_decode(token);
    const currentTime = Date.now() / 1000;

    if (decoded.exp < currentTime) {
      return { isAuth: false, userData: null };
    }

    return {
      isAuth: true,
      userData: {
        user_id: decoded.sub,
        user_department: decoded.department,
        user_role: decoded.role,
      },
    };
  } catch (error) {
    return { isAuth: false, userData: null };
  }
};

// 관리자 권한 확인 (수정 - 구현 완료)
export const isAdmin = () => {
  try {
    const user = getUserFromToken();
    return user && user.user_role === 'ADMIN';
  } catch (error) {
    console.error('isAdmin 체크 중 오류 발생:', error);
    return false;
  }
};
export const isUser = () => {
  try {
    const user = getUserFromToken();
    return user && user.user_role === 'USER';
  } catch (error) {
    console.error('isUser 체크 중 오류 발생:', error);
    return false;
  }
};

// 리프레시 토큰으로 액세스 토큰 갱신
export const refreshToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    // 리프레시 토큰을 쿠키로 전송하도록 설정
    const response = await apiLogin.post(
      '/auth/refresh',
      {},
      {
        withCredentials: true,
        headers: {
          Cookie: `refresh_token=${refreshToken}`,
        },
      }
    );

    if (response.data && response.data.success) {
      const { access_token, refresh_token } = response.data.data;
      setTokens(access_token, refresh_token);
      return true;
    }

    return false;
  } catch (error) {
    removeTokens();
    return false;
  }
};

// 로그인 처리
export const loginUser = async (credentials) => {
  try {
    const response = await apiLogin(credentials);

    // API가 성공했지만 success: false인 경우 (서버에서는 200 OK지만 인증 실패)
    if (response.data && response.data.success === false) {
      return {
        success: false,
        message: response.data?.message || '로그인에 실패했습니다.',
        errorType: 'validation',
      };
    }

    // 정상적인 성공 케이스
    if (response.data && response.data.success) {
      const { token, user } = response.data.data;

      // 토큰이 없거나 사용자 정보가 없는 경우
      if (!token || !user) {
        console.error('토큰 또는 사용자 정보가 없습니다:', response.data);
        return {
          success: false,
          message: '서버 응답에 필요한 데이터가 없습니다.',
          errorType: 'server',
        };
      }

      // 토큰 저장
      setTokens(token.access_token, token.refresh_token);

      // 정상 응답
      return {
        success: true,
        user: {
          ...user,
          // user_role이 없는 경우 기본값 설정 (권한이 필요한 라우팅에서 문제 방지)
          user_role: user.user_role || 'USER',
        },
      };
    }

    // 응답 구조가 예상과 다른 경우
    return {
      success: false,
      message: '서버 응답 형식이 올바르지 않습니다.',
      errorType: 'unknown',
    };
  } catch (error) {
    console.error('로그인 API 호출 중 오류 발생:', error);
    return {
      success: false,
      message: '로그인 요청 중 오류가 발생했습니다.',
      errorType: 'network',
    };
  }
};

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
    const response = await apiLogin.post('/auth/refresh', {
      refresh_token: refreshToken,
    });

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

    if (response.data && response.data.success) {
      const { token, user } = response.data.data;
      setTokens(token.access_token, token.refresh_token);
      return { success: true, user };
    }

    return { success: false, message: '로그인에 실패했습니다.' };
  } catch (error) {
    const message =
      error.response?.data?.message || '로그인 중 오류가 발생했습니다.';
    return { success: false, message };
  }
};

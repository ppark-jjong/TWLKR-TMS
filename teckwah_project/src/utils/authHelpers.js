// src/utils/authHelpers.js

import jwtDecode from 'jwt-decode';
import { login as apiLogin } from './api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_info';

/**
 * 토큰을 로컬 스토리지에 저장합니다.
 * @param {string} token - JWT 토큰
 */
export const saveToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * 로컬 스토리지에서 토큰을 가져옵니다.
 * @returns {string|null} 저장된 토큰 또는 null
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * 로컬 스토리지에서 토큰을 제거합니다.
 */
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * 사용자 정보를 로컬 스토리지에 저장합니다.
 * @param {Object} user - 사용자 정보 객체
 */
export const saveUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * 로컬 스토리지에서 사용자 정보를 가져옵니다.
 * @returns {Object|null} 저장된 사용자 정보 또는 null
 */
export const getUserFromStorage = () => {
  const userJson = localStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

/**
 * 로컬 스토리지에서 사용자 정보를 제거합니다.
 */
export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
};

/**
 * 토큰이 유효한지 확인합니다. (만료되지 않았고, 존재하는지)
 * @returns {boolean} 토큰이 유효하면 true, 그렇지 않으면 false
 */
export const isTokenValid = () => {
  const token = getToken();
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  } catch (error) {
    console.error('토큰 검증 오류:', error);
    return false;
  }
};

/**
 * 토큰에서 사용자 정보를 추출합니다.
 * @returns {Object|null} 토큰에서 추출한 사용자 정보 또는 null
 */
export const getUserFromToken = () => {
  const token = getToken();
  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('토큰 디코딩 오류:', error);
    return null;
  }
};

/**
 * 사용자가 인증되었는지 확인합니다.
 * @returns {object} 인증 여부와 사용자 정보
 */
export const isAuthenticated = () => {
  const isValid = isTokenValid();
  const userData = isValid ? getUserFromToken() : null;
  return { isAuth: isValid, userData };
};

/**
 * 사용자가 관리자인지 확인합니다.
 * @returns {boolean} 관리자면 true, 그렇지 않으면 false
 */
export const isAdmin = () => {
  const user = getUserFromToken();
  return user && user.role === 'ADMIN';
};

/**
 * 로그인 처리를 수행합니다.
 * @param {Object} credentials - 로그인 정보 (사용자명, 비밀번호 등)
 * @returns {Promise} 로그인 결과
 */
export const loginUser = async (credentials) => {
  try {
    const response = await apiLogin(credentials);

    if (response.data && response.data.success) {
      const { token, user } = response.data.data;
      saveToken(token);
      saveUser(user);
      return { success: true, user };
    }

    return {
      success: false,
      message: response.data?.message || '로그인에 실패했습니다.',
    };
  } catch (error) {
    console.error('로그인 오류:', error);
    return {
      success: false,
      message:
        error.response?.data?.message || '로그인 중 오류가 발생했습니다.',
    };
  }
};

/**
 * 로그아웃 처리를 수행합니다.
 */
export const handleLogout = () => {
  removeToken();
  removeUser();
  window.location.href = '/login';
};

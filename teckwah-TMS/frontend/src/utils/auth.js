/**
 * 인증 관련 유틸리티 함수
 */

// 토큰 저장 키
const TOKEN_KEY = 'teckwah_tms_token';
const USER_DATA_KEY = 'teckwah_tms_user';

/**
 * 로그인 처리 함수
 * @param {Object} data - 로그인 응답 데이터 (토큰, 사용자 정보 등)
 */
export const setAuth = (data) => {
  if (!data || !data.access_token) {
    throw new Error('인증 데이터가 유효하지 않습니다.');
  }

  // 토큰 저장
  localStorage.setItem(TOKEN_KEY, data.access_token);
  
  // 사용자 데이터 저장
  if (data.user) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
  }
};

/**
 * 토큰 가져오기
 * @returns {string|null} 저장된 토큰 또는 null
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * 사용자 데이터 가져오기
 * @returns {Object|null} 저장된 사용자 데이터 또는 null
 */
export const getUserData = () => {
  const userData = localStorage.getItem(USER_DATA_KEY);
  return userData ? JSON.parse(userData) : null;
};

/**
 * JWT 토큰 디코딩 (클라이언트 측에서 간단히 확인용)
 * @param {string} token JWT 토큰
 * @returns {Object|null} 디코딩된 토큰 페이로드 또는 null
 */
export const decodeToken = (token) => {
  if (!token) return null;
  
  try {
    // JWT 구조: header.payload.signature
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('토큰 디코딩 중 오류:', e);
    return null;
  }
};

/**
 * 토큰 만료 여부 확인
 * @param {string} token JWT 토큰
 * @returns {boolean} 만료 여부
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  // 현재 시간과 만료 시간 비교 (expiry는 초 단위)
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

/**
 * 인증 여부 확인
 * @returns {Object} isAuth: 인증 여부, userData: 사용자 데이터
 */
export const isAuthenticated = () => {
  const token = getToken();
  const userData = getUserData();
  
  // 토큰이 있고 만료되지 않았으면 인증된 것으로 간주
  const isTokenValid = token && !isTokenExpired(token);
  
  return {
    isAuth: isTokenValid,
    userData: userData
  };
};

/**
 * 로그아웃 처리
 */
export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
};

/**
 * 관리자 여부 확인
 * @returns {boolean} 관리자 여부
 */
export const isAdmin = () => {
  const userData = getUserData();
  return userData?.role === 'ADMIN';
};

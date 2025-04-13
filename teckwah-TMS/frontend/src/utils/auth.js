/**
 * 인증 관련 유틸리티 함수 (세션 기반)
 */

// 사용자 데이터 캐시 키
const USER_DATA_KEY = "teckwah_tms_user";

/**
 * 로그인 처리 함수 - 세션 쿠키는 자동으로 처리됨
 * @param {Object} data - 로그인 응답 데이터 (사용자 정보 등)
 */
export const setAuth = (data) => {
  if (!data || !data.user) {
    throw new Error("인증 데이터가 유효하지 않습니다.");
  }

  // 사용자 데이터 로컬 저장 (UI 표시용)
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
};

/**
 * 사용자 데이터 가져오기 - 로컬에 저장된 사용자 정보
 * @returns {Object|null} 저장된 사용자 데이터 또는 null
 */
export const getUserData = () => {
  const userData = localStorage.getItem(USER_DATA_KEY);
  return userData ? JSON.parse(userData) : null;
};

/**
 * 인증 여부 확인 - 로컬에 저장된 사용자 정보로 먼저 확인하고,
 * 서버에서 세션 유효성은 API 호출 시 검증됨
 * @returns {Object} isAuth: 인증 여부, userData: 사용자 데이터
 */
export const isAuthenticated = () => {
  const userData = getUserData();
  
  return {
    isAuth: !!userData,
    userData: userData,
  };
};

/**
 * 로그아웃 처리 - 로컬 데이터 삭제
 * 서버 측 세션은 /auth/logout API에서 처리
 */
export const logout = () => {
  localStorage.removeItem(USER_DATA_KEY);
};

/**
 * 관리자 여부 확인
 * @returns {boolean} 관리자 여부
 */
export const isAdmin = () => {
  const userData = getUserData();
  return userData?.role === "ADMIN";
};

/**
 * getToken은 더 이상 필요 없지만, 기존 Client.js와의 호환성을 위해 빈 함수 유지
 * @returns {null} 항상 null 반환
 */
export const getToken = () => {
  return null;
};
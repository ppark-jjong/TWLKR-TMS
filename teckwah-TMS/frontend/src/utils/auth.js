/**
 * 인증 관련 유틸리티 함수 (세션 기반)
 * 로컬 스토리지 사용을 제거하고 세션 기반 인증에 완전히 의존
 */

// 메모리 내 사용자 데이터 캐싱 (페이지 리로드 시 초기화됨)
let currentUserData = null;

/**
 * 로그인 처리 함수 - 세션 쿠키는 자동으로 처리됨
 * @param {boolean|Object} authState - 인증 상태 또는 사용자 데이터
 */
export const setAuth = (authState) => {
  // App.js에서 객체 형태로 사용자 데이터를 받을 경우
  if (typeof authState === 'object' && authState !== null) {
    currentUserData = authState;
  }
};

/**
 * 사용자 데이터 설정 함수
 * @param {Object} userData - 서버에서 받은 사용자 데이터
 */
export const setUserData = (userData) => {
  currentUserData = userData;
};

/**
 * 사용자 데이터 가져오기 - 메모리에 캐시된 데이터 반환
 * @returns {Object|null} 캐시된 사용자 데이터 또는 null
 */
export const getUserData = () => {
  return currentUserData;
};

/**
 * 인증 여부 확인 - 메모리 캐시 기반
 * 페이지 리로드 시 App.js에서 세션 체크 API를 호출하여 다시 설정됨
 * @returns {Object} isAuth: 인증 여부, userData: 사용자 데이터
 */
export const isAuthenticated = () => {
  return {
    isAuth: !!currentUserData,
    userData: currentUserData,
  };
};

/**
 * 로그아웃 처리 - 메모리 데이터 삭제
 * 서버 측 세션은 /auth/logout API에서 처리
 */
export const logout = () => {
  currentUserData = null;
};

/**
 * 관리자 여부 확인
 * @returns {boolean} 관리자 여부
 */
export const isAdmin = () => {
  return currentUserData?.role === "ADMIN";
};
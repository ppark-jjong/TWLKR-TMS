import apiClient from "./Client";

/**
 * 로그인 API
 * @param {string} user_id - 사용자 아이디
 * @param {string} password - 비밀번호
 * @returns {Promise<Object>} - 로그인 응답 데이터
 */
export const login = async (user_id, password) => {
  return await apiClient.post("/auth/login", { user_id, password });
};

/**
 * 로그아웃 API
 * @returns {Promise<Object>} - 로그아웃 응답 데이터
 */
export const logout = async () => {
  return await apiClient.post("/auth/logout");
};

/**
 * 현재 사용자 정보 조회 API
 * @returns {Promise<Object>} - 사용자 정보 응답 데이터
 */
export const getCurrentUser = async () => {
  return await apiClient.get("/auth/me");
};

/**
 * 세션 상태 확인 API
 * @returns {Promise<Object>} - 세션 정보 응답 데이터
 */
export const checkSession = async () => {
  return await apiClient.get("/auth/session");
};
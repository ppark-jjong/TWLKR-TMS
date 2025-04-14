import apiClient from "./Client";

/**
 * 사용자 목록 조회 API
 * @returns {Promise<Object>} - 사용자 목록 응답 데이터
 */
export const listUsers = async () => {
  return await apiClient.get("/users/list");
};

/**
 * 사용자 상세 조회 API
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} - 사용자 상세 정보 응답 데이터
 */
export const getUser = async (userId) => {
  return await apiClient.get(`/users/${userId}`);
};

/**
 * 사용자 생성 API
 * @param {Object} userData - 사용자 생성 데이터
 * @param {string} userData.userId - 사용자 ID
 * @param {string} userData.password - 비밀번호
 * @param {string} userData.role - 역할 (ADMIN/USER)
 * @param {string} userData.department - 부서 (CS/HES/LENOVO)
 * @returns {Promise<Object>} - 사용자 생성 응답 데이터
 */
export const createUser = async (userData) => {
  return await apiClient.post("/users", userData);
};

/**
 * 사용자 삭제 API
 * @param {string} userId - 삭제할 사용자 ID
 * @returns {Promise<Object>} - 사용자 삭제 응답 데이터
 */
export const deleteUser = async (userId) => {
  return await apiClient.delete(`/users/${userId}`);
};

/**
 * 비밀번호 변경 API
 * @param {Object} passwordData - 비밀번호 변경 데이터
 * @param {string} passwordData.currentPassword - 현재 비밀번호
 * @param {string} passwordData.newPassword - 새 비밀번호
 * @returns {Promise<Object>} - 비밀번호 변경 응답 데이터
 */
export const changePassword = async (passwordData) => {
  return await apiClient.put("/users/password/change", passwordData);
};

/**
 * 부서 목록 조회 API
 * @returns {Promise<Object>} - 부서 목록 응답 데이터
 */
export const getDepartments = async () => {
  return await apiClient.get("/users/departments/list");
};

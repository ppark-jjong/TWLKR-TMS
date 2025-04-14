import apiClient from "./Client";

/**
 * 상태별 통계 API
 * @returns {Promise<Object>} - 상태별 통계 응답 데이터
 */
export const getStatusStats = async () => {
  return await apiClient.get("/visualization/stats/status");
};

/**
 * 부서별 통계 API
 * @returns {Promise<Object>} - 부서별 통계 응답 데이터
 */
export const getDepartmentStats = async () => {
  return await apiClient.get("/visualization/stats/department");
};

/**
 * 기간별 배송 추이 API
 * @param {string} period - 기간 구분 (daily, weekly, monthly)
 * @returns {Promise<Object>} - 기간별 추이 응답 데이터
 */
export const getTrendStats = async (period = "daily") => {
  return await apiClient.get("/visualization/stats/trend", {
    params: { period }
  });
};

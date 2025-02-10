// src/services/driverService.js
import api from "./api";

export const driverService = {
  /**
   * 기사 목록 조회
   * @returns {Promise<Array>} 기사 목록
   */
  getDrivers: async () => {
    const { data } = await api.get("/drivers");
    return data;
  },
};

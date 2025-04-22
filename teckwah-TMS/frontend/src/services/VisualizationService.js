/**
 * 시각화 데이터 API 서비스
 */
import api from "./api";
import logger from "../utils/logger";

// 서비스 이름 상수
const SERVICE_NAME = "VisualizationService";

const VisualizationService = {
  /**
   * 시각화 통계 데이터 조회 (관리자 전용)
   * @param {Object} params - 조회 파라미터
   * @param {string} params.date_from - 시작 날짜 (YYYY-MM-DD)
   * @param {string} params.date_to - 종료 날짜 (YYYY-MM-DD)
   * @param {string} params.visualization_type - 시각화 유형 (time/department)
   * @returns {Promise<Object>} 시각화 데이터 응답
   */
  getStats: async (params = {}) => {
    const url = "/visualization/stats";

    try {
      logger.service(SERVICE_NAME, "getStats", params);

      // API 요청 파라미터 변환
      const apiParams = {
        date_from: params.date_from || params.startDate || undefined,
        date_to: params.date_to || params.endDate || undefined,
        visualization_type:
          params.visualization_type || params.visualizationType || "time",
      };

      const response = await api.get(url, { params: apiParams });
      logger.response(url, response.data?.success);

      return response.data;
    } catch (error) {
      logger.error("시각화 통계 데이터 조회 실패", error);
      return {
        success: false,
        message: "시각화 데이터를 불러오는 중 오류가 발생했습니다.",
        timeStats: [],
        departmentStats: [],
      };
    }
  },

  // getDepartmentStats 함수는 getStats로 통합되었으므로 제거
};

export default VisualizationService;

// frontend/src/services/VisualizationService.js
import axios from 'axios';
import { CHART_TYPES } from '../utils/Constants';

/**
 * @typedef {Object} StatusData
 * @property {string} status - 상태
 * @property {number} count - 건수
 * @property {number} percentage - 비율
 */

/**
 * @typedef {Object} DepartmentStatusData
 * @property {number} total - 총 건수
 * @property {StatusData[]} statusBreakdown - 상태별 상세 정보
 */

/**
 * @typedef {Object} DepartmentHourlyData
 * @property {number} total - 총 건수
 * @property {Object.<string, number>} hourlyCounts - 시간대별 건수
 */

/**
 * @typedef {Object} TimeSlot
 * @property {string} label - 시간대 라벨
 * @property {number} start - 시작 시간
 */

/**
 * @typedef {Object} DeliveryStatusData
 * @property {string} type - 차트 타입 (delivery_status)
 * @property {number} totalCount - 전체 건수
 * @property {Object.<string, DepartmentStatusData>} departmentBreakdown - 부서별 상태 정보
 */

/**
 * @typedef {Object} HourlyOrdersData
 * @property {string} type - 차트 타입 (hourly_orders)
 * @property {number} totalCount - 전체 건수
 * @property {number} averageCount - 평균 건수
 * @property {Object.<string, DepartmentHourlyData>} departmentBreakdown - 부서별 시간대 정보
 * @property {TimeSlot[]} timeSlots - 시간대 목록
 */

class VisualizationService {
  /**
   * 시각화 데이터 조회
   * @param {string} type - 차트 타입 (CHART_TYPES.DELIVERY_STATUS 또는 CHART_TYPES.HOURLY_ORDERS)
   * @param {Date} startDate - 시작 날짜
   * @param {Date} endDate - 종료 날짜
   * @returns {Promise<DeliveryStatusData | HourlyOrdersData>}
   */
  async getVisualizationData(type, startDate, endDate) {
    try {
      // 엔드포인트 결정
      const endpoint = type === CHART_TYPES.DELIVERY_STATUS ? 'delivery_status' : 'hourly_orders';
      
      // 파라미터 설정
      const params = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      };

      // API 호출
      return await axios.get(`/visualization/${endpoint}`, { params });
    } catch (error) {
      throw error;
    }
  }

  /**
   * 조회 가능한 날짜 범위 조회
   * @returns {Promise<{oldest_date: string, latest_date: string}>}
   */
  async getDateRange() {
    try {
      return await axios.get('/visualization/date-range');
    } catch (error) {
      throw error;
    }
  }
}

export default new VisualizationService();
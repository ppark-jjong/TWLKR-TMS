// frontend/src/services/DashboardService.js
import axios from 'axios';

/**
 * 대시보드 관련 API 호출을 담당하는 서비스
 */
class DashboardService {
  /**
   * 대시보드 목록 조회
   * @param {Date} date - 조회할 날짜
   * @returns {Promise<Array>} 대시보드 목록
   */
  async getDashboardList(date) {
    const response = await axios.get('/dashboard/list', {
      params: {
        date: date.toISOString()
      }
    });
    return response.data;
  }

  /**
   * 대시보드 상세 정보 조회
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<Object>} 대시보드 상세 정보
   */
  async getDashboardDetail(dashboardId) {
    const response = await axios.get(`/dashboard/${dashboardId}`);
    return response.data;
  }

  /**
   * 대시보드 생성
   * @param {Object} dashboardData - 생성할 대시보드 데이터
   * @returns {Promise<Object>} 생성된 대시보드 정보
   */
  async createDashboard(dashboardData) {
    const response = await axios.post('/dashboard', dashboardData);
    return response.data;
  }

  /**
   * 배송 상태 업데이트
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} status - 변경할 상태
   * @returns {Promise<Object>} 업데이트된 대시보드 정보
   */
  async updateStatus(dashboardId, status) {
    const response = await axios.patch(`/dashboard/${dashboardId}/status`, {
      status
    });
    return response.data;
  }

  /**
   * 메모 업데이트
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} remark - 변경할 메모 내용
   * @returns {Promise<Object>} 업데이트된 대시보드 정보
   */
  async updateRemark(dashboardId, remark) {
    const response = await axios.patch(`/dashboard/${dashboardId}/remark`, {
      remark
    });
    return response.data;
  }

  /**
   * 배차 정보 업데이트
   * @param {Object} driverData - 배차 정보 데이터
   * @returns {Promise<Array>} 업데이트된 대시보드 목록
   */
  async assignDriver(driverData) {
    const response = await axios.post('/dashboard/assign', driverData);
    return response.data;
  }

  /**
   * 대시보드 삭제
   * @param {Array<number>} dashboardIds - 삭제할 대시보드 ID 목록
   * @returns {Promise<Object>} 삭제 결과
   */
  async deleteDashboards(dashboardIds) {
    const response = await axios.delete('/dashboard', {
      params: { dashboard_ids: dashboardIds }
    });
    return response.data;
  }
}

export default new DashboardService();
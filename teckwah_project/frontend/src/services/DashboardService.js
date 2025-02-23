// frontend/src/services/DashboardService.js
import axios from 'axios';

class DashboardService {
  /**
   * 대시보드 목록 조회
   * @param {dayjs} date - 조회 날짜
   * @returns {Promise<{items: Array, dateRange: Object}>}
   */
  async getDashboardList(date) {
    try {
      const response = await axios.get('/dashboard/list', {
        params: {
          date: date.format('YYYY-MM-DD')
        }
      });
      
      return {
        items: response.data.data.items,
        dateRange: response.data.data.date_range
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 관리자 대시보드 목록 조회
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   * @returns {Promise<{items: Array, dateRange: Object}>}
   */
  async getAdminDashboardList(startDate, endDate) {
    try {
      const response = await axios.get('/dashboard/admin/list', {
        params: {
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD')
        }
      });

      return {
        items: response.data.data.items,
        dateRange: response.data.data.date_range
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 대시보드 상세 정보 조회
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<Object>}
   */
  async getDashboardDetail(dashboardId) {
    try {
      const response = await axios.get(`/dashboard/${dashboardId}`);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 대시보드 상태 업데이트
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} status - 변경할 상태
   * @param {boolean} isAdmin - 관리자 여부
   * @returns {Promise<Object>}
   */
  async updateStatus(dashboardId, status, isAdmin = false) {
    try {
      const response = await axios.patch(
        `/dashboard/${dashboardId}/status`,
        { 
          status,
          is_admin: isAdmin
        }
      );
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 메모 업데이트
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} remark - 메모 내용
   * @returns {Promise<Object>}
   */
  async updateRemark(dashboardId, remark) {
    try {
      const response = await axios.patch(
        `/dashboard/${dashboardId}/remark`,
        { remark }
      );
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 배차 처리
   * @param {Object} driverData - 배차 정보
   * @param {Array<number>} driverData.dashboard_ids - 대시보드 ID 목록
   * @param {string} driverData.driver_name - 배송 담당자 이름
   * @param {string} driverData.driver_contact - 배송 담당자 연락처
   * @returns {Promise<Object>}
   */
  async assignDriver(driverData) {
    try {
      const response = await axios.post('/dashboard/assign', {
        dashboard_ids: driverData.dashboard_ids,
        driver_name: driverData.driver_name,
        driver_contact: driverData.driver_contact
      });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 대시보드 생성
   * @param {Object} dashboardData - 대시보드 생성 데이터
   * @returns {Promise<Object>}
   */
  async createDashboard(dashboardData) {
    try {
      const response = await axios.post('/dashboard', dashboardData);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 대시보드 삭제 (관리자 전용)
   * @param {Array<number>} dashboardIds - 삭제할 대시보드 ID 목록
   * @returns {Promise<Object>}
   */
  async deleteDashboards(dashboardIds) {
    try {
      const response = await axios.delete('/dashboard', {
        data: { dashboard_ids: dashboardIds }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new DashboardService();
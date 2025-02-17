// frontend/src/services/DashboardService.js
import axios from 'axios';

class DashboardService {
  /**
   * 대시보드 목록 조회
   * @param {dayjs} date - 조회할 날짜
   * @returns {Promise<Array>} 대시보드 목록
   */
  async getDashboardList(date) {
    try {
      const response = await axios.get('/dashboard/list', {
        params: {
          date: date.format('YYYY-MM-DD')
        }
      });
      
      return response.data || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * 대시보드 상세 정보 조회
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<Object>} 대시보드 상세 정보
   */
  async getDashboardDetail(dashboardId) {
    try {
      const response = await axios.get(`/dashboard/${dashboardId}`);
      if (!response.data) {
        throw new Error('대시보드 정보를 찾을 수 없습니다');
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 대시보드 생성
   * @param {Object} dashboardData - 생성할 대시보드 데이터
   * @returns {Promise<Object>} 생성된 대시보드 정보
   */
  async createDashboard(dashboardData) {
    try {
      const response = await axios.post('/dashboard', dashboardData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 대시보드 상태 업데이트
   * @param {number} dashboardId - 대시보드 ID
   * @param {Object} statusData - 상태 업데이트 데이터
   * @param {string} statusData.status - 새로운 상태값 (STATUS_TYPES에 정의된 값)
   * @returns {Promise<Object>} 업데이트된 대시보드 정보
   */
  async updateStatus(dashboardId, statusData) {
    try {
      const response = await axios.patch(
        `/dashboard/${dashboardId}/status`,
        statusData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 메모 업데이트
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} remark - 변경할 메모 내용
   * @returns {Promise<Object>} 업데이트된 대시보드 정보
   */
  async updateRemark(dashboardId, remark) {
    try {
      const response = await axios.patch(`/dashboard/${dashboardId}/remark`, {
        remark
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 배차 정보 업데이트
   * @param {Object} driverData 
   * @param {number[]} driverData.dashboard_ids - 대시보드 ID 목록
   * @param {string} driverData.driver_name - 기사 이름
   * @param {string} driverData.driver_contact - 기사 연락처
   */
  async assignDriver(driverData) {
    try {
      const response = await axios.post('/dashboard/assign', {
        dashboard_ids: driverData.dashboard_ids,
        driver_name: driverData.driver_name,
        driver_contact: driverData.driver_contact
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 대시보드 삭제
   * @param {Array<number>} dashboardIds - 삭제할 대시보드 ID 목록
   * @returns {Promise<Object>} 삭제 결과
   */
  async deleteDashboards(dashboardIds) {
    try {
      const response = await axios.delete('/dashboard', {
        data: dashboardIds
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new DashboardService();
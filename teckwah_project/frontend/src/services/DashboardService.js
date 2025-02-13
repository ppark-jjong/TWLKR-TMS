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
      
      // 데이터가 없는 경우 빈 배열 반환
      if (!response.data || response.data.length === 0) {
        return [];
      }
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || '대시보드 목록 조회 중 오류가 발생했습니다');
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
      throw new Error(error.response?.data?.detail || '대시보드 상세 정보 조회 중 오류가 발생했습니다');
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
      throw new Error(error.response?.data?.detail || '대시보드 생성 중 오류가 발생했습니다');
    }
  }

  /**
   * 배송 상태 업데이트
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} status - 변경할 상태
   * @returns {Promise<Object>} 업데이트된 대시보드 정보
   */
  async updateStatus(dashboardId, status) {
    try {
      const response = await axios.patch(`/dashboard/${dashboardId}/status`, {
        status
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || '상태 업데이트 중 오류가 발생했습니다');
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
      throw new Error(error.response?.data?.detail || '메모 업데이트 중 오류가 발생했습니다');
    }
  }

  /**
   * 배차 정보 업데이트
   * @param {Object} driverData - 배차 정보 데이터
   * @returns {Promise<Array>} 업데이트된 대시보드 목록
   */
  async assignDriver(driverData) {
    try {
      const response = await axios.post('/dashboard/assign', driverData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || '배차 처리 중 오류가 발생했습니다');
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
        data: { dashboard_ids: dashboardIds }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || '대시보드 삭제 중 오류가 발생했습니다');
    }
  }
}

export default new DashboardService();
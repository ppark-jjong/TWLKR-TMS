// frontend/src/services/DashboardService.js
import axios from 'axios';
import message, { MessageKeys, MessageTemplates } from '../utils/message';

class DashboardService {
  /**
   * 대시보드 목록 조회 (ETA 기준)
   * @param {dayjs} date - 날짜 객체 (ETA 기준 날짜)
   * @returns {Promise<Array>} - 대시보드 항목 배열
   */
  async getDashboardList(date) {
    try {
      // 날짜 형식 확인
      const formattedDate = date.format('YYYY-MM-DD');
      console.log('요청 날짜:', formattedDate);

      const response = await axios.get('/dashboard/list', {
        params: {
          date: formattedDate,
        },
      });

      console.log('대시보드 목록 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data?.items || [];
      } else {
        console.warn('서버 응답이 예상 형식과 다릅니다:', response.data);
        return [];
      }
    } catch (error) {
      console.error('대시보드 목록 조회 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 관리자 대시보드 목록 조회
   * @param {dayjs} date - 날짜 객체 (ETA 기준 날짜)
   * @returns {Promise<Array>} - 대시보드 항목 배열
   */
  async getAdminDashboardList(date) {
    try {
      // 날짜 형식 확인
      const formattedDate = date.format('YYYY-MM-DD');
      console.log('관리자 대시보드 요청 날짜:', formattedDate);

      const response = await axios.get('/dashboard/list', {
        params: {
          date: formattedDate,
        },
      });

      console.log('관리자 대시보드 목록 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data?.items || [];
      } else {
        console.warn('서버 응답이 예상 형식과 다릅니다:', response.data);
        return [];
      }
    } catch (error) {
      console.error(
        '관리자 대시보드 목록 조회 실패:',
        error.response?.data || error
      );
      throw error;
    }
  }

  /**
   * 대시보드 상세 정보 조회
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<Object>} - 대시보드 상세 정보
   */
  async getDashboardDetail(dashboardId) {
    try {
      const response = await axios.get(`/dashboard/${dashboardId}`);
      console.log('대시보드 상세 정보:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error('상세 정보 조회에 실패했습니다');
      }
    } catch (error) {
      console.error('대시보드 상세 조회 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 대시보드 생성
   * @param {Object} dashboardData - 생성할 대시보드 데이터
   * @returns {Promise<Object>} - 생성된 대시보드 정보
   */
  async createDashboard(dashboardData) {
    try {
      console.log('대시보드 생성 요청 데이터:', dashboardData);
      const response = await axios.post('/dashboard', dashboardData);
      console.log('대시보드 생성 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error('대시보드 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('대시보드 생성 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 상태 업데이트
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} status - 변경할 상태
   * @param {boolean} isAdmin - 관리자 여부
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateStatus(dashboardId, status, isAdmin = false) {
    try {
      const response = await axios.patch(`/dashboard/${dashboardId}/status`, {
        status,
        is_admin: isAdmin,
      });
      console.log('상태 업데이트 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error('상태 업데이트에 실패했습니다');
      }
    } catch (error) {
      console.error('상태 업데이트 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 메모 업데이트
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} remark - 메모 내용
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateRemark(dashboardId, remark) {
    try {
      const response = await axios.patch(`/dashboard/${dashboardId}/remark`, {
        remark,
      });
      console.log('메모 업데이트 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error('메모 업데이트에 실패했습니다');
      }
    } catch (error) {
      console.error('메모 업데이트 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 배차 처리
   * @param {Object} driverData - 배차 정보 (dashboard_ids, driver_name, driver_contact)
   * @returns {Promise<Array>} - 업데이트된 대시보드 정보 배열
   */
  async assignDriver(driverData) {
    try {
      console.log('배차 요청 데이터:', driverData);
      const response = await axios.post('/dashboard/assign', {
        dashboard_ids: driverData.dashboard_ids,
        driver_name: driverData.driver_name,
        driver_contact: driverData.driver_contact,
      });
      console.log('배차 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error('배차 처리에 실패했습니다');
      }
    } catch (error) {
      console.error('배차 처리 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 대시보드 삭제
   * @param {Array<number>} dashboardIds - 삭제할 대시보드 ID 배열
   * @returns {Promise<boolean>} - 삭제 성공 여부
   */
  async deleteDashboards(dashboardIds) {
    try {
      console.log('삭제 요청 ID 목록:', dashboardIds);
      const response = await axios.delete('/dashboard', {
        data: dashboardIds,
      });
      console.log('삭제 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      return response.data && response.data.success;
    } catch (error) {
      console.error('대시보드 삭제 실패:', error.response?.data || error);
      throw error;
    }
  }
}

export default new DashboardService();

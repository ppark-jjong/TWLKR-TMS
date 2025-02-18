// frontend/src/services/DashboardService.js
import axios from 'axios';
import message, { MessageKeys, MessageTemplates } from '../utils/message';

class DashboardService {
  // 일반 사용자용 대시보드 목록 조회 (하루 단위)
  async getDashboardList(date) {
    try {
      const formattedDate = date.format('YYYY-MM-DD');
      const response = await axios.get('/dashboard/list', {
        params: {
          date: formattedDate
        }
      });
      return response.data || [];
    } catch (error) {
      throw error;
    }
  }

  // 관리자용 대시보드 목록 조회 (기간 단위)
  async getAdminDashboardList(startDate, endDate) {
    try {
      const response = await axios.get('/dashboard/admin/list', {
        params: {
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD')
        }
      });
      return response.data || [];
    } catch (error) {
      throw error;
    }
  }

  async getDashboardDetail(dashboardId) {
    try {
      const response = await axios.get(`/dashboard/${dashboardId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createDashboard(dashboardData) {
    try {
      const response = await axios.post('/dashboard', dashboardData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateStatus(dashboardId, newStatus, isAdmin = false) {
    try {
      const response = await axios.patch(
        `/dashboard/${dashboardId}/status`,
        { 
          status: newStatus,
          is_admin: isAdmin
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateRemark(dashboardId, remark) {
    try {
      const response = await axios.patch(
        `/dashboard/${dashboardId}/remark`,
        { remark }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

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

  async getDateRange() {
    try {
      const response = await axios.get('/dashboard/date-range');
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new DashboardService();
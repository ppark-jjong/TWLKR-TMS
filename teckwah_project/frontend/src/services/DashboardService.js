// frontend/src/services/DashboardService.js
import axios from 'axios';

class DashboardService {
  async getDashboardList(date) {
    try {
      // response.data.data가 자동으로 반환됨 (interceptor에 의해)
      return await axios.get('/dashboard/list', {
        params: {
          date: date.format('YYYY-MM-DD')
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getAdminDashboardList(startDate, endDate) {
    try {
      return await axios.get('/dashboard/admin/list', {
        params: {
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD')
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getDashboardDetail(dashboardId) {
    try {
      return await axios.get(`/dashboard/${dashboardId}`);
    } catch (error) {
      throw error;
    }
  }

  async updateStatus(dashboardId, status, isAdmin = false) {
    try {
      return await axios.patch(
        `/dashboard/${dashboardId}/status`,
        { 
          status,
          is_admin: isAdmin
        }
      );
    } catch (error) {
      throw error;
    }
  }

  async updateRemark(dashboardId, remark) {
    try {
      return await axios.patch(
        `/dashboard/${dashboardId}/remark`,
        { remark }
      );
    } catch (error) {
      throw error;
    }
  }

  async assignDriver(driverData) {
    try {
      return await axios.post('/dashboard/assign', {
        dashboard_ids: driverData.dashboard_ids,
        driver_name: driverData.driver_name,
        driver_contact: driverData.driver_contact
      });
    } catch (error) {
      throw error;
    }
  }

  async getDateRange() {
    try {
      return await axios.get('/dashboard/date-range');
    } catch (error) {
      throw error;
    }
  }
}

export default new DashboardService();
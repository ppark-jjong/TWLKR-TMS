// frontend/src/services/DashboardService.js
import axios from 'axios';
import message, { MessageKeys, MessageTemplates } from '../utils/message';
import ErrorHandler from '../utils/ErrorHandler';

class DashboardService {
  async getDashboardList(date) {
    try {
      const response = await axios.get('/dashboard/list', {
        params: {
          date: date.format('YYYY-MM-DD')
        }
      });
      return response.data || [];
    } catch (error) {
      ErrorHandler.handle(error, 'dashboard-list');
      throw error;
    }
  }

  async getDashboardDetail(dashboardId) {
    try {
      const response = await axios.get(`/dashboard/${dashboardId}`);
      if (!response.data) {
        throw new Error('대시보드 정보를 찾을 수 없습니다');
      }
      return response.data;
    } catch (error) {
      ErrorHandler.handle(error, 'dashboard-detail');
      throw error;
    }
  }

  async createDashboard(dashboardData) {
    try {
      const response = await axios.post('/dashboard', dashboardData);
      return response.data;
    } catch (error) {
      ErrorHandler.handle(error, 'dashboard-create');
      throw error;
    }
  }

  async updateStatus(dashboardId, newStatus) {
    try {
      const response = await axios.patch(
        `/dashboard/${dashboardId}/status`,
        {
          status : newStatus 
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
      ErrorHandler.handle(error, 'dashboard-assign');
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
      ErrorHandler.handle(error, 'dashboard-delete');
      throw error;
    }
  }
}

export default new DashboardService();
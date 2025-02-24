// frontend/src/services/DashboardService.js
import axios from 'axios';
import message from '../utils/message';
import { MessageKeys, MessageTemplates } from '../utils/message';

class DashboardService {
  async getDashboardList(date) {
    const key = MessageKeys.DASHBOARD.LOAD;
    try {
      message.loading('데이터 조회 중...', key);
      const response = await axios.get(`/dashboard/list`, {
        params: { date },
      });

      if (!response.data.data.items?.length) {
        message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
        return { items: [], dateRange: response.data.data.date_range };
      }

      message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
      return response.data.data;
    } catch (error) {
      message.error(MessageTemplates.DATA.LOAD_ERROR, key);
      throw error;
    }
  }

  async getAdminDashboardList(startDate, endDate) {
    const key = MessageKeys.DASHBOARD.LOAD;
    try {
      message.loading('데이터 조회 중...', key);
      const response = await axios.get(`/dashboard/admin/list`, {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      if (!response.data.data.items?.length) {
        message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
        return { items: [], dateRange: response.data.data.date_range };
      }

      message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
      return response.data.data;
    } catch (error) {
      message.error(MessageTemplates.DATA.LOAD_ERROR, key);
      throw error;
    }
  }

  async getDashboardDetail(dashboardId) {
    const key = MessageKeys.DASHBOARD.DETAIL;
    try {
      message.loading('상세 정보 조회 중...', key);
      const response = await axios.get(`/dashboard/${dashboardId}`);
      message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
      return response.data.data;
    } catch (error) {
      message.error(MessageTemplates.DASHBOARD.DETAIL_ERROR, key);
      throw error;
    }
  }

  async createDashboard(dashboardData) {
    const key = MessageKeys.DASHBOARD.CREATE;
    try {
      message.loading('대시보드 생성 중...', key);
      const response = await axios.post('/dashboard', dashboardData);
      message.success(MessageTemplates.DASHBOARD.CREATE_SUCCESS, key);
      return response.data.data;
    } catch (error) {
      message.error(MessageTemplates.DASHBOARD.CREATE_ERROR, key);
      throw error;
    }
  }

  async updateStatus(dashboardId, status) {
    const key = MessageKeys.DASHBOARD.STATUS;
    try {
      message.loading('상태 변경 중...', key);
      const response = await axios.patch(`/dashboard/${dashboardId}/status`, {
        status,
      });
      message.success(MessageTemplates.DASHBOARD.STATUS_SUCCESS(status), key);
      return response.data.data;
    } catch (error) {
      message.error(MessageTemplates.DASHBOARD.STATUS_ERROR, key);
      throw error;
    }
  }

  async assignDriver(assignmentData) {
    const key = MessageKeys.DASHBOARD.ASSIGN;
    try {
      message.loading('배차 처리 중...', key);
      const response = await axios.post('/dashboard/assign', assignmentData);
      message.success(MessageTemplates.DASHBOARD.ASSIGN_SUCCESS, key);
      return response.data.data;
    } catch (error) {
      message.error(MessageTemplates.DASHBOARD.ASSIGN_ERROR, key);
      throw error;
    }
  }

  async updateRemark(dashboardId, remark) {
    const key = MessageKeys.DASHBOARD.MEMO;
    try {
      message.loading('메모 업데이트 중...', key);
      const response = await axios.patch(`/dashboard/${dashboardId}/remark`, {
        remark,
      });
      message.success(MessageTemplates.DASHBOARD.REMARK_SUCCESS, key);
      return response.data.data;
    } catch (error) {
      message.error(MessageTemplates.DASHBOARD.REMARK_ERROR, key);
      throw error;
    }
  }
}

export default new DashboardService();

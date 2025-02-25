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
        withCredentials: true,
      });

      // 응답 데이터 안전 검증
      if (!response.data || !response.data.data) {
        console.error('Invalid response format:', response);
        message.error('서버 응답 형식이 올바르지 않습니다', key);
        return { items: [], dateRange: null };
      }

      const { data } = response.data;

      if (!data.items || !data.items.length) {
        message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
        return { items: [], dateRange: data.date_range || null };
      }

      message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
      return data;
    } catch (error) {
      console.error('Dashboard list fetch error:', error);
      message.error(MessageTemplates.DATA.LOAD_ERROR, key);
      return { items: [], dateRange: null };
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
        withCredentials: true,
      });

      // 응답 데이터 안전 검증
      if (!response.data || !response.data.data) {
        console.error('Invalid response format:', response);
        message.error('서버 응답 형식이 올바르지 않습니다', key);
        return { items: [], dateRange: null };
      }

      const { data } = response.data;

      if (!data.items || !data.items.length) {
        message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
        return { items: [], dateRange: data.date_range || null };
      }

      message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
      return data;
    } catch (error) {
      console.error('Admin dashboard list fetch error:', error);
      message.error(MessageTemplates.DATA.LOAD_ERROR, key);
      return { items: [], dateRange: null };
    }
  }

  async getDashboardDetail(dashboardId) {
    const key = MessageKeys.DASHBOARD.DETAIL;
    try {
      message.loading('상세 정보 조회 중...', key);
      const response = await axios.get(`/dashboard/${dashboardId}`, {
        withCredentials: true,
      });

      if (!response.data || !response.data.data) {
        console.error('Invalid detail response format:', response);
        message.error('상세 정보 조회 중 오류가 발생했습니다', key);
        throw new Error('Invalid response format');
      }

      message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
      return response.data.data;
    } catch (error) {
      console.error('Dashboard detail fetch error:', error);
      message.error(MessageTemplates.DASHBOARD.DETAIL_ERROR, key);
      throw error;
    }
  }

  async createDashboard(dashboardData) {
    const key = MessageKeys.DASHBOARD.CREATE;
    try {
      message.loading('대시보드 생성 중...', key);
      const response = await axios.post('/dashboard', dashboardData, {
        withCredentials: true,
      });

      if (!response.data || !response.data.data) {
        console.error('Invalid create dashboard response:', response);
        message.error('대시보드 생성 중 오류가 발생했습니다', key);
        throw new Error('Invalid response format');
      }

      message.success(MessageTemplates.DASHBOARD.CREATE_SUCCESS, key);
      return response.data.data;
    } catch (error) {
      console.error('Dashboard create error:', error);
      message.error(MessageTemplates.DASHBOARD.CREATE_ERROR, key);
      throw error;
    }
  }

  async updateStatus(dashboardId, status) {
    const key = MessageKeys.DASHBOARD.STATUS;
    try {
      message.loading('상태 변경 중...', key);
      const response = await axios.patch(
        `/dashboard/${dashboardId}/status`,
        {
          status,
        },
        {
          withCredentials: true,
        }
      );

      if (!response.data || !response.data.data) {
        console.error('Invalid status update response:', response);
        message.error('상태 변경 중 오류가 발생했습니다', key);
        throw new Error('Invalid response format');
      }

      message.success(MessageTemplates.DASHBOARD.STATUS_SUCCESS(status), key);
      return response.data.data;
    } catch (error) {
      console.error('Status update error:', error);
      message.error(MessageTemplates.DASHBOARD.STATUS_ERROR, key);
      throw error;
    }
  }

  async assignDriver(assignmentData) {
    const key = MessageKeys.DASHBOARD.ASSIGN;
    try {
      message.loading('배차 처리 중...', key);
      const response = await axios.post('/dashboard/assign', assignmentData, {
        withCredentials: true,
      });

      if (!response.data || !response.data.data) {
        console.error('Invalid assign driver response:', response);
        message.error('배차 처리 중 오류가 발생했습니다', key);
        throw new Error('Invalid response format');
      }

      message.success(MessageTemplates.DASHBOARD.ASSIGN_SUCCESS, key);
      return response.data.data;
    } catch (error) {
      console.error('Assign driver error:', error);
      message.error(MessageTemplates.DASHBOARD.ASSIGN_ERROR, key);
      throw error;
    }
  }

  async updateRemark(dashboardId, remark) {
    const key = MessageKeys.DASHBOARD.MEMO;
    try {
      message.loading('메모 업데이트 중...', key);
      const response = await axios.patch(
        `/dashboard/${dashboardId}/remark`,
        {
          remark,
        },
        {
          withCredentials: true,
        }
      );

      if (!response.data || !response.data.data) {
        console.error('Invalid update remark response:', response);
        message.error('메모 업데이트 중 오류가 발생했습니다', key);
        throw new Error('Invalid response format');
      }

      message.success(MessageTemplates.DASHBOARD.REMARK_SUCCESS, key);
      return response.data.data;
    } catch (error) {
      console.error('Update remark error:', error);
      message.error(MessageTemplates.DASHBOARD.REMARK_ERROR, key);
      throw error;
    }
  }
}

export default new DashboardService();

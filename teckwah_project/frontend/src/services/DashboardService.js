// frontend/src/services/DashboardService.js
import axios from "axios";

class DashboardService {
  async getDashboardList(date) {
    try {
      // 날짜 형식 확인
      const formattedDate = date.format("YYYY-MM-DD");
      console.log("요청 날짜:", formattedDate);

      const response = await axios.get("/dashboard/list", {
        params: {
          date: formattedDate,
        },
      });

      console.log("대시보드 목록 응답:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("대시보드 목록 조회 실패:", error.response?.data || error);
      throw error;
    }
  }

  async getAdminDashboardList(startDate, endDate) {
    try {
      const response = await axios.get("/dashboard/admin/list", {
        params: {
          start_date: startDate.format("YYYY-MM-DD"),
          end_date: endDate.format("YYYY-MM-DD"),
        },
      });

      console.log("관리자 대시보드 목록 응답:", response.data);
      return response.data.data;
    } catch (error) {
      console.error(
        "관리자 대시보드 목록 조회 실패:",
        error.response?.data || error
      );
      throw error;
    }
  }

  async getDashboardDetail(dashboardId) {
    try {
      const response = await axios.get(`/dashboard/${dashboardId}`);
      console.log("대시보드 상세 정보:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("대시보드 상세 조회 실패:", error.response?.data || error);
      throw error;
    }
  }

  async createDashboard(dashboardData) {
    try {
      console.log("대시보드 생성 요청 데이터:", dashboardData);
      const response = await axios.post("/dashboard", dashboardData);
      console.log("대시보드 생성 응답:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("대시보드 생성 실패:", error.response?.data || error);
      throw error;
    }
  }

  async updateStatus(dashboardId, status, isAdmin = false) {
    try {
      const response = await axios.patch(`/dashboard/${dashboardId}/status`, {
        status,
        is_admin: isAdmin,
      });
      console.log("상태 업데이트 응답:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("상태 업데이트 실패:", error.response?.data || error);
      throw error;
    }
  }

  async updateRemark(dashboardId, remark) {
    try {
      const response = await axios.patch(`/dashboard/${dashboardId}/remark`, {
        remark,
      });
      console.log("메모 업데이트 응답:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("메모 업데이트 실패:", error.response?.data || error);
      throw error;
    }
  }

  async assignDriver(driverData) {
    try {
      console.log("배차 요청 데이터:", driverData);
      const response = await axios.post("/dashboard/assign", {
        dashboard_ids: driverData.dashboard_ids,
        driver_name: driverData.driver_name,
        driver_contact: driverData.driver_contact,
      });
      console.log("배차 응답:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("배차 처리 실패:", error.response?.data || error);
      throw error;
    }
  }

  async deleteDashboards(dashboardIds) {
    try {
      console.log("삭제 요청 ID 목록:", dashboardIds);
      const response = await axios.delete("/dashboard", {
        data: dashboardIds,
      });
      console.log("삭제 응답:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("대시보드 삭제 실패:", error.response?.data || error);
      throw error;
    }
  }
}

export default new DashboardService();

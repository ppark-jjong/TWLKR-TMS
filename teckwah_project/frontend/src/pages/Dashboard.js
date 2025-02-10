// src/pages/Dashboard.js
import React, { useState, useEffect, useMemo } from "react";
import { Box, TextField, Button, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { dashboardService } from "../services/dashboardService";
import { driverService } from "../services/driverService";
import { format } from 'date-fns';
import DashboardTable from "../components/dashboard/DashboardTable";
import DashboardToolbar from "../components/dashboard/DashboardToolbar";
import DetailModal from "../components/dashboard/DetailModal";
import CreateModal from "../components/dashboard/CreateModal";
import DriverAssignModal from "../components/dashboard/DriverAssignModal";

/**
 * 대시보드 페이지 컴포넌트
 * @returns {JSX.Element} Dashboard 컴포넌트
 */
function Dashboard() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // 대시보드 데이터 로드
  const loadData = async () => {
    setLoading(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await dashboardService.getList(formattedDate);
      setData(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("대시보드 데이터 로드 실패:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };
  // 기사 목록 로드
  const loadDrivers = async () => {
    try {
      const response = await driverService.getDrivers();
      setDrivers(response);
    } catch (error) {
      console.error("기사 목록 로드 실패:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, [date]);

  // 데이터 필터링
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) {
      console.error("data는 배열이 아닙니다:", data);
      return []; // 빈 배열 반환
    }
    console.log("필터링할 데이터:", data); // 필터링할 데이터 로그 추가
    return data.filter((item) => {
      const matchesSearch =
        searchText === "" || Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchText.toLowerCase())
        );
      const matchesDepartment =
        departmentFilter === "" || item.department === departmentFilter;
      return matchesSearch || matchesDepartment;
    });
  }, [data, searchText, departmentFilter]);

  // 로딩 상태 처리
  if (loading) {
    return <CircularProgress />;
  }


  // 상태 변경 처리
  const handleStatusChange = async (newStatus) => {
    if (!selectedItem) return;
    try {
      await dashboardService.updateStatus(selectedItem.dashboard_id, newStatus);
      loadData();
    } catch (error) {
      console.error("상태 변경 실패:", error);
    }
  };

  // 메모 변경 처리
  const handleRemarkChange = async (newRemark) => {
    if (!selectedItem) return;
    try {
      await dashboardService.updateRemark(selectedItem.dashboard_id, newRemark);
      loadData();
    } catch (error) {
      console.error("메모 변경 실패:", error);
    }
  };

  // 대시보드 생성 처리
  const handleCreate = async (formData) => {
    try {
      await dashboardService.create(formData);
      loadData();
    } catch (error) {
      console.error("대시보드 생성 실패:", error);
    }
  };

  // 기사 배차 처리
  const handleDriverAssign = async ({ driverId, driverRemark }) => {
    try {
      await dashboardService.assignDriver(selectedIds, driverId, driverRemark);
      setSelectedIds([]);
      loadData();
    } catch (error) {
      console.error("기사 배차 실패:", error);
    }
  };

  // 삭제 처리
  const handleDelete = async () => {
    try {
      await dashboardService.deleteDashboards(selectedIds);
      setSelectedIds([]);
      loadData();
    } catch (error) {
      console.error("대시보드 삭제 실패:", error);
    }
  };

  // 배차 버튼 클릭 처리
  const handleAssignClick = async () => {
    await loadDrivers();
    setShowDriverModal(true);
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", padding: 1 }}>
      <DashboardToolbar
        selectedDate={date}
        onDateChange={setDate}
        searchText={searchText}
        onSearchChange={setSearchText}
        departmentFilter={departmentFilter}
        onDepartmentFilterChange={setDepartmentFilter}
        onRefresh={loadData}
        onAdd={() => setShowCreateModal(true)}
        onDelete={handleDelete}
        showDeleteButton={selectedIds.length > 0}
      />

      {filteredData.length === 0 ? (
        <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="h6" color="textSecondary">
            해당 날짜에 데이터가 없습니다.
          </Typography>
        </Box>
      ) : (
        <DashboardTable
          data={filteredData}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onRowClick={setSelectedItem}
          sx={{ width: '100%', marginTop: 1 }}
        />
      )}

      {selectedItem && (
        <DetailModal
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          data={selectedItem}
          onStatusChange={handleStatusChange}
          onRemarkChange={handleRemarkChange}
        />
      )}

      <CreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        userDepartment={user?.department}
      />

      <DriverAssignModal
        open={showDriverModal}
        onClose={() => setShowDriverModal(false)}
        selectedOrders={selectedIds.map(
          (id) => data.find((item) => item.dashboard_id === id)?.order_no
        )}
        drivers={drivers}
        onAssign={handleDriverAssign}
      />
    </Box>
  );
}

export default Dashboard;

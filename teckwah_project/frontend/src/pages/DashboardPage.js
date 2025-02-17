// frontend/src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Layout, message } from 'antd';
import dayjs from 'dayjs';
import DashboardTable from '../components/dashboard/DashboardTable';
import CreateDashboardModal from '../components/dashboard/CreateDashboardModal';
import AssignDriverModal from '../components/dashboard/AssignDriverModal';
import DashboardDetailModal from '../components/dashboard/DashboardDetailModal';
import LoadingSpin from '../components/common/LoadingSpin';
import DashboardService from '../services/DashboardService';
import { useDashboard } from '../contexts/DashboardContext';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage = () => {
  const { 
    dashboards, 
    loading, 
    fetchDashboards,
    updateMultipleDashboards,
    removeDashboards 
  } = useDashboard();
  
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const { user } = useAuth();

  // 초기 데이터 로드
  useEffect(() => {
    loadDashboardData(selectedDate);
  }, []);

  // 대시보드 데이터 로드 함수
  const loadDashboardData = async (date) => {
    try {
      await fetchDashboards(date);
      message.success('데이터를 조회했습니다');
    } catch (error) {
      message.error('데이터 조회 중 오류가 발생했습니다');
    }
  };

  // 날짜 변경 처리
  const handleDateChange = (date) => {
    const newDate = date || dayjs();
    setSelectedDate(newDate);
    setSelectedRows([]);
    loadDashboardData(newDate);
  };

  // 새로고침 처리
  const handleRefresh = () => {
    loadDashboardData(selectedDate);
  };

  // 삭제 처리
  const handleDelete = async () => {
    if (selectedRows.length === 0) {
      message.warning('삭제할 항목을 선택해주세요');
      return;
    }

    const nonWaitingItems = selectedRows.filter(row => row.status !== 'WAITING');
    if (nonWaitingItems.length > 0) {
      const orderNos = nonWaitingItems.map(row => row.order_no).join(', ');
      message.error(`다음 주문은 대기 상태가 아니어서 삭제할 수 없습니다: ${orderNos}`);
      return;
    }

    try {
      const dashboardIds = selectedRows.map(row => row.dashboard_id);
      await DashboardService.deleteDashboards(dashboardIds);
      message.success('선택한 항목이 삭제되었습니다');
      removeDashboards(dashboardIds);
      setSelectedRows([]);
      handleRefresh();
    } catch (error) {
      message.error('삭제 중 오류가 발생했습니다');
    }
  };

  // 상세 정보 조회
  const handleRowClick = async (record) => {
    try {
      const detailData = await DashboardService.getDashboardDetail(record.dashboard_id);
      setSelectedDashboard(detailData);
      setShowDetailModal(true);
    } catch (error) {
      message.error('상세 정보 조회 중 오류가 발생했습니다');
    }
  };

  return (
    <Layout.Content style={{ padding: '24px' }}>
      <DashboardTable
        dataSource={dashboards}
        loading={loading}
        selectedRows={selectedRows}
        onSelectRows={setSelectedRows}
        onRowClick={handleRowClick}
        onRefresh={handleRefresh}
        onCreateClick={() => setShowCreateModal(true)}
        onAssignClick={() => setShowAssignModal(true)}
        onDeleteClick={handleDelete}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
      />

      {showCreateModal && (
        <CreateDashboardModal
          visible={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          onSuccess={() => {
            message.success('대시보드가 생성되었습니다');
            setShowCreateModal(false);
            handleRefresh();
          }}
          userDepartment={user.user_department}
        />
      )}

      {showAssignModal && (
        <AssignDriverModal
          visible={showAssignModal}
          onCancel={() => setShowAssignModal(false)}
          onSuccess={() => {
            message.success('배차가 완료되었습니다');
            setShowAssignModal(false);
            setSelectedRows([]);
            handleRefresh();
          }}
          selectedRows={selectedRows}
        />
      )}

      {showDetailModal && selectedDashboard && (
        <DashboardDetailModal
          visible={showDetailModal}
          dashboard={selectedDashboard}
          onCancel={() => {
            setShowDetailModal(false);
            setSelectedDashboard(null);
          }}
          onSuccess={() => {
            message.success('대시보드가 업데이트되었습니다');
            handleRefresh();
          }}
        />
      )}
    </Layout.Content>
  );
};

export default DashboardPage;
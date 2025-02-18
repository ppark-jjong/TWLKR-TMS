// frontend/src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import dayjs from 'dayjs';
import DashboardTable from '../components/dashboard/DashboardTable';
import CreateDashboardModal from '../components/dashboard/CreateDashboardModal';
import AssignDriverModal from '../components/dashboard/AssignDriverModal';
import DashboardDetailModal from '../components/dashboard/DashboardDetailModal';
import LoadingSpin from '../components/common/LoadingSpin';
import DashboardService from '../services/DashboardService';
import { useDashboard } from '../contexts/DashboardContext';
import { useAuth } from '../contexts/AuthContext';
import message, { MessageKeys, MessageTemplates } from '../utils/message';

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
    const key = MessageKeys.DASHBOARD.LOAD;
    try {
      message.loading('데이터 조회 중...', key);
      await fetchDashboards(date);
      message.loadingToSuccess(MessageTemplates.DASHBOARD.LOAD_SUCCESS, key);
    } catch (error) {
      message.loadingToError(MessageTemplates.DASHBOARD.LOAD_FAIL, key);
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
    const key = MessageKeys.DASHBOARD.DELETE;
    if (selectedRows.length === 0) {
      message.warning('삭제할 항목을 선택해주세요', key);
      return;
    }

    const nonWaitingItems = selectedRows.filter(row => row.status !== 'WAITING');
    if (nonWaitingItems.length > 0) {
      const orderNos = nonWaitingItems.map(row => row.order_no).join(', ');
      message.error(
        MessageTemplates.DASHBOARD.VALIDATION.WAITING_STATUS(orderNos),
        key
      );
      return;
    }

    try {
      message.loading('삭제 처리 중...', key);
      const dashboardIds = selectedRows.map(row => row.dashboard_id);
      await DashboardService.deleteDashboards(dashboardIds);
      removeDashboards(dashboardIds);
      setSelectedRows([]);
      message.loadingToSuccess(MessageTemplates.DASHBOARD.DELETE_SUCCESS, key);
      handleRefresh();
    } catch (error) {
      message.loadingToError(MessageTemplates.DASHBOARD.DELETE_FAIL, key);
    }
  };

  // 상세 정보 조회
  const handleRowClick = async (record) => {
    const key = MessageKeys.DASHBOARD.DETAIL;
    try {
      message.loading('상세 정보 조회 중...', key);
      const detailData = await DashboardService.getDashboardDetail(record.dashboard_id);
      setSelectedDashboard(detailData);
      setShowDetailModal(true);
      message.loadingToSuccess('상세 정보를 조회했습니다', key);
    } catch (error) {
      message.loadingToError(MessageTemplates.DASHBOARD.DETAIL_FAIL, key);
    }
  };

  return (
    <Layout.Content style={{ padding: '12px', backgroundColor: 'white' }}>
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
            handleRefresh();
          }}
        />
      )}
    </Layout.Content>
  );
};

export default DashboardPage;
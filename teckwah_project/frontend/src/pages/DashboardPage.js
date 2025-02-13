// frontend/src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Layout, DatePicker, Button, message } from 'antd';
import { PlusOutlined, CarOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
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
  const { logout, user } = useAuth();

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
      fetchDashboards(); // 삭제 후 대시보드 목록 새로고침
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

  const handleDateChange = (date) => {
    setSelectedDate(date || dayjs());
    setSelectedRows([]);
  };

  // 대시보드 생성 후 데이터 새로고침
  const handleCreateSuccess = () => {
    fetchDashboards(); // 생성 후 대시보드 목록 새로고침
  };

  useEffect(() => {
    fetchDashboards(); // 컴포넌트 마운트 시 대시보드 목록 조회
  }, []);

  return (
    <Layout.Content style={{ padding: '24px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <DatePicker
            value={selectedDate}
            onChange={handleDateChange}
            allowClear={false}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
          >
            생성
          </Button>
          <Button
            icon={<CarOutlined />}
            onClick={() => setShowAssignModal(true)}
            disabled={selectedRows.length === 0}
          >
            배차
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={handleDelete}
            disabled={selectedRows.length === 0}
            danger
          >
            삭제
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDashboards} // 수동 새로고침
          >
            새로고침
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSpin />
      ) : (
        <DashboardTable
          dataSource={dashboards}
          selectedRows={selectedRows}
          onSelectRows={setSelectedRows}
          onRowClick={handleRowClick}
        />
      )}

      {/* 모달 컴포넌트들 */}
      {showCreateModal && (
        <CreateDashboardModal
          visible={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
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
            fetchDashboards(); // 배차 후 대시보드 목록 새로고침
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
          onSuccess={() => fetchDashboards()} // 상세 조회 후 대시보드 목록 새로고침
        />
      )}
    </Layout.Content>
  );
};

export default DashboardPage;
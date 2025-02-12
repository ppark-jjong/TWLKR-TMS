// frontend/src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Layout, DatePicker, Button, message } from 'antd';
import { PlusOutlined, CarOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DashboardTable from '../components/dashboard/DashboardTable';
import CreateDashboardModal from '../components/dashboard/CreateDashboardModal';
import AssignDriverModal from '../components/dashboard/AssignDriverModal';
import DashboardDetailModal from '../components/dashboard/DashboardDetailModal';
import DashboardService from '../services/DashboardService';
import { useDashboard } from '../contexts/DashboardContext';
import AuthService from '../services/AuthService';

/**
 * 대시보드 페이지 컴포넌트
 */
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
  const user = AuthService.getCurrentUser();

  // 폴링 설정
  useEffect(() => {
    fetchDashboards(selectedDate.toDate());
    const timer = setInterval(() => {
      fetchDashboards(selectedDate.toDate());
    }, 30000); // 30초마다 갱신

    return () => clearInterval(timer);
  }, [selectedDate, fetchDashboards]);

  // 선택된 대시보드 삭제
  const handleDelete = async () => {
    if (selectedRows.length === 0) {
      message.warning('삭제할 항목을 선택해주세요');
      return;
    }

    const hasNonWaiting = selectedRows.some(row => row.status !== 'WAITING');
    if (hasNonWaiting) {
      message.error('대기 상태인 항목만 삭제할 수 있습니다');
      return;
    }

    try {
      const dashboardIds = selectedRows.map(row => row.dashboard_id);
      await DashboardService.deleteDashboards(dashboardIds);
      message.success('선택한 항목이 삭제되었습니다');
      removeDashboards(dashboardIds);
      setSelectedRows([]);
    } catch (error) {
      message.error('삭제 중 오류가 발생했습니다');
    }
  };

  // 대시보드 상세 정보 조회
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
    <Layout.Content>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            style={{ marginRight: 8 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
            style={{ marginRight: 8 }}
          >
            생성
          </Button>
          <Button
            icon={<CarOutlined />}
            onClick={() => setShowAssignModal(true)}
            disabled={selectedRows.length === 0}
            style={{ marginRight: 8 }}
          >
            배차
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={handleDelete}
            disabled={selectedRows.length === 0}
            danger
            style={{ marginRight: 8 }}
          >
            삭제
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchDashboards(selectedDate.toDate())}
          >
            새로고침
          </Button>
        </div>
      </div>

      <DashboardTable
        dataSource={dashboards}
        loading={loading}
        selectedRows={selectedRows}
        onSelectRows={setSelectedRows}
        onRowClick={handleRowClick}
      />

      {showCreateModal && (
        <CreateDashboardModal
          visible={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchDashboards(selectedDate.toDate());
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
            fetchDashboards(selectedDate.toDate());
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
          onSuccess={() => fetchDashboards(selectedDate.toDate())}
        />
      )}
    </Layout.Content>
  );
};

export default DashboardPage;
// frontend/src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Layout, DatePicker, Space, Button, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DashboardTable from '../components/dashboard/DashboardTable';
import CreateDashboardModal from '../components/dashboard/CreateDashboardModal';
import AssignDriverModal from '../components/dashboard/AssignDriverModal';
import DashboardDetailModal from '../components/dashboard/DashboardDetailModal';
import DateRangeInfo from '../components/common/DateRangeInfo';
import LoadingSpin from '../components/common/LoadingSpin';
import DashboardService from '../services/DashboardService';
import { useDashboard } from '../contexts/DashboardContext';
import { useAuth } from '../contexts/AuthContext';
import message, { MessageKeys, MessageTemplates } from '../utils/message';
import { FONT_STYLES } from '../utils/Constants';

const DashboardPage = () => {
  // 상태 관리
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { user } = useAuth();
  const { dashboards, updateMultipleDashboards } = useDashboard();
  const pageSize = 50;

  // 초기 데이터 로드
  useEffect(() => {
    loadDateRange();
    loadDashboardData(selectedDate);
  }, []);

  // 날짜 범위 로드
  const loadDateRange = async () => {
    try {
      const response = await DashboardService.getDateRange();
      setDateRange(response);
    } catch (error) {
      console.error('Failed to load date range:', error);
      message.error('조회 가능 기간을 불러오는데 실패했습니다');
    }
  };

  // 대시보드 데이터 로드
  const loadDashboardData = async (date) => {
    const key = MessageKeys.DASHBOARD.LOAD;
    try {
      setLoading(true);
      message.loading('데이터 조회 중...', key);

      const response = await DashboardService.getDashboardList(date);
      updateMultipleDashboards(response.items);

      message.loadingToSuccess(MessageTemplates.DASHBOARD.LOAD_SUCCESS, key);
    } catch (error) {
      message.loadingToError(MessageTemplates.DASHBOARD.LOAD_FAIL, key);
    } finally {
      setLoading(false);
    }
  };

  // 날짜 변경 핸들러
  const handleDateChange = (date) => {
    const newDate = date || dayjs();
    setSelectedDate(newDate);
    setSelectedRows([]);
    loadDashboardData(newDate);
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    loadDashboardData(selectedDate);
  };

  // 행 클릭 핸들러
  const handleRowClick = async (record) => {
    const key = MessageKeys.DASHBOARD.DETAIL;
    try {
      message.loading('상세 정보 조회 중...', key);
      const detailData = await DashboardService.getDashboardDetail(
        record.dashboard_id
      );
      setSelectedDashboard(detailData);
      setShowDetailModal(true);
      message.loadingToSuccess('상세 정보를 조회했습니다', key);
    } catch (error) {
      message.loadingToError(MessageTemplates.DASHBOARD.DETAIL_FAIL, key);
    }
  };

  return (
    <Layout.Content style={{ padding: '12px', backgroundColor: 'white' }}>
      <div style={{ marginBottom: '16px' }}>
        <Space
          size="large"
          align="center"
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <Space size="middle">
            <DatePicker
              value={selectedDate}
              onChange={handleDateChange}
              style={{ width: 280 }}
              size="large"
            />
            <DateRangeInfo dateRange={dateRange} loading={loading} />
          </Space>

          <Space size="middle">
            <Button
              type="primary"
              onClick={() => setShowCreateModal(true)}
              size="large"
            >
              신규 등록
            </Button>
            <Button
              onClick={() => setShowAssignModal(true)}
              disabled={selectedRows.length === 0}
              size="large"
            >
              배차
            </Button>
            <Tooltip title="새로고침">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                size="large"
              />
            </Tooltip>
          </Space>
        </Space>
      </div>

      <DashboardTable
        dataSource={dashboards}
        loading={loading}
        selectedRows={selectedRows}
        onSelectRows={setSelectedRows}
        onRowClick={handleRowClick}
        onRefresh={handleRefresh}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        isAdminPage={false}
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
          isAdmin={false}
        />
      )}
    </Layout.Content>
  );
};

export default DashboardPage;

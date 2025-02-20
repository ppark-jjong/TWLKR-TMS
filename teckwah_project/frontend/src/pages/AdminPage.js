// frontend/src/pages/AdminPage.js
import React, { useState, useEffect } from 'react';
import { Layout, DatePicker, Space, Typography, Pagination } from 'antd';
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
import { FONT_STYLES } from '../utils/Constants';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const AdminPage = () => {
  const { 
    dashboards, 
    loading,
    updateMultipleDashboards
  } = useDashboard();
  
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'day'), dayjs()]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [availableDateRange, setAvailableDateRange] = useState(null);
  const { user } = useAuth();
  const pageSize = 50;

  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      loadDashboardData(dateRange[0], dateRange[1]);
    }
  }, []);

  const loadDashboardData = async (startDate, endDate) => {
    const key = MessageKeys.DASHBOARD.LOAD;
    try {
      message.loading('데이터 조회 중...', key);
      const response = await DashboardService.getAdminDashboardList(startDate, endDate);
      setAvailableDateRange(response.date_range);
      updateMultipleDashboards(response.items);
      message.loadingToSuccess(MessageTemplates.DASHBOARD.LOAD_SUCCESS, key);
    } catch (error) {
      message.loadingToError(MessageTemplates.DASHBOARD.LOAD_FAIL, key);
    }
  };

  const handleDateRangeChange = (dates) => {
    if (!dates || !dates[0] || !dates[1]) return;
    setDateRange(dates);
    setSelectedRows([]);
    loadDashboardData(dates[0], dates[1]);
  };

  const handleRefresh = () => {
    if (dateRange[0] && dateRange[1]) {
      loadDashboardData(dateRange[0], dateRange[1]);
    }
  };

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

  // 날짜 선택 제한 로직
  const disabledDate = (current) => {
    if (!availableDateRange) return false;
    return current.isBefore(dayjs(availableDateRange.oldest_date)) || 
           current.isAfter(dayjs(availableDateRange.latest_date));
  };

  // 필터링된 데이터
  const filteredData = dashboards || [];

  return (
    <Layout.Content style={{ padding: '12px', backgroundColor: 'white' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Space size="large" align="center">
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              disabledDate={disabledDate}
              allowClear={false}
              style={{ width: 360 }}
              size="large"
            />
            {availableDateRange && (
              <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
                조회 가능 기간: {availableDateRange.oldest_date} ~ {availableDateRange.latest_date}
              </Text>
            )}
          </Space>
          <Pagination
            current={currentPage}
            onChange={setCurrentPage}
            pageSize={pageSize}
            total={filteredData.length}
            showTotal={(total) => `총 ${total}건`}
            showSizeChanger={false}
            style={{ marginBottom: 0 }}
          />
        </div>
      </div>

      <DashboardTable
        dataSource={filteredData}
        loading={loading}
        selectedRows={selectedRows}
        onSelectRows={setSelectedRows}
        onRowClick={handleRowClick}
        onRefresh={handleRefresh}
        onCreateClick={() => setShowCreateModal(true)}
        onAssignClick={() => setShowAssignModal(true)}
        currentPage={currentPage}
        pageSize={pageSize}
        isAdminPage={true}
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
          isAdmin={true}
        />
      )}
    </Layout.Content>
  );
};

export default AdminPage;
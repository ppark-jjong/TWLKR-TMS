// frontend/src/pages/DashboardPage.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  DatePicker,
  Space,
  Button,
  Tooltip,
  Empty,
  Spin,
  Result,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DashboardTable from '../components/dashboard/DashboardTable';
import CreateDashboardModal from '../components/dashboard/CreateDashboardModal';
import AssignDriverModal from '../components/dashboard/AssignDriverModal';
import DashboardDetailModal from '../components/dashboard/DashboardDetailModal';
import DateRangeInfo from '../components/common/DateRangeInfo';
import DashboardService from '../services/DashboardService';
import { useDashboard } from '../contexts/DashboardContext';
import { useAuth } from '../contexts/AuthContext';
import message, { MessageKeys, MessageTemplates } from '../utils/message';
import { FONT_STYLES } from '../utils/Constants';
import ErrorHandler from '../utils/ErrorHandler';

const DashboardPage = () => {
  // 상태 관리
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { user } = useAuth();
  const { dashboards, updateMultipleDashboards } = useDashboard();
  const pageSize = 50;

  // 대시보드 데이터 로드
  const loadDashboardData = useCallback(
    async (date) => {
      const key = MessageKeys.DASHBOARD.LOAD;
      setError(null);

      try {
        setLoading(true);
        message.loading('데이터 조회 중...', key);

        const response = await DashboardService.getDashboardList(date);
        updateMultipleDashboards(response.items);
        setDateRange(response.date_range);

        if (response.items.length === 0) {
          message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
        } else {
          message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
        }
      } catch (error) {
        setError(error);
        ErrorHandler.handle(error, 'dashboard');
      } finally {
        setLoading(false);
        message.destroy(key);
      }
    },
    [updateMultipleDashboards]
  );

  // 초기 데이터 로드
  useEffect(() => {
    loadDashboardData(selectedDate);
  }, [loadDashboardData, selectedDate]);

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
      message.success('상세 정보를 조회했습니다', key);
    } catch (error) {
      ErrorHandler.handle(error, 'dashboard-detail');
    }
  };

  // 모달 닫기 핸들러
  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowAssignModal(false);
    setShowDetailModal(false);
    setSelectedDashboard(null);
  };

  // 에러 상태 UI
  if (error && !dashboards.length) {
    return (
      <Layout.Content style={{ padding: '12px', backgroundColor: 'white' }}>
        <Result
          status="error"
          title="데이터 로드 실패"
          subTitle="대시보드 데이터를 불러오는 중 오류가 발생했습니다"
          extra={[
            <Button
              key="retry"
              type="primary"
              onClick={handleRefresh}
              icon={<ReloadOutlined />}
            >
              다시 시도
            </Button>,
          ]}
        />
      </Layout.Content>
    );
  }

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
              disabled={loading}
            />
            <DateRangeInfo dateRange={dateRange} loading={loading} />
          </Space>

          <Space size="middle">
            <Button
              type="primary"
              onClick={() => setShowCreateModal(true)}
              size="large"
              disabled={loading}
            >
              신규 등록
            </Button>
            <Button
              onClick={() => setShowAssignModal(true)}
              disabled={selectedRows.length === 0 || loading}
              size="large"
            >
              배차
            </Button>
            <Tooltip title="새로고침">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                size="large"
                loading={loading}
              />
            </Tooltip>
          </Space>
        </Space>
      </div>

      <Spin spinning={loading} tip="데이터 로딩 중...">
        {dashboards.length > 0 ? (
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
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={FONT_STYLES.BODY.MEDIUM}>데이터가 없습니다</span>
            }
          >
            <Button type="primary" onClick={() => setShowCreateModal(true)}>
              새 배송 등록하기
            </Button>
          </Empty>
        )}
      </Spin>

      {showCreateModal && (
        <CreateDashboardModal
          visible={showCreateModal}
          onCancel={handleCloseModals}
          onSuccess={() => {
            handleCloseModals();
            handleRefresh();
          }}
          userDepartment={user.user_department}
        />
      )}

      {showAssignModal && (
        <AssignDriverModal
          visible={showAssignModal}
          onCancel={handleCloseModals}
          onSuccess={() => {
            handleCloseModals();
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
          onCancel={handleCloseModals}
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

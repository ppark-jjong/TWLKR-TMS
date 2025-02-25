// frontend/src/pages/DashboardPage.js
<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { Layout, DatePicker, Space, Button, Tooltip } from 'antd';
import { ReloadOutlined, PlusOutlined, CarOutlined } from '@ant-design/icons';
=======
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
>>>>>>> main
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
  const { dashboards, updateMultipleDashboards, fetchDashboards } =
    useDashboard();
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
<<<<<<< HEAD
    console.log('DashboardPage 마운트');
    loadDateRange();
    loadDashboardData(selectedDate);
  }, []);

  // 날짜 범위 로드
  const loadDateRange = async () => {
    try {
      console.log('날짜 범위 로드 시작');
      const response = await DashboardService.getDateRange();
      console.log('날짜 범위 응답:', response);
      setDateRange(response);
    } catch (error) {
      console.error('날짜 범위 로드 실패:', error);
      message.error('조회 가능 기간을 불러오는데 실패했습니다');
    }
  };

  // 대시보드 데이터 로드
  const loadDashboardData = async (date) => {
    const key = MessageKeys.DASHBOARD.LOAD;
    try {
      setLoading(true);
      message.loading('데이터 조회 중...', key);
      console.log('대시보드 데이터 조회 시작:', date.format('YYYY-MM-DD'));

      await fetchDashboards(date);
      message.loadingToSuccess(MessageTemplates.DASHBOARD.LOAD_SUCCESS, key);
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      message.loadingToError(MessageTemplates.DASHBOARD.LOAD_FAIL, key);
    } finally {
      setLoading(false);
    }
  };
=======
    loadDashboardData(selectedDate);
  }, [loadDashboardData, selectedDate]);
>>>>>>> main

  // 날짜 변경 핸들러
  const handleDateChange = (date) => {
    const newDate = date || dayjs();
    console.log('날짜 변경:', newDate.format('YYYY-MM-DD'));
    setSelectedDate(newDate);
    setSelectedRows([]);
    loadDashboardData(newDate);
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    console.log('새로고침 요청');
    loadDashboardData(selectedDate);
  };

  // 행 클릭 핸들러
  const handleRowClick = async (record) => {
    const key = MessageKeys.DASHBOARD.DETAIL;
    try {
      message.loading('상세 정보 조회 중...', key);
      console.log('행 클릭:', record);

      const detailData = await DashboardService.getDashboardDetail(
        record.dashboard_id
      );
      setSelectedDashboard(detailData);
      setShowDetailModal(true);
      message.success('상세 정보를 조회했습니다', key);
    } catch (error) {
<<<<<<< HEAD
      console.error('상세 정보 조회 실패:', error);
      message.loadingToError(MessageTemplates.DASHBOARD.DETAIL_FAIL, key);
    }
  };

  // 대시보드 생성 성공 핸들러
  const handleCreateSuccess = () => {
    console.log('대시보드 생성 성공');
    setShowCreateModal(false);
    handleRefresh();
  };

  // 배차 성공 핸들러
  const handleAssignSuccess = () => {
    console.log('배차 성공');
    setShowAssignModal(false);
    setSelectedRows([]);
    handleRefresh();
  };

=======
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

>>>>>>> main
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
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
              size="large"
              disabled={loading}
            >
              신규 등록
            </Button>
            <Button
              icon={<CarOutlined />}
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
<<<<<<< HEAD
          onCancel={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
          userDepartment={user?.user_department}
=======
          onCancel={handleCloseModals}
          onSuccess={() => {
            handleCloseModals();
            handleRefresh();
          }}
          userDepartment={user.user_department}
>>>>>>> main
        />
      )}

      {showAssignModal && (
        <AssignDriverModal
          visible={showAssignModal}
<<<<<<< HEAD
          onCancel={() => setShowAssignModal(false)}
          onSuccess={handleAssignSuccess}
=======
          onCancel={handleCloseModals}
          onSuccess={() => {
            handleCloseModals();
            setSelectedRows([]);
            handleRefresh();
          }}
>>>>>>> main
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

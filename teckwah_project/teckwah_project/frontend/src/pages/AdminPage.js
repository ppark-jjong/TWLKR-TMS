// frontend/src/pages/AdminPage.js
import React, { useState, useEffect } from 'react';
import { Layout, DatePicker, Space, Button, Tooltip, Popconfirm } from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  CarOutlined,
} from '@ant-design/icons';
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

const AdminPage = () => {
  // 상태 관리
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [availableDateRange, setAvailableDateRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { user } = useAuth();
<<<<<<< HEAD
  const {
    dashboards,
    updateMultipleDashboards,
    removeDashboards,
    fetchDashboards,
  } = useDashboard();
  const pageSize = 50;

  // 초기 데이터 로드
  useEffect(() => {
    console.log('AdminPage 마운트');
    loadDateRange();
    loadDashboardData(selectedDate);
  }, []);

  // 날짜 범위 로드
  const loadDateRange = async () => {
    try {
      console.log('날짜 범위 로드 시작');
      const response = await DashboardService.getDateRange();
      console.log('날짜 범위 응답:', response);
      setAvailableDateRange(response);
    } catch (error) {
      console.error('날짜 범위 로드 실패:', error);
      message.error('조회 가능 기간을 불러오는데 실패했습니다');
    }
  };

=======
  const { dashboards, updateMultipleDashboards, removeDashboards } = useDashboard();
  const pageSize = 50;

>>>>>>> main
  // 대시보드 데이터 로드
  const loadDashboardData = async (date) => {
    const key = MessageKeys.DASHBOARD.LOAD;
    try {
      setLoading(true);
      message.loading('데이터 조회 중...', key);
      console.log('대시보드 데이터 조회 시작:', date.format('YYYY-MM-DD'));

<<<<<<< HEAD
      await fetchDashboards(date);
=======
      const { items, dateRange: newDateRange } = await DashboardService.getAdminDashboardList(
        startDate,
        endDate
      );
      updateMultipleDashboards(items);
      setAvailableDateRange(newDateRange);

>>>>>>> main
      message.loadingToSuccess(MessageTemplates.DASHBOARD.LOAD_SUCCESS, key);
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      message.loadingToError(MessageTemplates.DASHBOARD.LOAD_FAIL, key);
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  // 날짜 변경 핸들러
  const handleDateChange = (date) => {
    const newDate = date || dayjs();
    console.log('날짜 변경:', newDate.format('YYYY-MM-DD'));
    setSelectedDate(newDate);
=======
  // 초기 데이터 로드
  useEffect(() => {
    loadDashboardData(dateRange[0], dateRange[1]);
  }, []);

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (dates) => {
    if (!dates || !dates[0] || !dates[1]) return;
    setDateRange(dates);
>>>>>>> main
    setSelectedRows([]);
    loadDashboardData(newDate);
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    console.log('새로고침 요청');
    loadDashboardData(selectedDate);
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    const key = MessageKeys.DASHBOARD.DELETE;
    try {
      message.loading('삭제 처리 중...', key);
      console.log(
        '삭제 요청:',
        selectedRows.map((row) => row.dashboard_id)
      );

      await DashboardService.deleteDashboards(
        selectedRows.map((row) => row.dashboard_id)
      );
      removeDashboards(selectedRows.map((row) => row.dashboard_id));
      setSelectedRows([]);
      message.loadingToSuccess(MessageTemplates.DASHBOARD.DELETE_SUCCESS, key);
    } catch (error) {
      console.error('삭제 실패:', error);
      message.loadingToError(MessageTemplates.DASHBOARD.DELETE_FAIL, key);
    }
  };

  // 행 클릭 핸들러
  const handleRowClick = async (record) => {
    const key = MessageKeys.DASHBOARD.DETAIL;
    try {
      message.loading('상세 정보 조회 중...', key);
<<<<<<< HEAD
      console.log('행 클릭:', record);

      const detailData = await DashboardService.getDashboardDetail(
        record.dashboard_id
      );
=======
      const detailData = await DashboardService.getDashboardDetail(record.dashboard_id);
>>>>>>> main
      setSelectedDashboard(detailData);
      setShowDetailModal(true);
      message.loadingToSuccess('상세 정보를 조회했습니다', key);
    } catch (error) {
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
            <DateRangeInfo dateRange={availableDateRange} loading={loading} />
          </Space>

          <Space size="middle">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
              size="large"
            >
              신규 등록
            </Button>
            <Button
              icon={<CarOutlined />}
              onClick={() => setShowAssignModal(true)}
              disabled={selectedRows.length === 0}
              size="large"
            >
              배차
            </Button>
            <Popconfirm
              title="선택한 항목을 삭제하시겠습니까?"
              onConfirm={handleDelete}
              okText="삭제"
              cancelText="취소"
              disabled={selectedRows.length === 0}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={selectedRows.length === 0}
                size="large"
              >
                삭제
              </Button>
            </Popconfirm>
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
        isAdminPage={true}
      />

      {/* Modals */}
      {showCreateModal && (
        <CreateDashboardModal
          visible={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
          userDepartment={user?.user_department}
        />
      )}

      {showAssignModal && (
        <AssignDriverModal
          visible={showAssignModal}
          onCancel={() => setShowAssignModal(false)}
          onSuccess={handleAssignSuccess}
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
          onSuccess={handleRefresh}
          isAdmin={true}
        />
      )}
    </Layout.Content>
  );
};

export default AdminPage;
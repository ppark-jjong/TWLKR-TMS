// frontend/src/pages/AdminPage.js
import React, { useState, useEffect } from 'react';
import {
  Layout,
  DatePicker,
  Space,
  Button,
  Tooltip,
  Popconfirm,
  Empty,
} from 'antd';
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
import LoadingSpin from '../components/common/LoadingSpin';
import DashboardService from '../services/DashboardService';
import { useDashboard } from '../contexts/DashboardContext';
import { useAuth } from '../contexts/AuthContext';
import message, { MessageKeys, MessageTemplates } from '../utils/message';
import { FONT_STYLES } from '../utils/Constants';

const { RangePicker } = DatePicker;

const AdminPage = () => {
  // 상태 관리
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(6, 'day'), // 일주일 범위 (오늘 포함)
    dayjs(),
  ]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [availableDateRange, setAvailableDateRange] = useState(null);

  // 필터링 상태
  const [typeFilter, setTypeFilter] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [warehouseFilter, setWarehouseFilter] = useState(null);
  const [orderNoSearch, setOrderNoSearch] = useState('');

  const { user } = useAuth();
  const {
    dashboards,
    loading,
    fetchAdminDashboards,
    removeDashboards,
    startPolling,
    stopPolling,
  } = useDashboard();

  const pageSize = 50;

  // 초기 데이터 로드
  useEffect(() => {
    console.log('AdminPage 마운트');
    loadDashboardData(dateRange[0], dateRange[1]);

    // 폴링 시작 - 자동 업데이트를 위한 설정
    startPolling();

    // 컴포넌트 언마운트 시 폴링 중지
    return () => {
      stopPolling();
    };
  }, []);

  // 대시보드 데이터 로드
  const loadDashboardData = async (startDate, endDate) => {
    const key = MessageKeys.DASHBOARD.LOAD;
    try {
      setCurrentPage(1); // 데이터 조회 시 첫 페이지로 이동
      message.loading('데이터 조회 중...', key);
      console.log(
        '관리자 대시보드 데이터 조회 시작:',
        startDate.format('YYYY-MM-DD'),
        '~',
        endDate.format('YYYY-MM-DD')
      );

      const data = await fetchAdminDashboards(startDate, endDate);

      // 날짜 범위 정보 업데이트
      if (data && data.date_range) {
        setAvailableDateRange(data.date_range);
      }

      // 필터 초기화
      resetFilters();

      if (Array.isArray(data) && data.length > 0) {
        message.loadingToSuccess('데이터를 조회했습니다', key);
      } else {
        message.loadingToInfo('조회된 데이터가 없습니다', key);
      }
    } catch (error) {
      console.error('관리자 대시보드 데이터 로드 실패:', error);
      message.loadingToError('데이터 조회 중 오류가 발생했습니다', key);
    }
  };

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (dates) => {
    if (!dates || !dates[0] || !dates[1]) return;

    console.log(
      '날짜 범위 변경:',
      dates[0].format('YYYY-MM-DD'),
      '~',
      dates[1].format('YYYY-MM-DD')
    );
    setDateRange(dates);
    setSelectedRows([]);
    loadDashboardData(dates[0], dates[1]);
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    console.log('새로고침 요청');
    loadDashboardData(dateRange[0], dateRange[1]);
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    const key = MessageKeys.DASHBOARD.DELETE;
    try {
      if (selectedRows.length === 0) {
        message.warning('삭제할 항목을 선택해주세요');
        return;
      }

      message.loading('삭제 처리 중...', key);
      console.log(
        '삭제 요청:',
        selectedRows.map((row) => row.dashboard_id)
      );

      await DashboardService.deleteDashboards(
        selectedRows.map((row) => row.dashboard_id)
      );

      // Context 상태 업데이트
      removeDashboards(selectedRows.map((row) => row.dashboard_id));
      setSelectedRows([]);
      message.loadingToSuccess('선택한 항목이 삭제되었습니다', key);
    } catch (error) {
      console.error('삭제 실패:', error);
      message.loadingToError('삭제 처리 중 오류가 발생했습니다', key);
    }
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
      message.loadingToSuccess('상세 정보를 조회했습니다', key);
    } catch (error) {
      console.error('상세 정보 조회 실패:', error);
      message.loadingToError('상세 정보 조회 중 오류가 발생했습니다', key);
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

  // 상세 모달 처리 성공 핸들러
  const handleDetailSuccess = () => {
    handleRefresh();
  };

  // 배차 버튼 클릭 핸들러
  const handleAssignClick = () => {
    if (selectedRows.length === 0) {
      message.warning('배차할 항목을 선택해주세요');
      return;
    }

    // 관리자는 상태에 관계없이 배차 가능
    setShowAssignModal(true);
  };

  // 필터 핸들러
  const handleTypeFilter = (value) => {
    setTypeFilter(value);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };

  const handleDepartmentFilter = (value) => {
    setDepartmentFilter(value);
    setCurrentPage(1);
  };

  const handleWarehouseFilter = (value) => {
    setWarehouseFilter(value);
    setCurrentPage(1);
  };

  const handleOrderNoSearch = (value) => {
    setOrderNoSearch(value);
    setCurrentPage(1);
  };

  // 필터 초기화
  const resetFilters = () => {
    setTypeFilter(null);
    setDepartmentFilter(null);
    setWarehouseFilter(null);
    setOrderNoSearch('');
    setCurrentPage(1);
  };

  // 날짜 범위 제한 설정 (가능한 날짜 범위 내에서만 선택 가능)
  const disabledDate = (current) => {
    if (!availableDateRange) return false;

    const oldest = dayjs(availableDateRange.oldest_date);
    const latest = dayjs(availableDateRange.latest_date);

    // 가능한 범위를 벗어나는 날짜 비활성화
    return (
      current &&
      (current < oldest.startOf('day') || current > latest.endOf('day'))
    );
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
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              style={{ width: 350 }}
              size="large"
              allowClear={false}
              disabledDate={disabledDate}
              ranges={{
                오늘: [dayjs(), dayjs()],
                '최근 3일': [dayjs().subtract(2, 'day'), dayjs()],
                '최근 7일': [dayjs().subtract(6, 'day'), dayjs()],
                '최근 30일': [dayjs().subtract(29, 'day'), dayjs()],
              }}
            />

            {/* 가능한 날짜 범위 표시 */}
            {availableDateRange && (
              <span style={{ color: '#888', fontSize: '14px' }}>
                조회 가능 기간: {availableDateRange.oldest_date} ~{' '}
                {availableDateRange.latest_date}
              </span>
            )}
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
              onClick={handleAssignClick}
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

      {loading ? (
        <LoadingSpin />
      ) : dashboards.length === 0 ? (
        <Empty description="조회된 데이터가 없습니다" />
      ) : (
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
          // 필터링 관련 props
          typeFilter={typeFilter}
          departmentFilter={departmentFilter}
          warehouseFilter={warehouseFilter}
          orderNoSearch={orderNoSearch}
          onTypeFilterChange={handleTypeFilter}
          onDepartmentFilterChange={handleDepartmentFilter}
          onWarehouseFilterChange={handleWarehouseFilter}
          onOrderNoSearchChange={handleOrderNoSearch}
          onResetFilters={resetFilters}
        />
      )}

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
          onSuccess={handleDetailSuccess}
          isAdmin={true}
        />
      )}
    </Layout.Content>
  );
};

export default AdminPage;

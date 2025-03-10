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
import { useDateRange } from '../utils/useDateRange';

const { RangePicker } = DatePicker;

const AdminPage = () => {
  // 날짜 범위 커스텀 훅 사용
  const {
    dateRange,
    disabledDate,
    handleDateRangeChange,
    loading: dateRangeLoading,
  } = useDateRange(7); // 기본 7일 범위

  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

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
    updateMultipleDashboards,
  } = useDashboard();

  const pageSize = 50;

  // 날짜 범위가 설정되면 관리자 대시보드 데이터 로드
  useEffect(() => {
    if (dateRange[0] && dateRange[1] && !dateRangeLoading) {
      loadDashboardData(dateRange[0], dateRange[1]);
    }
  }, [dateRange, dateRangeLoading]);

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

      const response = await fetchAdminDashboards(startDate, endDate);

      // 필터 초기화
      resetFilters();

      const items = response?.items || [];
      if (items.length > 0) {
        message.loadingToSuccess('데이터를 조회했습니다', key);
      } else {
        message.loadingToInfo('조회된 데이터가 없습니다', key);
      }

      return response;
    } catch (error) {
      console.error('관리자 대시보드 데이터 로드 실패:', error);
      message.loadingToError(
        '관리자 데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        key
      );
      return null;
    }
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    console.log('새로고침 요청');
    if (dateRange[0] && dateRange[1]) {
      loadDashboardData(dateRange[0], dateRange[1]);
    }
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
      message.loadingToSuccess(
        `선택한 ${selectedRows.length}개 항목이 삭제되었습니다`,
        key
      );
    } catch (error) {
      console.error('삭제 실패:', error);

      // 사용자 친화적인 오류 메시지
      if (error.response?.status === 403) {
        message.loadingToError(
          '삭제 권한이 없습니다. 관리자 권한이 필요합니다.',
          key
        );
      } else if (error.response?.status === 404) {
        message.loadingToError(
          '일부 항목을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.',
          key
        );
        // 화면 새로고침
        handleRefresh();
      } else {
        message.loadingToError(
          '삭제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          key
        );
      }
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

      // 사용자 친화적인 오류 메시지 표시
      if (error.response?.status === 404) {
        message.loadingToError(
          '해당 주문 정보를 찾을 수 없습니다. 삭제되었거나 존재하지 않는 주문입니다.',
          key
        );
        // 목록 새로고침
        handleRefresh();
      } else {
        message.loadingToError(
          '상세 정보 조회 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
          key
        );
      }
    }
  };

  // 대시보드 생성 성공 핸들러
  const handleCreateSuccess = () => {
    console.log('대시보드 생성 성공');
    setShowCreateModal(false);
    message.success('새로운 주문이 성공적으로 등록되었습니다.');
    handleRefresh();
  };

  // 배차 성공 핸들러
  const handleAssignSuccess = () => {
    console.log('배차 성공');
    setShowAssignModal(false);
    setSelectedRows([]);
    message.success('선택한 주문에 배차가 완료되었습니다.');
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

  // 주문번호 검색 핸들러 - 백엔드 API 호출 방식
  const handleOrderNoSearch = async (value) => {
    if (!value || value.trim() === '') {
      // 검색어가 비어있으면 기존 날짜 범위로 데이터 다시 로드
      loadDashboardData(dateRange[0], dateRange[1]);
      setOrderNoSearch('');
      return;
    }

    setOrderNoSearch(value);
    setCurrentPage(1);

    // 검색 중임을 표시
    const key = MessageKeys.DASHBOARD.LOAD;
    message.loading('주문번호 검색 중...', key);

    try {
      // 백엔드 API 호출
      const searchResults = await DashboardService.searchDashboardsByOrderNo(
        value
      );

      // 검색 결과가 있으면 기존 목록 클리어 후 결과 표시
      if (Array.isArray(searchResults) && searchResults.length > 0) {
        removeDashboards(dashboards.map((d) => d.dashboard_id)); // 기존 목록 클리어
        updateMultipleDashboards(searchResults);
        message.loadingToSuccess(`검색 결과: ${searchResults.length}건`, key);
      } else {
        message.loadingToInfo(
          `주문번호 "${value}"에 대한 검색 결과가 없습니다`,
          key
        );
        updateMultipleDashboards([]); // 빈 배열로 설정
      }
    } catch (error) {
      console.error('주문번호 검색 실패:', error);
      message.loadingToError(
        '주문번호 검색 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        key
      );
    }
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

  // 필터 초기화
  const resetFilters = () => {
    setTypeFilter(null);
    setDepartmentFilter(null);
    setWarehouseFilter(null);
    setOrderNoSearch('');
    setCurrentPage(1);
  };

  return (
    <Layout.Content style={{ padding: '12px', backgroundColor: 'white' }}>
      <div style={{ marginBottom: '16px' }}>
        <Space
          size="large"
          align="center"
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
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
              description={`총 ${selectedRows.length}개 항목이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
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

      {loading || dateRangeLoading ? (
        <LoadingSpin tip="관리자 데이터 불러오는 중..." />
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

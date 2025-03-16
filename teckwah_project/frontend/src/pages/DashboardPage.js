// src/pages/DashboardPage.js
import React, { useEffect, useCallback, Suspense } from 'react';
import {
  Layout,
  DatePicker,
  Space,
  Button,
  Tooltip,
  Popconfirm,
  Input,
} from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  CarOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useDashboardPageController from '../controllers/DashboardPageController';
import LoadingSpin from '../components/common/LoadingSpin';
import DashboardList from '../components/dashboard/DashboardList';
import { useDateRange } from '../utils/useDateRange';
import { cancelAllPendingRequests } from '../utils/AxiosConfig';
// 지연 로딩으로 변경
import {
  CreateDashboardModal,
  AssignDriverModal,
  DashboardDetailModal,
} from '../lazyComponents';

const { RangePicker } = DatePicker;
const { Search } = Input;

// 지연 로딩용 폴백 컴포넌트
const ModalFallback = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    }}
  >
    <LoadingSpin tip="모달 로딩 중..." />
  </div>
);
/**
 * 리팩토링된 대시보드 페이지 컴포넌트
 * 컨트롤러 패턴 적용으로 UI와 로직 분리
 */
const DashboardPage = () => {
  // 날짜 범위 커스텀 훅 사용
  const {
    dateRange,
    disabledDate,
    handleDateRangeChange,
    loading: dateRangeLoading,
  } = useDateRange(30);

  // 대시보드 페이지 컨트롤러 훅 사용
  const {
    // 상태
    dashboards,
    loading,
    searchMode,
    selectedRows,
    showCreateModal,
    showAssignModal,
    showDetailModal,
    selectedDashboard,
    currentPage,
    searchInput,
    searchLoading,
    typeFilter,
    departmentFilter,
    warehouseFilter,
    orderNoSearch,
    filterButtonClicked,
    isAdmin,

    // 상태 설정 함수
    setSelectedRows,
    setShowCreateModal,
    setShowAssignModal,
    setShowDetailModal,
    setSelectedDashboard,
    setFilterButtonClicked,

    // 핸들러 함수
    loadDashboardData,
    handleRefresh,
    handleDelete,
    handleRowClick,
    handleOrderNoSearch,
    handleAssignClick,
    handleCreateSuccess,
    handleAssignSuccess,
    handleDetailSuccess,
    handleTypeFilterChange,
    handleDepartmentFilterChange,
    handleWarehouseFilterChange,
    handleSearchInputChange,
    resetFilters,
    handleApplyFilters,
    setCurrentPage,
  } = useDashboardPageController();

  // 초기화 및 정리
  useEffect(() => {
    // 데이터 로드
    if (dateRange && dateRange[0] && dateRange[1] && !dateRangeLoading) {
      loadDashboardData(dateRange[0], dateRange[1], false);
    }

    // 정리 작업
    return () => {
      cancelAllPendingRequests();
    };
  }, [dateRange, dateRangeLoading, loadDashboardData]);

  // 필터 버튼 클릭 시 데이터 로드
  useEffect(() => {
    if (filterButtonClicked && dateRange && dateRange[0] && dateRange[1]) {
      loadDashboardData(dateRange[0], dateRange[1], true);
      setFilterButtonClicked(false);
    }
  }, [
    filterButtonClicked,
    dateRange,
    loadDashboardData,
    setFilterButtonClicked,
  ]);

  return (
    <Layout.Content style={{ padding: '12px', backgroundColor: 'white' }}>
      <div style={{ marginBottom: '16px' }}>
        <Space
          size="large"
          align="center"
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <Space>
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

            <Search
              placeholder="주문번호 검색"
              value={searchInput}
              onChange={handleSearchInputChange}
              onSearch={handleOrderNoSearch}
              style={{ width: 200 }}
              loading={searchLoading}
              enterButton
            />
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
            {/* 관리자만 삭제 버튼 표시 */}
            {isAdmin && (
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
            )}
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

      {/* 대시보드 목록 컴포넌트 */}
      <DashboardList
        dashboards={dashboards}
        loading={loading || dateRangeLoading}
        searchMode={searchMode}
        orderNoSearch={orderNoSearch}
        selectedRows={selectedRows}
        onSelectRows={setSelectedRows}
        onRowClick={handleRowClick}
        onRefresh={handleRefresh}
        typeFilter={typeFilter}
        departmentFilter={departmentFilter}
        warehouseFilter={warehouseFilter}
        onTypeFilterChange={handleTypeFilterChange}
        onDepartmentFilterChange={handleDepartmentFilterChange}
        onWarehouseFilterChange={handleWarehouseFilterChange}
        onOrderNoSearchChange={handleOrderNoSearch}
        onResetFilters={resetFilters}
        onApplyFilters={handleApplyFilters}
        onPageChange={setCurrentPage}
        currentPage={currentPage}
        isAdmin={isAdmin}
        resetSearchMode={() => handleOrderNoSearch('')}
      />

      {/* 지연 로딩으로 변경된 모달 컴포넌트들 */}
      {showCreateModal && (
        <Suspense fallback={<ModalFallback />}>
          <CreateDashboardModal
            visible={showCreateModal}
            onCancel={() => setShowCreateModal(false)}
            onSuccess={handleCreateSuccess}
            userDepartment={user?.user_department}
          />
        </Suspense>
      )}

      {showAssignModal && (
        <Suspense fallback={<ModalFallback />}>
          <AssignDriverModal
            visible={showAssignModal}
            onCancel={() => setShowAssignModal(false)}
            onSuccess={handleAssignSuccess}
            selectedRows={selectedRows}
          />
        </Suspense>
      )}

      {showDetailModal && selectedDashboard && (
        <Suspense fallback={<ModalFallback />}>
          <DashboardDetailModal
            visible={showDetailModal}
            dashboard={selectedDashboard}
            onCancel={() => {
              setShowDetailModal(false);
              setSelectedDashboard(null);
            }}
            onSuccess={handleDetailSuccess}
            isAdmin={isAdmin}
          />
        </Suspense>
      )}
    </Layout.Content>
  );
};

export default DashboardPage;

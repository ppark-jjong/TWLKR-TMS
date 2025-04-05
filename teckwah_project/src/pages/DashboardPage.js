// src/pages/DashboardPage.js
import React from 'react';
import { Button, Space } from 'antd';
import PageHeader from '../components/PageHeader';

// 공통 훅 가져오기
import useDashboardBase from '../hooks/useDashboardBase';

// 공통 컴포넌트 가져오기
import StatusChangeModal from '../components/StatusChangeModal';
import AssignDriverModal from '../components/AssignDriverModal';
import DashboardDetailModal from '../components/DashboardDetailModal';
import LockConflictModal from '../components/LockConflictModal';
import CreateDashboardModal from '../components/CreateDashboardModal';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardBase from '../components/DashboardBase';

const DashboardPage = () => {
  // 대시보드 기본 훅 사용 (일반 사용자 역할)
  const {
    // 데이터 상태
    data,
    isLoading,
    totalItems,
    dateRange,
    searchParams,
    filterOptions,

    // 선택 상태
    selectedRowKeys,
    onSelectChange,

    // 모달 상태
    createModalVisible,
    setCreateModalVisible,
    statusModalVisible,
    assignModalVisible,
    detailModalVisible,
    currentDashboard,

    // 폼 인스턴스
    statusForm,
    assignForm,
    detailForm,

    // 락 상태
    lockConflictInfo,
    isLockLoading,

    // 이벤트 핸들러
    handleSearch,
    handlePaginationChange,
    handleDateRangeChange,
    refreshData,
    showStatusModal,
    showDetailModal,
    showAssignModal,
    handleStatusSubmit,
    handleAssignSubmit,

    // 모달 제어
    closeStatusModal,
    closeAssignModal,
    closeDetailModal,

    // 락 제어
    cancelLock,
    retryLock,
  } = useDashboardBase('USER');

  // 추가 액션 버튼 렌더링
  const additionalActions = (
    <Space>
      <Button
        type="primary"
        onClick={showAssignModal}
        disabled={selectedRowKeys.length === 0}
      >
        배차 처리
      </Button>
      <Button type="primary" onClick={() => setCreateModalVisible(true)}>
        신규 등록
      </Button>
    </Space>
  );

  return (
    <>
      <PageHeader title="TeckwahTMS" />
      
      <DashboardBase
        title="배송 대시보드"
        userRole="USER"
        data={data}
        isLoading={isLoading}
        searchParams={searchParams}
        filterOptions={filterOptions}
        handleSearch={handleSearch}
        handlePaginationChange={handlePaginationChange}
        handleDateRangeChange={handleDateRangeChange}
        refreshData={refreshData}
        totalItems={totalItems}
        dateRange={dateRange}
        selectedRowKeys={selectedRowKeys}
        onSelectChange={onSelectChange}
        showStatusModal={showStatusModal}
        showDetailModal={showDetailModal}
        additionalActions={additionalActions}
      />

      {/* 모달 컴포넌트들 */}
      <StatusChangeModal
        open={statusModalVisible}
        onOk={handleStatusSubmit}
        onCancel={closeStatusModal}
        form={statusForm}
        currentRecord={currentDashboard}
        isAdmin={false}
        confirmLoading={isLoading}
      />

      <AssignDriverModal
        open={assignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={closeAssignModal}
        form={assignForm}
        confirmLoading={isLoading}
        selectedCount={selectedRowKeys.length}
      />

      <DashboardDetailModal
        open={detailModalVisible}
        onCancel={closeDetailModal}
        form={detailForm}
        record={currentDashboard}
        readonly
      />

      <CreateDashboardModal
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        userRole="USER"
      />

      <LockConflictModal
        lockInfo={lockConflictInfo}
        onCancel={cancelLock}
        onRetry={retryLock}
        open={isLockLoading && lockConflictInfo}
      />

      {isLoading && <LoadingSpinner />}
    </>
  );
};

export default DashboardPage;
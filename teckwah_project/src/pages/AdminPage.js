// src/pages/AdminPage.js
import React, { useState } from 'react';
import { Button, message, Space, Popconfirm, Tabs } from 'antd';
import { DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { downloadExcel, deleteDashboards } from '../utils/api';
import { handleApiError } from '../utils/errorHandlers';

// 공통 훅 가져오기
import useDashboardBase from '../hooks/useDashboardBase';

// 공통 컴포넌트 가져오기
import StatusChangeModal from '../components/StatusChangeModal';
import AssignDriverModal from '../components/AssignDriverModal';
import DashboardDetailModal from '../components/DashboardDetailModal';
import LockConflictModal from '../components/LockConflictModal';
import UserTable from '../components/UserTable';
import CreateDashboardModal from '../components/CreateDashboardModal';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardBase from '../components/DashboardBase';

const AdminPage = ({ activeTab = 'dashboard' }) => {
  const queryClient = useQueryClient();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(activeTab);

  // 대시보드 기본 훅 사용 (관리자 역할)
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
  } = useDashboardBase('ADMIN');

  // 삭제 뮤테이션 (관리자 전용)
  const deleteMutation = useMutation((ids) => deleteDashboards(ids), {
    onSuccess: () => {
      message.success('선택한 항목이 삭제되었습니다');
      onSelectChange([]);
      queryClient.invalidateQueries(['admin-dashboards']);
    },
    onError: (error) => {
      handleApiError(error, {
        context: '삭제',
      });
    },
    onSettled: () => {
      setDeleteLoading(false);
    },
  });

  // 엑셀 다운로드 처리 (관리자 전용)
  const handleDownload = async () => {
    setDownloadLoading(true);
    try {
      await downloadExcel({ ...searchParams });
      message.success('엑셀 파일 다운로드가 완료되었습니다');
    } catch (error) {
      handleApiError(error, { context: '엑셀 다운로드' });
    } finally {
      setDownloadLoading(false);
    }
  };

  // 선택 항목 삭제 처리 (관리자 전용)
  const handleDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('삭제할 항목을 선택해주세요');
      return;
    }

    setDeleteLoading(true);
    deleteMutation.mutate(selectedRowKeys);
  };

  // 관리자용 추가 액션 버튼 렌더링
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
      <Button
        icon={<DownloadOutlined />}
        onClick={handleDownload}
        loading={downloadLoading}
      >
        엑셀 다운로드
      </Button>
      <Popconfirm
        title="선택한 항목을 삭제하시겠습니까?"
        onConfirm={handleDelete}
        okText="삭제"
        cancelText="취소"
      >
        <Button
          danger
          icon={<DeleteOutlined />}
          loading={deleteLoading}
          disabled={selectedRowKeys.length === 0}
        >
          삭제
        </Button>
      </Popconfirm>
    </Space>
  );

  // 관리자용 탭 컴포넌트 렌더링
  const renderTabContent = () => {
    if (currentTab === 'users') {
      return <UserTable />;
    }

    return (
      <DashboardBase
        title="관리자 대시보드"
        userRole="ADMIN"
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
    );
  };

  const items = [
    {
      key: 'dashboard',
      label: '배송 관리',
    },
    {
      key: 'users',
      label: '사용자 관리',
    },
  ];

  return (
    <>
      <Tabs
        activeKey={currentTab}
        onChange={setCurrentTab}
        type="card"
        items={items}
      />

      {renderTabContent()}

      {/* 모달 컴포넌트들 */}
      <StatusChangeModal
        open={statusModalVisible}
        onOk={handleStatusSubmit}
        onCancel={closeStatusModal}
        form={statusForm}
        currentRecord={currentDashboard}
        isAdmin={true}
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
        isAdmin={true}
      />

      <CreateDashboardModal
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        userRole="ADMIN"
      />

      <LockConflictModal
        lockInfo={lockConflictInfo}
        onCancel={cancelLock}
        onRetry={retryLock}
        open={isLockLoading && lockConflictInfo}
      />

      {(isLoading || downloadLoading || deleteLoading) && <LoadingSpinner />}
    </>
  );
};

export default AdminPage;

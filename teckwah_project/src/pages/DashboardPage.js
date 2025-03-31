// src/pages/DashboardPage.js
import React, { useEffect } from 'react';
import { Card, Button, Space, Divider, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateStatus, assignDriver, getDashboardDetail } from '../utils/api';
import { getUserFromToken } from '../utils/authHelpers';

// 커스텀 훅 가져오기
import useDashboardData from '../hooks/useDashboardData';
import useDashboardLock from '../hooks/useDashboardLock';
import useDashboardModals from '../hooks/useDashboardModals';

// 공통 컴포넌트 가져오기
import DashboardTable from '../components/DashboardTable';
import DashboardSearch from '../components/DashboardSearch';
import StatusChangeModal from '../components/StatusChangeModal';
import AssignDriverModal from '../components/AssignDriverModal';
import DashboardDetailDrawer from '../components/DashboardDetailDrawer';
import LockConflictModal from '../components/LockConflictModal';
import CreateDashboardModal from '../components/CreateDashboardModal';
import LoadingSpinner from '../components/LoadingSpinner';

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const [createModalVisible, setCreateModalVisible] = React.useState(false);

  // 커스텀 훅 사용
  const {
    data,
    meta,
    isLoading,
    searchParams,
    selectedRowKeys,
    handleSearch,
    handleReset,
    handleTableChange,
    onSelectChange,
    setSelectedRowKeys,
    refreshData,
  } = useDashboardData('USER');

  const {
    lockConflictInfo,
    isLockLoading,
    acquireLock,
    releaseLock,
    acquireMultipleLocks,
    releaseMultipleLocks,
    cancelLock,
    retryLock,
  } = useDashboardLock();

  const {
    statusForm,
    assignForm,
    detailForm,
    statusModalVisible,
    assignModalVisible,
    detailVisible,
    currentDashboard,
    setCurrentDashboard,
    openStatusModal,
    closeStatusModal,
    openAssignModal,
    closeAssignModal,
    openDetailDrawer,
    closeDetailDrawer,
  } = useDashboardModals();

  // 상태 변경 뮤테이션
  const statusMutation = useMutation(({ id, data }) => updateStatus(id, data), {
    onSuccess: () => {
      message.success('상태가 변경되었습니다');
      closeStatusModal();
      queryClient.invalidateQueries('dashboards');

      // 락 해제
      if (currentDashboard) {
        releaseLock(currentDashboard.dashboard_id, 'STATUS');
      }
    },
    onError: (error) => {
      message.error('상태 변경 중 오류가 발생했습니다');
      console.error('Status update error:', error);

      // 오류 발생해도 락 해제 시도
      if (currentDashboard) {
        releaseLock(currentDashboard.dashboard_id, 'STATUS');
      }
    },
  });

  // 배차 처리 뮤테이션
  const assignMutation = useMutation((data) => assignDriver(data), {
    onSuccess: () => {
      message.success('배차가 완료되었습니다');
      closeAssignModal();
      setSelectedRowKeys([]);
      queryClient.invalidateQueries('dashboards');

      // 락 해제
      releaseMultipleLocks(selectedRowKeys, 'ASSIGN');
    },
    onError: (error) => {
      message.error('배차 처리 중 오류가 발생했습니다');
      console.error('Assign error:', error);

      // 오류 발생해도 락 해제 시도
      releaseMultipleLocks(selectedRowKeys, 'ASSIGN');
    },
  });

  // 상태 변경 모달 열기 (락 획득 후)
  const showStatusModal = (record) => {
    setCurrentDashboard(record);

    // 락 획득 후 모달 오픈
    acquireLock(record.dashboard_id, 'STATUS', () => {
      openStatusModal(record);
    });
  };

  // 상세 정보 드로어 열기
  const showDetailDrawer = async (id) => {
    try {
      const detail = await getDashboardDetail(id);
      if (detail.data && detail.data.success) {
        const dashboardData = detail.data.data;
        openDetailDrawer(dashboardData);
      } else {
        message.error('상세 정보를 불러오는데 실패했습니다');
      }
    } catch (error) {
      message.error('상세 정보를 불러오는데 실패했습니다');
    }
  };

  // 배차 모달 열기 (락 획득 후)
  const showAssignModal = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('배차할 항목을 선택해주세요');
      return;
    }

    // 다중 락 획득 후 모달 오픈
    acquireMultipleLocks(selectedRowKeys, 'ASSIGN', () => {
      openAssignModal();
    });
  };

  // 상태 변경 제출
  const handleStatusSubmit = () => {
    statusForm
      .validateFields()
      .then((values) => {
        if (!currentDashboard) return;

        statusMutation.mutate({
          id: currentDashboard.dashboard_id,
          data: {
            status: values.status,
            is_admin: false, // 일반 사용자 권한
          },
        });
      })
      .catch((error) => {
        message.error('폼 검증에 실패했습니다');
      });
  };

  // 배차 처리 제출
  const handleAssignSubmit = () => {
    assignForm
      .validateFields()
      .then((values) => {
        assignMutation.mutate({
          dashboard_ids: selectedRowKeys,
          driver_name: values.driver_name,
          driver_contact: values.driver_contact,
        });
      })
      .catch((error) => {
        message.error('폼 검증에 실패했습니다');
      });
  };

  // 이전 검색 조건 복원
  useEffect(() => {
    const user = getUserFromToken();
    if (user) {
      handleSearch({ department: user.user_department });
    }
  }, [handleSearch]);

  return (
    <div>
      <Card
        title="대시보드"
        extra={
          <Button icon={<ReloadOutlined />} onClick={refreshData}>
            새로고침
          </Button>
        }
      >
        <Space>
          <Button type="primary" onClick={() => setCreateModalVisible(true)}>
            새 항목 생성
          </Button>
          <Button icon={<ReloadOutlined />} onClick={refreshData}>
            새로고침
          </Button>
        </Space>

        {/* 검색 폼 */}
        <DashboardSearch
          onSearch={handleSearch}
          onReset={handleReset}
          userRole="USER"
        />

        <Divider />

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                onClick={showAssignModal}
                disabled={selectedRowKeys.length === 0}
                style={{ marginRight: 8 }}
              >
                배차 처리 ({selectedRowKeys.length}건)
              </Button>
              <span style={{ marginLeft: 8 }}>
                {selectedRowKeys.length > 0
                  ? `${selectedRowKeys.length}건 선택됨`
                  : ''}
              </span>
            </div>

            {/* 대시보드 테이블 */}
            <DashboardTable
              data={data}
              loading={isLoading}
              selectedRowKeys={selectedRowKeys}
              onSelectChange={onSelectChange}
              pagination={{
                current: searchParams.page,
                pageSize: searchParams.size,
                total: meta?.total || 0,
              }}
              onChange={handleTableChange}
              userRole="USER"
              onShowStatusModal={showStatusModal}
              onShowDetailDrawer={showDetailDrawer}
            />
          </>
        )}
      </Card>

      {/* 상태 변경 모달 */}
      <StatusChangeModal
        visible={statusModalVisible}
        onOk={handleStatusSubmit}
        onCancel={closeStatusModal}
        form={statusForm}
        confirmLoading={statusMutation.isLoading}
        dashboard={currentDashboard}
        userRole="USER"
      />

      {/* 배차 처리 모달 */}
      <AssignDriverModal
        visible={assignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={closeAssignModal}
        form={assignForm}
        confirmLoading={assignMutation.isLoading}
      />

      {/* 상세 정보 드로어 */}
      <DashboardDetailDrawer
        visible={detailVisible}
        onClose={closeDetailDrawer}
        form={detailForm}
        dashboard={currentDashboard}
      />

      {/* 락 충돌 모달 */}
      <LockConflictModal
        visible={!!lockConflictInfo}
        lockInfo={lockConflictInfo}
        onRetry={retryLock}
        onCancel={cancelLock}
        confirmLoading={isLockLoading}
      />

      {/* 새 대시보드 생성 모달 */}
      <CreateDashboardModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
      />
    </div>
  );
};

export default DashboardPage;

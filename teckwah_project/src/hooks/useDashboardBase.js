import { useState } from 'react';
import { message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateStatus, assignDriver, getDashboardDetail } from '../utils/api';
import { handleApiError } from '../utils/errorHandlers';

// 커스텀 훅 가져오기
import useDashboardData from './useDashboardData';
import useDashboardLock from './useDashboardLock';
import useDashboardModals from './useDashboardModals';

/**
 * 대시보드 페이지의 공통 기능을 제공하는 훅
 * 역할(사용자/관리자)에 따라 적절한 데이터와 기능을 제공합니다.
 *
 * @param {string} userRole - 사용자 역할 ('USER' 또는 'ADMIN')
 * @returns {Object} 대시보드 기능 객체
 */
const useDashboardBase = (userRole = 'USER') => {
  const queryClient = useQueryClient();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // 데이터 로드
  const {
    dashboards: data,
    isLoading,
    searchParams,
    filterOptions,
    handleSearch,
    handlePaginationChange,
    handleDateRangeChange,
    refetch: refreshData,
    totalItems,
    dateRange,
  } = useDashboardData(userRole);

  // 선택 변경 핸들러
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  // 락 관리
  const {
    lockConflictInfo,
    isLockLoading,
    handleAcquireLock: acquireLock,
    handleReleaseLock: releaseLock,
    handleAcquireMultipleLocks: acquireMultipleLocks,
    handleReleaseMultipleLocks: releaseMultipleLocks,
    handleCancelLock: cancelLock,
    handleRetryLock: retryLock,
  } = useDashboardLock();

  // 모달 관리
  const {
    statusForm,
    assignForm,
    detailForm,
    statusModalVisible,
    assignModalVisible,
    detailModalVisible,
    currentDashboard,
    setCurrentDashboard,
    openStatusModal,
    closeStatusModal,
    openAssignModal,
    closeAssignModal,
    openDetailModal,
    closeDetailModal,
  } = useDashboardModals();

  // 상태 변경 뮤테이션
  const statusMutation = useMutation(({ id, data }) => updateStatus(id, data), {
    onSuccess: () => {
      message.success('상태가 변경되었습니다');
      closeStatusModal();
      queryClient.invalidateQueries([
        userRole === 'ADMIN' ? 'admin-dashboards' : 'dashboards',
      ]);

      // 락 해제
      if (currentDashboard) {
        releaseLock(currentDashboard.dashboard_id, 'STATUS');
      }
    },
    onError: (error) => {
      handleApiError(error, {
        context: '상태 변경',
      });

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
      queryClient.invalidateQueries([
        userRole === 'ADMIN' ? 'admin-dashboards' : 'dashboards',
      ]);

      // 락 해제
      releaseMultipleLocks(selectedRowKeys, 'ASSIGN');
    },
    onError: (error) => {
      handleApiError(error, {
        context: '배차 처리',
      });

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

  // 상세 정보 모달 열기
  const showDetailModal = async (id) => {
    try {
      const response = await getDashboardDetail(id);
      if (response && response.data && response.data.success) {
        const dashboardData = response.data.data;
        openDetailModal(dashboardData);
      } else {
        message.error('상세 정보를 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('상세 정보 조회 오류:', error);
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
            is_admin: userRole === 'ADMIN', // 역할에 따라 설정
          },
        });
      })
      .catch((err) => {
        console.error('Form validation error:', err);
      });
  };

  // 배차 처리 제출
  const handleAssignSubmit = () => {
    assignForm
      .validateFields()
      .then((values) => {
        assignMutation.mutate({
          dashboard_ids: selectedRowKeys,
          driver: values.driver,
        });
      })
      .catch((err) => {
        console.error('Form validation error:', err);
      });
  };

  return {
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
    openStatusModal,
    closeStatusModal,
    openAssignModal,
    closeAssignModal,
    openDetailModal,
    closeDetailModal,

    // 락 제어
    acquireLock,
    releaseLock,
    acquireMultipleLocks,
    releaseMultipleLocks,
    cancelLock,
    retryLock,
  };
};

export default useDashboardBase;

// src/hooks/useDashboardBase.js
import { useState } from 'react';
import { message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateStatus, assignDriver, getDashboardDetail } from '../utils/Api';
import { handleApiError } from '../utils/ErrorHandlers';

// 서브 훅 가져오기
import useDashboardData from './UseDashboardData';
import useDashboardLock from './UseDashboardLock';
import useDashboardModals from './UseDashboardModals';

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

  // 데이터 로드
  const {
    dashboards: data,
    isLoading,
    searchParams,
    setSearchParams,
    filterOptions,
    handleSearch,
    handlePaginationChange,
    handleDateRangeChange,
    refetch: refreshData,
    totalItems,
    dateRange,
    setDateRange,
  } = useDashboardData(userRole);

  // 선택 변경 핸들러
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  // 락 관리
  const {
    lockConflictInfo,
    isLockLoading,
    handleAcquireLock,
    handleReleaseLock,
    handleAcquireMultipleLocks,
    handleReleaseMultipleLocks,
    handleCancelLock,
    handleRetryLock,
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
  const statusMutation = useMutation({
    mutationFn: ({ id, data }) => updateStatus(id, data),
    onSuccess: () => {
      message.success('상태가 변경되었습니다');
      closeStatusModal();

      // 캐시 갱신
      const queryKey = userRole === 'ADMIN' ? 'admin-dashboards' : 'dashboards';
      queryClient.invalidateQueries({ queryKey: [queryKey] });

      // 락 해제
      if (currentDashboard) {
        handleReleaseLock(currentDashboard.dashboard_id, 'STATUS');
      }
    },
    onError: (error) => {
      handleApiError(error, {
        context: '상태 변경',
      });

      // 오류 발생해도 락 해제 시도
      if (currentDashboard) {
        handleReleaseLock(currentDashboard.dashboard_id, 'STATUS');
      }
    },
  });

  // 배차 처리 뮤테이션
  const assignMutation = useMutation({
    mutationFn: (data) => assignDriver(data),
    onSuccess: () => {
      message.success('배차가 완료되었습니다');
      closeAssignModal();
      setSelectedRowKeys([]);

      // 캐시 갱신
      const queryKey = userRole === 'ADMIN' ? 'admin-dashboards' : 'dashboards';
      queryClient.invalidateQueries({ queryKey: [queryKey] });

      // 락 해제
      handleReleaseMultipleLocks(selectedRowKeys, 'ASSIGN');
    },
    onError: (error) => {
      handleApiError(error, {
        context: '배차 처리',
      });

      // 오류 발생해도 락 해제 시도
      handleReleaseMultipleLocks(selectedRowKeys, 'ASSIGN');
    },
  });

  // 상태 변경 모달 열기 (락 획득 후)
  const showStatusModal = (record) => {
    setCurrentDashboard(record);

    // 락 획득 후 모달 오픈
    handleAcquireLock(record.dashboard_id, 'STATUS', () => {
      openStatusModal(record);
    });
  };

  // 상세 정보 모달 열기
  const showDetailModal = async (id) => {
    try {
      // 로딩 메시지 표시
      message.loading({
        content: '데이터를 불러오는 중...',
        key: 'detail-loading',
      });

      const response = await getDashboardDetail(id);

      // 로딩 메시지 완료 처리
      message.destroy('detail-loading');

      if (response?.data?.success) {
        const dashboardData = response.data.data;
        setCurrentDashboard(dashboardData);

        // 락 획득 후 모달 오픈
        handleAcquireLock(dashboardData.dashboard_id, 'STATUS', () => {
          openDetailModal(dashboardData);
        });
      } else {
        message.error('상세 정보를 불러오는데 실패했습니다');
      }
    } catch (error) {
      message.destroy('detail-loading');
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
    handleAcquireMultipleLocks(selectedRowKeys, 'ASSIGN', () => {
      openAssignModal();
    });
  };

  // 상태 변경 제출
  const handleStatusSubmit = () => {
    statusForm
      .validateFields()
      .then((values) => {
        if (!currentDashboard) {
          message.error('데이터가 선택되지 않았습니다');
          return;
        }

        statusMutation.mutate({
          id: currentDashboard.dashboard_id,
          data: {
            status: values.status,
            is_admin: userRole === 'ADMIN', // 역할에 따라 설정
          },
        });
      })
      .catch((err) => {
        console.error('폼 유효성 검증 오류:', err);
        message.error('입력 데이터를 확인해주세요');
      });
  };

  // 배차 처리 제출
  const handleAssignSubmit = () => {
    assignForm
      .validateFields()
      .then((values) => {
        if (!selectedRowKeys.length) {
          message.error('선택된 항목이 없습니다');
          return;
        }

        assignMutation.mutate({
          dashboard_ids: selectedRowKeys,
          driver: values.driver,
        });
      })
      .catch((err) => {
        console.error('폼 유효성 검증 오류:', err);
        message.error('입력 데이터를 확인해주세요');
      });
  };

  // 대시보드 데이터 로드 함수 (DashboardPage에서 필요)
  const loadDashboardList = () => {
    refreshData();
  };

  // 강제 갱신 처리
  const handleRefresh = () => {
    refreshData();
    message.success('데이터가 갱신되었습니다');
  };

  return {
    // 데이터 상태
    data,
    isLoading,
    totalItems,
    dateRange,
    setDateRange,
    searchParams,
    setSearchParams,
    filterOptions,
    summaryCount: { total: 0, in_progress: 0, complete: 0 }, // 대시보드 요약 데이터 기본값

    // 선택 상태
    selectedRowKeys,
    onSelectChange,

    // 모달 상태
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
    refreshData: handleRefresh,
    showStatusModal,
    showDetailModal,
    showAssignModal,
    handleStatusSubmit,
    handleAssignSubmit,
    loadDashboardList,

    // 모달 제어
    closeStatusModal,
    closeAssignModal,
    closeDetailModal,

    // 락 관련 핸들러
    cancelLock: handleCancelLock,
    retryLock: handleRetryLock,

    // 뮤테이션 상태
    isStatusUpdating: statusMutation.isPending,
    isAssignUpdating: assignMutation.isPending,
  };
};

export default useDashboardBase;

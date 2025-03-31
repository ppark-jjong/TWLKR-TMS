import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message, Form } from 'antd';
import {
  getDashboards,
  getDashboardDetail,
  updateStatus,
  assignDriver,
  acquireLock,
  releaseLock,
} from '../utils/api';
import { getUserFromToken } from '../utils/authHelpers';

/**
 * 대시보드 상태 관리 통합 훅
 *
 * 데이터 조회, 락 관리, 모달 상태 등을 통합 관리합니다.
 *
 * @param {string} userRole - 사용자 권한 ('USER' 또는 'ADMIN')
 * @returns {Object} 대시보드 관련 상태 및 함수
 */
const useDashboard = (userRole = 'USER') => {
  const queryClient = useQueryClient();

  // 상태 선언
  const [searchParams, setSearchParams] = useState({});
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [currentDashboard, setCurrentDashboard] = useState(null);

  // 모달 상태
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // 락 관련 상태
  const [lockConflictInfo, setLockConflictInfo] = useState(null);
  const [isLockLoading, setIsLockLoading] = useState(false);
  const [lockType, setLockType] = useState('');
  const [dashboardIdForLock, setDashboardIdForLock] = useState(null);
  const [actionAfterLock, setActionAfterLock] = useState(null);

  // Form 인스턴스
  const [statusForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [detailForm] = Form.useForm();

  // 대시보드 데이터 조회 쿼리
  const {
    data,
    isLoading,
    refetch: refreshData,
  } = useQuery(
    ['dashboards', searchParams],
    () => getDashboards(searchParams),
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      select: (response) => {
        if (response.data && response.data.success) {
          return {
            items: response.data.data.items || [],
            meta: response.data.data.meta || {},
          };
        }
        return { items: [], meta: {} };
      },
      onError: (error) => {
        console.error('Dashboard fetch error:', error);
        message.error('대시보드 정보를 불러오는데 실패했습니다');
      },
    }
  );

  // 컴포넌트 마운트 시 검색 조건 초기화
  useEffect(() => {
    const user = getUserFromToken();
    if (user) {
      setSearchParams((prev) => ({
        ...prev,
        department: user.user_department,
      }));
    }
  }, []);

  // 상태 업데이트 뮤테이션
  const statusMutation = useMutation(({ id, data }) => updateStatus(id, data), {
    onSuccess: () => {
      message.success('상태가 변경되었습니다');
      setStatusModalVisible(false);
      queryClient.invalidateQueries('dashboards');

      // 락 해제
      if (currentDashboard) {
        handleReleaseLock(currentDashboard.dashboard_id, 'STATUS');
      }
    },
    onError: (error) => {
      console.error('Status update error:', error);
      message.error('상태 변경 중 오류가 발생했습니다');

      // 오류 발생해도 락 해제
      if (currentDashboard) {
        handleReleaseLock(currentDashboard.dashboard_id, 'STATUS');
      }
    },
  });

  // 배차 처리 뮤테이션
  const assignMutation = useMutation((data) => assignDriver(data), {
    onSuccess: () => {
      message.success('배차가 완료되었습니다');
      setAssignModalVisible(false);
      setSelectedRowKeys([]);
      queryClient.invalidateQueries('dashboards');

      // 락 해제
      handleReleaseMultipleLocks(selectedRowKeys, 'ASSIGN');
    },
    onError: (error) => {
      console.error('Assign error:', error);
      message.error('배차 처리 중 오류가 발생했습니다');

      // 오류 발생해도 락 해제
      handleReleaseMultipleLocks(selectedRowKeys, 'ASSIGN');
    },
  });

  // 테이블 변경 핸들러 (페이징, 정렬)
  const handleTableChange = (pagination, filters, sorter) => {
    setSearchParams((prev) => ({
      ...prev,
      page: pagination.current,
      size: pagination.pageSize,
      sort_by: sorter.field,
      sort_desc: sorter.order === 'descend',
    }));
  };

  // 검색 핸들러
  const handleSearch = useCallback((values) => {
    setSearchParams((prev) => ({
      ...prev,
      ...values,
      page: 1, // 검색 시 첫 페이지로 이동
    }));
  }, []);

  // 검색 조건 초기화
  const handleReset = useCallback(() => {
    const user = getUserFromToken();
    setSearchParams({
      department: user?.user_department || '',
    });
  }, []);

  // 행 선택 핸들러
  const onSelectChange = useCallback((newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);

  // 모달 관련 핸들러
  const openStatusModal = (record) => {
    setCurrentDashboard(record);
    statusForm.setFieldsValue({ status: record.status });
    setStatusModalVisible(true);
  };

  const closeStatusModal = () => {
    setStatusModalVisible(false);
    statusForm.resetFields();

    // 락 해제 (필요한 경우)
    if (currentDashboard) {
      handleReleaseLock(currentDashboard.dashboard_id, 'STATUS');
    }
  };

  const openAssignModal = () => {
    assignForm.resetFields();
    setAssignModalVisible(true);
  };

  const closeAssignModal = () => {
    setAssignModalVisible(false);
    assignForm.resetFields();

    // 다중 락 해제
    handleReleaseMultipleLocks(selectedRowKeys, 'ASSIGN');
  };

  const openDetailDrawer = (dashboardData) => {
    setCurrentDashboard(dashboardData);
    detailForm.setFieldsValue(dashboardData);
    setDetailVisible(true);
  };

  const closeDetailDrawer = () => {
    setDetailVisible(false);
    detailForm.resetFields();
  };

  // 상세 정보 조회
  const fetchDashboardDetail = async (id) => {
    try {
      const detail = await getDashboardDetail(id);
      if (detail.data && detail.data.success) {
        const dashboardData = detail.data.data;
        openDetailDrawer(dashboardData);
      } else {
        message.error('상세 정보를 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('Detail fetch error:', error);
      message.error('상세 정보를 불러오는데 실패했습니다');
    }
  };

  // 락 관련 함수들
  const handleAcquireLock = async (dashboardId, type, action) => {
    try {
      setIsLockLoading(true);
      setDashboardIdForLock(dashboardId);
      setLockType(type);
      setActionAfterLock(action);

      // 락 획득 시도
      const response = await acquireLock(dashboardId, type);

      if (response.data.success) {
        // 락 획득 성공, 후속 작업 실행
        if (action) action();
      } else {
        // 락 획득 실패 처리
        if (response.data.error_code === 'LOCK_CONFLICT') {
          setLockConflictInfo(response.data.data);
        } else {
          message.error(response.data.message || '락 획득에 실패했습니다');
        }
      }
    } catch (error) {
      console.error('Lock acquisition error:', error);

      if (error.response?.data?.error_code === 'LOCK_CONFLICT') {
        setLockConflictInfo(error.response.data.data);
      } else {
        message.error('락 획득 중 오류가 발생했습니다');
      }
    } finally {
      setIsLockLoading(false);
    }
  };

  const handleReleaseLock = async (dashboardId, type) => {
    if (!dashboardId || !type) return;

    try {
      await releaseLock(dashboardId, type);
      // 성공 시 추가 작업 없음 (UI에 락 해제 알림은 필요 없음)
    } catch (error) {
      console.error('Lock release error:', error);
      // 해제 실패해도 무시 (이미 해제된 경우일 수 있음)
    }
  };

  const handleAcquireMultipleLocks = async (dashboardIds, type, action) => {
    if (!dashboardIds || dashboardIds.length === 0) {
      message.warning('선택된 항목이 없습니다');
      return false;
    }

    try {
      setIsLockLoading(true);
      setLockType(type);
      setActionAfterLock(action);

      // 다중 락 획득 시도
      const response = await acquireLock(dashboardIds, type, true);

      if (response.data.success) {
        // 성공 시 후속 작업 실행
        if (action) await action();
        return true;
      } else {
        // 실패 처리
        if (response.data.error_code === 'LOCK_CONFLICT') {
          setLockConflictInfo(response.data.data);
        } else {
          message.error(response.data.message || '락 획득에 실패했습니다');
        }
        return false;
      }
    } catch (error) {
      console.error('Multiple lock acquisition error:', error);

      if (error.response?.data?.error_code === 'LOCK_CONFLICT') {
        setLockConflictInfo(error.response.data.data);
      } else {
        message.error('락 획득 중 오류가 발생했습니다');
      }
      return false;
    } finally {
      setIsLockLoading(false);
    }
  };

  const handleReleaseMultipleLocks = async (dashboardIds, type) => {
    if (!dashboardIds || !dashboardIds.length || !type) return;

    try {
      await releaseLock(dashboardIds, type, true);
    } catch (error) {
      console.error('Multiple lock release error:', error);
      // 실패해도 무시
    }
  };

  // 락 충돌 관련 핸들러
  const handleCancelLock = () => {
    setLockConflictInfo(null);
    setDashboardIdForLock(null);
    setLockType('');
    setActionAfterLock(null);
  };

  const handleRetryLock = async () => {
    setLockConflictInfo(null);

    if (dashboardIdForLock && lockType && actionAfterLock) {
      handleAcquireLock(dashboardIdForLock, lockType, actionAfterLock);
    }
  };

  // 상태 변경 제출 핸들러
  const handleStatusSubmit = () => {
    statusForm
      .validateFields()
      .then((values) => {
        if (!currentDashboard) return;

        statusMutation.mutate({
          id: currentDashboard.dashboard_id,
          data: {
            status: values.status,
            is_admin: userRole === 'ADMIN',
          },
        });
      })
      .catch((error) => {
        console.error('Form validation error:', error);
        message.error('폼 검증에 실패했습니다');
      });
  };

  // 배차 처리 제출 핸들러
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
        console.error('Form validation error:', error);
        message.error('폼 검증에 실패했습니다');
      });
  };

  // 상태 변경 모달 열기 (락 획득 후)
  const showStatusModal = (record) => {
    setCurrentDashboard(record);

    // 락 획득 후 모달 오픈
    handleAcquireLock(record.dashboard_id, 'STATUS', () => {
      openStatusModal(record);
    });
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

  return {
    // 데이터 상태
    data,
    meta: data?.meta || {},
    isLoading,
    searchParams,
    selectedRowKeys,
    currentDashboard,

    // 모달 상태
    statusModalVisible,
    assignModalVisible,
    detailVisible,
    createModalVisible,

    // 락 상태
    lockConflictInfo,
    isLockLoading,

    // 폼 인스턴스
    statusForm,
    assignForm,
    detailForm,

    // 기본 핸들러
    handleSearch,
    handleReset,
    handleTableChange,
    onSelectChange,
    setSelectedRowKeys,
    refreshData,

    // 모달 관련 핸들러
    openStatusModal,
    closeStatusModal,
    openAssignModal,
    closeAssignModal,
    openDetailDrawer,
    closeDetailDrawer,
    setCreateModalVisible,

    // 데이터 액션
    showStatusModal,
    showAssignModal,
    fetchDashboardDetail,
    handleStatusSubmit,
    handleAssignSubmit,

    // 락 관련 핸들러
    acquireLock: handleAcquireLock,
    releaseLock: handleReleaseLock,
    acquireMultipleLocks: handleAcquireMultipleLocks,
    releaseMultipleLocks: handleReleaseMultipleLocks,
    cancelLock: handleCancelLock,
    retryLock: handleRetryLock,

    // 뮤테이션
    statusMutation,
    assignMutation,
  };
};

export default useDashboard;

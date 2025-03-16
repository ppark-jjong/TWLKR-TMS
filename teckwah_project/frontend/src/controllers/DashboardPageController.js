// src/controllers/DashboardPageController.js
import { useState, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../contexts/DashboardContext';
import DashboardService from '../services/DashboardService';
import message, { MessageKeys } from '../utils/message';

/**
 * 대시보드 페이지 상태 및 로직 관리를 위한 컨트롤러
 * 컴포넌트와 비즈니스 로직을 분리하기 위한 패턴
 */
const useDashboardPageController = () => {
  const { user } = useAuth();
  const isAdmin = user?.user_role === 'ADMIN';

  const {
    dashboards,
    loading,
    fetchDashboards,
    searchByOrderNo,
    resetSearchMode,
    updateDashboard,
    updateMultipleDashboards,
    removeDashboards,
    searchMode,
  } = useDashboard();

  // 로컬 상태 관리
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // 필터링 상태
  const [typeFilter, setTypeFilter] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [warehouseFilter, setWarehouseFilter] = useState(null);
  const [orderNoSearch, setOrderNoSearch] = useState('');
  const [filterButtonClicked, setFilterButtonClicked] = useState(false);

  // 요청 중복 방지를 위한 플래그
  const isRefreshingRef = useRef(false);
  const isSearchingRef = useRef(false);
  const isLoadingDetailRef = useRef(false);
  const filterAppliedRef = useRef(false);

  // 대시보드 데이터 로드 함수
  const loadDashboardData = useCallback(
    async (startDate, endDate, forceRefresh = false) => {
      if (isRefreshingRef.current && !forceRefresh) {
        console.log('이미 데이터를 로드 중입니다.');
        return null;
      }

      const key = MessageKeys.DASHBOARD.LOAD;

      try {
        isRefreshingRef.current = true;
        setCurrentPage(1);

        if (searchMode && !forceRefresh) {
          console.log('검색 모드에서는 데이터를 재요청하지 않습니다.');
          return null;
        }

        message.loading('데이터 조회 중...', key);
        console.log(
          '대시보드 데이터 조회 시작:',
          startDate.format('YYYY-MM-DD'),
          '~',
          endDate.format('YYYY-MM-DD')
        );

        filterAppliedRef.current = true;
        const response = await fetchDashboards(
          startDate,
          endDate,
          forceRefresh
        );

        if (forceRefresh) {
          resetFilters();
        }

        const items = response?.items || [];

        if (items.length > 0) {
          message.loadingToSuccess('데이터를 조회했습니다', key);
        } else {
          message.loadingToInfo('조회된 데이터가 없습니다', key);
        }

        return response;
      } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error);
        message.loadingToError(
          '데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          key
        );
        return null;
      } finally {
        isRefreshingRef.current = false;
      }
    },
    [fetchDashboards, searchMode]
  );

  // 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    if (isRefreshingRef.current) {
      console.log('이미 새로고침 중입니다.');
      return;
    }

    const dateRange = JSON.parse(localStorage.getItem('dashboardDateRange'));
    if (dateRange) {
      const startDate = dayjs(dateRange[0]);
      const endDate = dayjs(dateRange[1]);

      if (startDate.isValid() && endDate.isValid()) {
        loadDashboardData(startDate, endDate, true);
        return;
      }
    }

    // 기본값으로 최근 7일
    const endDate = dayjs();
    const startDate = endDate.subtract(7, 'day');
    loadDashboardData(startDate, endDate, true);
  }, [loadDashboardData]);

  // 삭제 핸들러 (관리자 전용)
  const handleDelete = useCallback(async () => {
    if (!isAdmin) {
      message.error(
        '삭제 권한이 없습니다. 관리자만 이 기능을 사용할 수 있습니다.'
      );
      return;
    }

    if (selectedRows.length === 0) {
      message.warning('삭제할 항목을 선택해주세요');
      return;
    }

    const key = MessageKeys.DASHBOARD.DELETE;
    try {
      message.loading('삭제 처리 중...', key);

      const dashboardIds = selectedRows.map((row) => row.dashboard_id);
      console.log('삭제 요청:', dashboardIds);

      await DashboardService.deleteDashboards(dashboardIds);

      removeDashboards(dashboardIds);
      setSelectedRows([]);
      message.loadingToSuccess(
        `선택한 ${selectedRows.length}개 항목이 삭제되었습니다`,
        key
      );
    } catch (error) {
      console.error('삭제 실패:', error);

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
        handleRefresh();
      } else {
        message.loadingToError(
          '삭제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          key
        );
      }
    }
  }, [selectedRows, isAdmin, removeDashboards, handleRefresh]);

  // 행 클릭 핸들러
  const handleRowClick = useCallback(
    async (record) => {
      if (isLoadingDetailRef.current) {
        console.log('이미 상세 정보를 로딩 중입니다.');
        return;
      }

      const key = MessageKeys.DASHBOARD.DETAIL;
      try {
        isLoadingDetailRef.current = true;
        message.loading('상세 정보 조회 중...', key);

        const detailData = await DashboardService.getDashboardDetail(
          record.dashboard_id
        );

        setSelectedDashboard(detailData);
        setShowDetailModal(true);
        message.loadingToSuccess('상세 정보를 조회했습니다', key);
      } catch (error) {
        console.error('상세 정보 조회 실패:', error);

        if (error.response?.status === 404) {
          message.loadingToError(
            '해당 주문 정보를 찾을 수 없습니다. 삭제되었거나 존재하지 않는 주문입니다.',
            key
          );
          handleRefresh();
        } else {
          message.loadingToError(
            '상세 정보 조회 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
            key
          );
        }
      } finally {
        isLoadingDetailRef.current = false;
      }
    },
    [handleRefresh]
  );

  // 주문번호 검색 핸들러
  const handleOrderNoSearch = useCallback(
    async (value) => {
      if (isSearchingRef.current) {
        console.log('이미 검색 중입니다.');
        return;
      }

      if (!value || value.trim() === '') {
        resetSearchMode();
        setOrderNoSearch('');
        setSearchInput('');
        return;
      }

      setOrderNoSearch(value);
      setCurrentPage(1);
      isSearchingRef.current = true;
      setSearchLoading(true);

      const key = MessageKeys.DASHBOARD.LOAD;
      message.loading('주문번호 검색 중...', key);

      try {
        const searchResults = await searchByOrderNo(value);

        if (
          searchResults &&
          searchResults.items &&
          searchResults.items.length > 0
        ) {
          message.loadingToSuccess(
            `검색 결과: ${searchResults.items.length}건`,
            key
          );
        } else {
          message.loadingToInfo(
            `주문번호 "${value}"에 대한 검색 결과가 없습니다`,
            key
          );
        }
      } catch (error) {
        console.error('주문번호 검색 실패:', error);
        message.loadingToError(
          '주문번호 검색 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
          key
        );
      } finally {
        isSearchingRef.current = false;
        setSearchLoading(false);
      }
    },
    [searchByOrderNo, resetSearchMode]
  );

  // 배차 버튼 클릭 핸들러
  const handleAssignClick = useCallback(() => {
    if (selectedRows.length === 0) {
      message.warning('배차할 항목을 선택해주세요');
      return;
    }

    // 관리자는 모든 상태의 주문 배차 가능
    if (isAdmin) {
      setShowAssignModal(true);
      return;
    }

    // 일반 사용자는 대기(WAITING) 상태 주문만 배차 가능
    const invalidItems = selectedRows.filter((row) => row.status !== 'WAITING');
    if (invalidItems.length > 0) {
      const orderNos = invalidItems.map((item) => item.order_no).join(', ');
      message.error(
        `다음 주문은 대기 상태가 아니어서 배차할 수 없습니다: ${orderNos}`,
        null,
        5
      );
      return;
    }

    setShowAssignModal(true);
  }, [selectedRows, isAdmin]);

  // 모달 관련 핸들러
  const handleCreateSuccess = useCallback(() => {
    setShowCreateModal(false);
    message.success('새로운 주문이 성공적으로 등록되었습니다.');
    handleRefresh();
  }, [handleRefresh]);

  const handleAssignSuccess = useCallback(() => {
    setShowAssignModal(false);
    setSelectedRows([]);
    message.success('선택한 주문에 배차가 완료되었습니다.');
    handleRefresh();
  }, [handleRefresh]);

  const handleDetailSuccess = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  // 필터 관련 핸들러
  const handleTypeFilterChange = useCallback((value) => {
    setTypeFilter(value);
  }, []);

  const handleDepartmentFilterChange = useCallback((value) => {
    setDepartmentFilter(value);
  }, []);

  const handleWarehouseFilterChange = useCallback((value) => {
    setWarehouseFilter(value);
  }, []);

  const handleSearchInputChange = useCallback(
    (e) => {
      setSearchInput(e.target.value);
      if (!e.target.value) {
        resetSearchMode();
        setOrderNoSearch('');
      }
    },
    [resetSearchMode]
  );

  // 필터 초기화
  const resetFilters = useCallback(() => {
    setTypeFilter(null);
    setDepartmentFilter(null);
    setWarehouseFilter(null);
    setOrderNoSearch('');
    setSearchInput('');
    setCurrentPage(1);
    filterAppliedRef.current = false;
  }, []);

  // 필터 적용 트리거
  const handleApplyFilters = useCallback(() => {
    setFilterButtonClicked(true);
  }, []);

  return {
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
  };
};

export default useDashboardPageController;

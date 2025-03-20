// src/controllers/DashboardController.js
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../contexts/DashboardContext';
import DashboardService from '../services/DashboardService';
import message from '../utils/message';
import { MessageKeys } from '../utils/message';
import { useLogger } from '../utils/LogUtils';
import { cancelAllPendingRequests } from '../utils/AxiosConfig';

/**
 * 대시보드 페이지 상태 및 로직 관리를 위한 컨트롤러
 * 기존 DashboardPageController.js의 개선 버전
 * - 불필요한 상태 관리 제거
 * - 백엔드 API 명세 기반 로직 최적화
 * - 메모이제이션 효율화
 * - 비동기 작업 관리 개선
 *
 * @returns {Object} 대시보드 컨트롤러 상태 및 함수
 */
const useDashboardController = () => {
  const logger = useLogger('DashboardController');
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  // DashboardContext에서 상태 및 함수 가져오기
  const {
    dashboards,
    loading: dashboardsLoading,
    dateRange: contextDateRange,
    fetchDashboards,
    searchByOrderNo,
    resetSearchMode,
    updateDashboard,
    updateMultipleDashboards,
    removeDashboards,
    searchMode,
    availableDateRange,
    error: contextError,
    getDashboardVersion,
  } = useDashboard();

  // 로컬 상태 관리 - 필수 상태만 유지
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // 필터링 상태 - 백엔드 API 명세 기반
  const [typeFilter, setTypeFilter] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [warehouseFilter, setWarehouseFilter] = useState(null);
  const [orderNoSearch, setOrderNoSearch] = useState('');
  const [filterButtonClicked, setFilterButtonClicked] = useState(false);

  // 요청 중복 방지를 위한 플래그 - useRef 활용
  const isRefreshingRef = useRef(false);
  const isSearchingRef = useRef(false);
  const isLoadingDetailRef = useRef(false);

  /**
   * 대시보드 데이터 로드 함수
   * 백엔드 API 명세와 일치하는 범위 기반 조회
   *
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   * @param {boolean} forceRefresh - 강제 새로고침 여부
   * @returns {Promise<Object>} - 조회 결과
   */
  const loadDashboardData = useCallback(
    async (startDate, endDate, forceRefresh = false) => {
      // 중복 요청 방지
      if (isRefreshingRef.current && !forceRefresh) {
        logger.info('이미 데이터를 로드 중입니다.');
        return null;
      }

      const key = MessageKeys.DASHBOARD.LOAD;

      try {
        isRefreshingRef.current = true;
        setCurrentPage(1);

        // 검색 모드에서는 데이터 로드 제한 (강제 새로고침 제외)
        if (searchMode && !forceRefresh) {
          logger.info('검색 모드에서는 데이터를 재요청하지 않습니다.');
          return null;
        }

        message.loading('데이터 조회 중...', key);

        // 날짜 범위 저장 - 새로고침 시 사용
        localStorage.setItem(
          'dashboardDateRange',
          JSON.stringify([
            startDate.format('YYYY-MM-DD'),
            endDate.format('YYYY-MM-DD'),
          ])
        );

        // 서비스 호출 전 성능 측정 시작
        logger.debug(
          `데이터 로드 요청: ${startDate.format(
            'YYYY-MM-DD'
          )} ~ ${endDate.format('YYYY-MM-DD')}`
        );
        const startTime = performance.now();

        // DashboardContext의 fetchDashboards 함수 호출
        const response = await fetchDashboards(
          startDate,
          endDate,
          forceRefresh
        );

        // 성능 측정 완료
        const endTime = performance.now();
        logger.debug(`데이터 로드 완료: ${Math.round(endTime - startTime)}ms`);

        // 강제 새로고침인 경우 필터 초기화
        if (forceRefresh) {
          resetFilters();
        }

        // 응답 데이터 분석 및 메시지 표시
        const items = response?.items || [];

        if (items.length > 0) {
          message.loadingToSuccess(
            `${items.length}건의 데이터를 조회했습니다`,
            key
          );
        } else {
          message.loadingToInfo('조회된 데이터가 없습니다', key);
        }

        return response;
      } catch (error) {
        logger.error('대시보드 데이터 로드 실패:', error);
        message.loadingToError(
          '데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          key
        );
        return null;
      } finally {
        isRefreshingRef.current = false;
      }
    },
    [fetchDashboards, searchMode, logger, resetFilters]
  );

  /**
   * 새로고침 핸들러
   * 저장된 날짜 범위 또는 기본값(최근 7일)으로 데이터 재로드
   */
  const handleRefresh = useCallback(() => {
    if (isRefreshingRef.current) {
      logger.info('이미 새로고침 중입니다.');
      return;
    }

    // 성능 측정 시작
    logger.measure('새로고침 처리 시간', () => {
      // 저장된 날짜 범위 사용
      const dateRangeStr = localStorage.getItem('dashboardDateRange');
      if (dateRangeStr) {
        try {
          const dateRange = JSON.parse(dateRangeStr);
          if (Array.isArray(dateRange) && dateRange.length === 2) {
            const startDate = dayjs(dateRange[0]);
            const endDate = dayjs(dateRange[1]);

            if (startDate.isValid() && endDate.isValid()) {
              loadDashboardData(startDate, endDate, true);
              return;
            }
          }
        } catch (error) {
          logger.error('저장된 날짜 범위 파싱 실패:', error);
        }
      }

      // 기본값으로 최근 7일
      const endDate = dayjs();
      const startDate = endDate.subtract(7, 'day');
      loadDashboardData(startDate, endDate, true);
    });
  }, [loadDashboardData, logger]);

  /**
   * 삭제 핸들러 (관리자 전용)
   * 선택된 항목을 삭제하고 목록 갱신
   * 백엔드 API 명세와 일치하는 일괄 삭제 방식
   */
  const handleDelete = useCallback(async () => {
    // 관리자 권한 확인
    if (!isAdmin) {
      message.error(
        '삭제 권한이 없습니다. 관리자만 이 기능을 사용할 수 있습니다.',
        MessageKeys.AUTH.PERMISSION
      );
      return;
    }

    // 선택한 항목 확인
    if (selectedRows.length === 0) {
      message.warning('삭제할 항목을 선택해주세요');
      return;
    }

    const key = MessageKeys.DASHBOARD.DELETE;
    try {
      message.loading('삭제 처리 중...', key);

      // dashboard_id 배열 추출
      const dashboardIds = selectedRows.map((row) => row.dashboard_id);
      logger.info(`삭제 요청: ${dashboardIds.length}건`, dashboardIds);

      // 백엔드 API 호출
      const success = await removeDashboards(dashboardIds);

      if (success) {
        setSelectedRows([]);
        message.loadingToSuccess(
          `선택한 ${selectedRows.length}개 항목이 삭제되었습니다`,
          key
        );
      } else {
        message.loadingToError('삭제 처리 중 오류가 발생했습니다', key);
      }
    } catch (error) {
      logger.error('삭제 실패:', error);

      // 오류 유형별 메시지 처리
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
  }, [selectedRows, isAdmin, removeDashboards, handleRefresh, logger]);

  /**
   * 행 클릭 핸들러
   * 대시보드 상세 정보 조회 및 모달 표시
   * 백엔드 API 명세와 일치하는 단일 대시보드 조회
   */
  const handleRowClick = useCallback(
    async (record) => {
      // 중복 요청 방지
      if (isLoadingDetailRef.current) {
        logger.info('이미 상세 정보를 로딩 중입니다.');
        return;
      }

      const key = MessageKeys.DASHBOARD.DETAIL;
      try {
        isLoadingDetailRef.current = true;
        message.loading('상세 정보 조회 중...', key);

        // 성능 측정
        const detailData = await logger.measure(
          `대시보드 상세 조회 (ID: ${record.dashboard_id})`,
          () => DashboardService.getDashboardDetail(record.dashboard_id)
        );

        // 조회 결과 확인
        if (!detailData) {
          message.loadingToError('상세 정보를 조회할 수 없습니다', key);
          return;
        }

        // 상세 정보 설정 및 모달 표시
        setSelectedDashboard(detailData);
        setShowDetailModal(true);
        message.loadingToSuccess('상세 정보를 조회했습니다', key);
      } catch (error) {
        logger.error('상세 정보 조회 실패:', error);

        // 오류 유형별 메시지 처리
        if (error.response?.status === 404) {
          message.loadingToError(
            '해당 주문 정보를 찾을 수 없습니다. 삭제되었거나 존재하지 않는 주문입니다.',
            key
          );
          // 404 오류 시 목록 새로고침 (이미 삭제된 항목일 수 있음)
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
    [handleRefresh, logger]
  );

  /**
   * 주문번호 검색 핸들러
   * 백엔드 API 명세와 일치하는 주문번호 기반 검색
   *
   * @param {string} value - 검색할 주문번호
   */
  const handleOrderNoSearch = useCallback(
    async (value) => {
      // 중복 요청 방지
      if (isSearchingRef.current) {
        logger.info('이미 검색 중입니다.');
        return;
      }

      // 빈 검색어 처리 - 검색 모드 초기화
      if (!value || value.trim() === '') {
        resetSearchMode();
        setOrderNoSearch('');
        setSearchInput('');
        return;
      }

      // 검색 상태 설정
      setOrderNoSearch(value);
      setCurrentPage(1);
      isSearchingRef.current = true;
      setSearchLoading(true);

      const key = MessageKeys.DASHBOARD.SEARCH;
      message.loading('주문번호 검색 중...', key);

      try {
        // 성능 측정
        const searchResults = await logger.measure(
          `주문번호 검색 (키워드: ${value})`,
          () => searchByOrderNo(value)
        );

        // 검색 결과 확인 및 메시지 표시
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
        logger.error('주문번호 검색 실패:', error);
        message.loadingToError(
          '주문번호 검색 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
          key
        );
      } finally {
        isSearchingRef.current = false;
        setSearchLoading(false);
      }
    },
    [searchByOrderNo, resetSearchMode, logger]
  );

  /**
   * 배차 버튼 클릭 핸들러
   * 배차 모달 표시 및 권한 체크
   */
  const handleAssignClick = useCallback(() => {
    // 선택한 항목 확인
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
        `다음 주문은 대기 상태가 아니어서 배차할 수 없습니다: ${orderNos}`
      );
      return;
    }

    setShowAssignModal(true);
  }, [selectedRows, isAdmin]);

  /**
   * 모달 관련 핸들러 - 간소화
   */
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

  /**
   * 필터 관련 핸들러
   */
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

  /**
   * 필터 초기화 함수
   */
  const resetFilters = useCallback(() => {
    setTypeFilter(null);
    setDepartmentFilter(null);
    setWarehouseFilter(null);
    setOrderNoSearch('');
    setSearchInput('');
    setCurrentPage(1);
  }, []);

  /**
   * 필터 적용 트리거
   */
  const handleApplyFilters = useCallback(() => {
    setFilterButtonClicked(true);
  }, []);

  /**
   * 진행 중인 요청 취소
   * 컴포넌트 언마운트 시 호출
   */
  const cancelPendingRequests = useCallback(() => {
    logger.info('진행 중인 요청 취소');
    cancelAllPendingRequests();
  }, [logger]);

  // 날짜 범위 변경 시 데이터 로드
  useEffect(() => {
    if (contextDateRange && contextDateRange.length === 2) {
      loadDashboardData(contextDateRange[0], contextDateRange[1]);
    }
  }, [contextDateRange, loadDashboardData]);

  // 컴포넌트 언마운트 시 정리 작업
  useEffect(() => {
    return () => {
      cancelPendingRequests();
    };
  }, [cancelPendingRequests]);

  // 컨트롤러 API - 필요한 상태와 함수만 노출
  return {
    // 상태
    dashboards,
    loading: dashboardsLoading,
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
    availableDateRange,
    error: contextError,

    // 상태 설정 함수
    setSelectedRows,
    setShowCreateModal,
    setShowAssignModal,
    setShowDetailModal,
    setSelectedDashboard,
    setFilterButtonClicked,
    setCurrentPage,

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

    // 유틸리티 함수
    getDashboardVersion,
    cancelPendingRequests,
  };
};

export default useDashboardController;

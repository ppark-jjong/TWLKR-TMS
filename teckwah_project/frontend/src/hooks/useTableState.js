// src/hooks/useTableState.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLogger } from '../utils/LogUtils';

/**
 * 테이블 상태 관리 커스텀 훅
 * 정렬, 필터링, 페이징 등의 테이블 상태를 관리
 *
 * @param {Object} options - 초기 설정 옵션
 * @returns {Object} 테이블 상태 및 액션 함수
 */
const useTableState = ({
  initialPageSize = 50,
  initialTypeFilter = null,
  initialDepartmentFilter = null,
  initialWarehouseFilter = null,
  initialOrderNoSearch = '',
  isAdmin = false,
  dataSource = [],
}) => {
  const logger = useLogger('useTableState');

  // 정렬 상태
  const [sortedInfo, setSortedInfo] = useState({});

  // 필터 상태
  const [filters, setFilters] = useState({
    typeFilter: initialTypeFilter,
    departmentFilter: initialDepartmentFilter,
    warehouseFilter: initialWarehouseFilter,
    searchInput: initialOrderNoSearch || '',
  });

  // 필터링된 데이터
  const [filteredData, setFilteredData] = useState([]);

  // 페이지 설정
  const [pageSize] = useState(initialPageSize);

  // 버전 컬럼 표시 여부
  const [showVersionColumn] = useState(isAdmin);

  // 필터링 실행 플래그
  const isFilteringRef = useRef(false);

  /**
   * 정렬 변경 핸들러
   * @param {Object} sorter - 정렬 정보
   */
  const handleSortChange = useCallback(
    (sorter) => {
      setSortedInfo(sorter);
      logger.debug('테이블 정렬 변경:', sorter);
    },
    [logger]
  );

  /**
   * 필터 변경 핸들러
   * @param {string} filterType - 필터 유형
   * @param {any} value - 필터 값
   */
  const handleFilterChange = useCallback(
    (filterType, value) => {
      setFilters((prev) => ({
        ...prev,
        [filterType]: value,
      }));
      logger.debug(`필터 변경: ${filterType} = ${value}`);
    },
    [logger]
  );

  /**
   * 필터 초기화 핸들러
   */
  const handleFilterReset = useCallback(() => {
    setFilters({
      typeFilter: null,
      departmentFilter: null,
      warehouseFilter: null,
      searchInput: '',
    });
    logger.debug('필터 초기화');
  }, [logger]);

  /**
   * 필터 적용 핸들러
   */
  const handleFilterApply = useCallback(() => {
    processData(dataSource);
    logger.debug('필터 적용 실행');
  }, [dataSource, logger]);

  /**
   * 데이터 필터링 및 정렬 처리
   * @param {Array} data - 처리할 원본 데이터
   */
  const processData = useCallback(
    (data) => {
      // 데이터가 비어있거나 이미 필터링 중인 경우 스킵
      if (!Array.isArray(data) || data.length === 0 || isFilteringRef.current) {
        setFilteredData([]);
        return;
      }

      isFilteringRef.current = true;

      try {
        // 성능 측정 시작
        const startTime = performance.now();
        logger.debug('테이블 데이터 필터링 시작:', {
          총건수: data.length,
          종류필터: filters.typeFilter,
          부서필터: filters.departmentFilter,
          허브필터: filters.warehouseFilter,
          주문번호검색: filters.searchInput,
        });

        // 원본 데이터 복사
        let result = [...data];

        // 필터 적용
        if (filters.typeFilter) {
          result = result.filter((item) => item.type === filters.typeFilter);
        }

        if (filters.departmentFilter) {
          result = result.filter(
            (item) => item.department === filters.departmentFilter
          );
        }

        if (filters.warehouseFilter) {
          result = result.filter(
            (item) => item.warehouse === filters.warehouseFilter
          );
        }

        if (filters.searchInput) {
          result = result.filter((item) =>
            String(item.order_no).includes(filters.searchInput)
          );
        }

        // 정렬 적용
        result = applySorting(result, sortedInfo);

        // 성능 측정 완료
        const endTime = performance.now();
        logger.debug(
          `테이블 데이터 필터링 완료: ${result.length}건, ${Math.round(
            endTime - startTime
          )}ms`
        );

        setFilteredData(result);
      } finally {
        isFilteringRef.current = false;
      }
    },
    [filters, sortedInfo, logger]
  );

  /**
   * 데이터 정렬 함수
   * @param {Array} data - 정렬할 데이터
   * @param {Object} sorterInfo - 정렬 설정
   * @returns {Array} 정렬된 데이터
   */
  const applySorting = useCallback((data, sorterInfo = {}) => {
    if (!Array.isArray(data)) return [];

    const { columnKey, order } = sorterInfo;

    // 특정 컬럼 정렬이 없는 경우 - 기본 정렬
    if (!columnKey || !order) {
      return data.sort((a, b) => {
        // 상태 그룹화 (대기, 진행 vs 완료, 이슈, 취소)
        const aGroup = ['COMPLETE', 'ISSUE', 'CANCEL'].includes(a.status)
          ? 1
          : 0;
        const bGroup = ['COMPLETE', 'ISSUE', 'CANCEL'].includes(b.status)
          ? 1
          : 0;

        // 그룹이 다르면 그룹으로 정렬
        if (aGroup !== bGroup) {
          return aGroup - bGroup;
        }

        // 같은 그룹 내에서는 ETA로 정렬
        const etaA = a.eta ? new Date(a.eta) : new Date(9999, 11, 31);
        const etaB = b.eta ? new Date(b.eta) : new Date(9999, 11, 31);
        return etaA - etaB;
      });
    }

    // 특정 컬럼 정렬이 요청된 경우
    return [...data].sort((a, b) => {
      let result = 0;

      // 컬럼별 정렬 로직
      switch (columnKey) {
        case 'order_no':
          // 숫자형 주문번호 정렬
          result = String(a.order_no).localeCompare(
            String(b.order_no),
            undefined,
            {
              numeric: true,
            }
          );
          break;

        case 'eta':
          // 날짜 정렬
          const etaA = a.eta ? new Date(a.eta) : new Date(9999, 11, 31);
          const etaB = b.eta ? new Date(b.eta) : new Date(9999, 11, 31);
          result = etaA - etaB;
          break;

        case 'create_time':
          // 생성 시간 정렬
          const createTimeA = a.create_time
            ? new Date(a.create_time)
            : new Date(0);
          const createTimeB = b.create_time
            ? new Date(b.create_time)
            : new Date(0);
          result = createTimeA - createTimeB;
          break;

        case 'status':
          // 상태 정렬 (WAITING, IN_PROGRESS, COMPLETE, ISSUE, CANCEL 순)
          const statusOrder = {
            WAITING: 1,
            IN_PROGRESS: 2,
            COMPLETE: 3,
            ISSUE: 4,
            CANCEL: 5,
          };
          result =
            (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
          break;

        case 'type':
          // 종류 정렬
          result = (a.type || '').localeCompare(b.type || '');
          break;

        case 'department':
          // 부서 정렬
          result = (a.department || '').localeCompare(b.department || '');
          break;

        case 'warehouse':
          // 출발허브 정렬
          result = (a.warehouse || '').localeCompare(b.warehouse || '');
          break;

        case 'version':
          // 버전 정렬 (숫자)
          result = (a.version || 0) - (b.version || 0);
          break;

        default:
          // 기본은 ETA 정렬
          const defaultEtaA = a.eta ? new Date(a.eta) : new Date(9999, 11, 31);
          const defaultEtaB = b.eta ? new Date(b.eta) : new Date(9999, 11, 31);
          result = defaultEtaA - defaultEtaB;
      }

      // 정렬 방향 적용
      return order === 'descend' ? -result : result;
    });
  }, []);

  // 초기 필터 상태 설정
  useEffect(() => {
    setFilters({
      typeFilter: initialTypeFilter,
      departmentFilter: initialDepartmentFilter,
      warehouseFilter: initialWarehouseFilter,
      searchInput: initialOrderNoSearch || '',
    });
  }, [
    initialTypeFilter,
    initialDepartmentFilter,
    initialWarehouseFilter,
    initialOrderNoSearch,
  ]);

  return {
    sortedInfo,
    filteredData,
    filters,
    pageSize,
    showVersionColumn,
    handleSortChange,
    handleFilterChange,
    handleFilterReset,
    handleFilterApply,
    processData,
  };
};

export default useTableState;

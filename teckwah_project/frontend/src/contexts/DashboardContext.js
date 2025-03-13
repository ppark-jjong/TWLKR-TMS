// frontend/src/contexts/DashboardContext.js

import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import DashboardService from '../services/DashboardService';
import message, { MessageKeys, MessageTemplates } from '../utils/message';

const DashboardContext = createContext(null);

/**
 * 대시보드 컨텍스트 프로바이더 컴포넌트
 * - 관리자와 일반 사용자의 기능 통합 관리
 * - 검색, 필터링, 데이터 조회 등의 상태 관리
 */
export const DashboardProvider = ({ children }) => {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [availableDateRange, setAvailableDateRange] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [searchMode, setSearchMode] = useState(false); // 검색 모드 상태

  // 요청 상태 추적을 위한 ref 추가
  const requestInProgressRef = useRef(false);
  const searchRequestInProgressRef = useRef(false);

  // 데이터 조회 함수 (권한 구분 없이 통합)
  const fetchDashboards = useCallback(
    async (startDate, endDate, forceRefresh = false) => {
      // 요청 중복 방지 체크
      if (requestInProgressRef.current && !forceRefresh) {
        console.log(
          '이미 데이터 요청이.진행 중입니다. 중복 요청을 방지합니다.'
        );
        return { items: dashboards, date_range: availableDateRange };
      }

      // 이미 검색 모드인 경우와 강제 새로고침이 아닌 경우 데이터 재요청 방지
      if (searchMode && !forceRefresh && dashboards.length > 0) {
        console.log('검색 모드에서는 데이터를 재요청하지 않습니다.');
        return { items: dashboards, date_range: availableDateRange };
      }

      try {
        // 요청 시작 표시
        requestInProgressRef.current = true;
        setLoading(true);

        console.log(
          '대시보드 데이터 요청:',
          startDate.format('YYYY-MM-DD'),
          '-',
          endDate.format('YYYY-MM-DD')
        );

        // 백엔드 API 호출
        const response = await DashboardService.getDashboardList(
          startDate,
          endDate
        );
        console.log('fetchDashboards 결과:', response);

        // 항목과 날짜 범위 정보 처리
        const items = response.items || [];
        const dateRangeInfo = response.date_range || null;

        // 검색 모드가 아닌 경우에만 데이터 업데이트
        if (!searchMode || forceRefresh) {
          setDashboards(items);
          setDateRange([startDate, endDate]);
          setLastUpdate(Date.now());

          // 날짜 범위 정보가 있으면 상태 업데이트
          if (dateRangeInfo) {
            setAvailableDateRange(dateRangeInfo);
          }
        }

        return response;
      } catch (error) {
        console.error(
          '대시보드 목록 조회 오류:',
          error.response?.data || error
        );
        message.error(
          '데이터 조회 중 오류가 발생했습니다',
          MessageKeys.DASHBOARD.LOAD
        );
        return { items: [], date_range: null };
      } finally {
        // 요청 완료 표시
        requestInProgressRef.current = false;
        setLoading(false);
      }
    },
    [dashboards, searchMode, availableDateRange]
  );

  /**
   * 주문번호 검색 함수
   * @param {string} orderNo - 검색할 주문번호
   * @returns {Promise<Object>} - 검색 결과
   */
  const searchByOrderNo = useCallback(
    async (orderNo) => {
      // 요청 중복 방지 체크
      if (searchRequestInProgressRef.current) {
        console.log('이미 검색 요청이 진행 중입니다. 중복 요청을 방지합니다.');
        return { items: dashboards };
      }

      try {
        // 검색 요청 시작 표시
        searchRequestInProgressRef.current = true;
        setLoading(true);
        setSearchMode(true);

        console.log('주문번호 검색 요청:', orderNo);
        const searchResults = await DashboardService.searchDashboardsByOrderNo(
          orderNo
        );

        // 정렬 적용 후 데이터 설정
        const sortedResults =
          DashboardService.sortDashboardsByStatus(searchResults);
        setDashboards(sortedResults);
        setLastUpdate(Date.now());

        return { items: sortedResults };
      } catch (error) {
        console.error('주문번호 검색 실패:', error);
        message.error(
          '검색 중 오류가 발생했습니다',
          MessageKeys.DASHBOARD.LOAD
        );
        return { items: [] };
      } finally {
        // 검색 요청 완료 표시
        searchRequestInProgressRef.current = false;
        setLoading(false);
      }
    },
    [dashboards]
  );

  /**
   * 검색 모드 초기화 (날짜 기준 데이터로 복귀)
   */
  const resetSearchMode = useCallback(() => {
    // 이미 요청 중인 경우 중복 요청 방지
    if (requestInProgressRef.current) {
      console.log('이미 요청이 진행 중입니다. 초기화 요청을 무시합니다.');
      return;
    }

    setSearchMode(false);
    if (dateRange && dateRange[0] && dateRange[1]) {
      fetchDashboards(dateRange[0], dateRange[1], true);
    }
  }, [dateRange, fetchDashboards]);

  // 단일 대시보드 업데이트 (낙관적 락 고려)
  const updateDashboard = useCallback((dashboardId, updates) => {
    setDashboards((prev) =>
      prev.map((dash) =>
        dash.dashboard_id === dashboardId
          ? {
              ...dash,
              ...updates,
              // 버전 값이 있으면 증가, 없으면 기존 버전 유지
              version: updates.version || dash.version,
            }
          : dash
      )
    );
  }, []);

  // 여러 대시보드 업데이트 (새로운 항목 추가 로직 포함)
  const updateMultipleDashboards = useCallback((newDashboards) => {
    console.log('updateMultipleDashboards 호출됨:', newDashboards);

    if (!Array.isArray(newDashboards)) {
      console.error(
        'updateMultipleDashboards: newDashboards는 배열이어야 합니다',
        newDashboards
      );
      return;
    }

    // 정렬 적용 후 데이터 설정
    const sortedDashboards =
      DashboardService.sortDashboardsByStatus(newDashboards);

    // 데이터가 있을 경우에만 상태 업데이트
    if (sortedDashboards.length > 0) {
      setDashboards(sortedDashboards);
      setLastUpdate(Date.now());
    } else if (newDashboards.length === 0) {
      // 명시적으로 빈 배열을 설정한 경우 (검색 결과 없음 등)
      setDashboards([]);
    }
  }, []);

  // 대시보드 삭제
  const removeDashboards = useCallback((dashboardIds) => {
    if (!Array.isArray(dashboardIds)) {
      console.error(
        'removeDashboards: dashboardIds는 배열이어야 합니다',
        dashboardIds
      );
      return;
    }

    setDashboards((prev) =>
      prev.filter((dash) => !dashboardIds.includes(dash.dashboard_id))
    );
  }, []);

  // 컨텍스트에 제공할 값
  const value = {
    dashboards,
    loading,
    dateRange,
    lastUpdate,
    searchMode,
    availableDateRange,
    setAvailableDateRange,
    fetchDashboards,
    searchByOrderNo,
    resetSearchMode,
    updateDashboard,
    updateMultipleDashboards,
    removeDashboards,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

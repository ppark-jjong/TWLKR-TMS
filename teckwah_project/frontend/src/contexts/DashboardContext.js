// src/contexts/DashboardContext.js (수정)
import React, { useState, useContext, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useAuth } from "./AuthContext";
import DashboardService from "../services/DashboardService";
import MessageService from "../utils/MessageService";
import { MessageKeys } from "../utils/Constants";

// Context 생성
const DashboardContext = createContext(null);

/**
 * 간소화된 대시보드 컨텍스트 프로바이더
 * 낙관적 락 관련 코드 제거
 */
export const DashboardProvider = ({ children }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();

  // 상태 관리
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [searchMode, setSearchMode] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 대시보드 데이터 조회
   */
  const fetchDashboards = useCallback(
    async (startDate, endDate, forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);

        // 검색 모드 & 강제 새로고침 아닌 경우 처리
        if (searchMode && !forceRefresh && dashboards.length > 0) {
          return {
            items: dashboards,
          };
        }

        const formattedStartDate = startDate.format("YYYY-MM-DD");
        const formattedEndDate = endDate.format("YYYY-MM-DD");

        MessageService.loading("데이터 조회 중...", MessageKeys.DASHBOARD.LOAD);

        // 백엔드 API 호출
        const response = await DashboardService.getDashboardList(
          startDate,
          endDate
        );

        // 검색 모드가 아니거나 강제 새로고침인 경우에만 데이터 업데이트
        if (!searchMode || forceRefresh) {
          setDashboards(response.items || []);
          setDateRange([startDate, endDate]);
        }

        // 응답 데이터 분석 및 메시지 표시
        const items = response?.items || [];

        if (items.length > 0) {
          MessageService.success(
            `${items.length}건의 데이터를 조회했습니다`,
            MessageKeys.DASHBOARD.LOAD
          );
        } else {
          MessageService.info(
            "조회된 데이터가 없습니다",
            MessageKeys.DASHBOARD.LOAD
          );
        }

        return response;
      } catch (error) {
        console.error("대시보드 데이터 조회 실패:", error);
        setError("데이터 조회 중 오류가 발생했습니다");

        MessageService.error(
          "데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          MessageKeys.DASHBOARD.LOAD
        );

        return { items: [] };
      } finally {
        setLoading(false);
      }
    },
    [dashboards, searchMode]
  );

  /**
   * 주문번호 검색 기능
   */
  const searchByOrderNo = useCallback(
    async (orderNo) => {
      // 검색어 없으면 검색 모드 초기화
      if (!orderNo || !orderNo.trim()) {
        if (searchMode) {
          setSearchMode(false);
        }
        return { items: dashboards };
      }

      try {
        setLoading(true);
        setSearchMode(true);
        setError(null);

        MessageService.loading(
          "주문번호 검색 중...",
          MessageKeys.DASHBOARD.SEARCH
        );

        // 검색 API 호출
        const searchResults = await DashboardService.searchByOrderNo(orderNo);

        // 검색 결과 설정
        const searchItems = searchResults.items || [];
        setDashboards(searchItems);

        // 검색 결과 확인 및 메시지 표시
        if (searchItems.length > 0) {
          MessageService.success(
            `검색 결과: ${searchItems.length}건`,
            MessageKeys.DASHBOARD.SEARCH
          );
        } else {
          MessageService.info(
            `주문번호 "${orderNo}"에 대한 검색 결과가 없습니다`,
            MessageKeys.DASHBOARD.SEARCH
          );
        }

        return { items: searchItems };
      } catch (error) {
        console.error("주문번호 검색 실패:", error);
        setError("검색 중 오류가 발생했습니다");

        MessageService.error(
          "주문번호 검색 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
          MessageKeys.DASHBOARD.SEARCH
        );

        return { items: [] };
      } finally {
        setLoading(false);
      }
    },
    [dashboards, searchMode]
  );

  /**
   * 검색 모드 초기화 함수
   */
  const resetSearchMode = useCallback(() => {
    setSearchMode(false);

    // 저장된 날짜 범위로 데이터 재로드
    if (dateRange?.[0] && dateRange?.[1]) {
      fetchDashboards(dateRange[0], dateRange[1], true);
    }
  }, [dateRange, fetchDashboards]);

  /**
   * 대시보드 삭제 함수
   */
  const removeDashboards = useCallback(
    async (dashboardIds) => {
      if (!isAdmin) {
        MessageService.error("관리자 권한이 필요합니다");
        return false;
      }

      try {
        MessageService.loading("삭제 처리 중...", MessageKeys.DASHBOARD.DELETE);

        // API 호출
        const success = await DashboardService.deleteDashboards(dashboardIds);

        if (success) {
          // 로컬 상태 업데이트
          setDashboards((prev) =>
            prev.filter((dash) => !dashboardIds.includes(dash.dashboard_id))
          );

          MessageService.success(
            "선택한 항목이 삭제되었습니다",
            MessageKeys.DASHBOARD.DELETE
          );
          return true;
        }

        return false;
      } catch (error) {
        console.error("대시보드 삭제 실패:", error);
        MessageService.error(
          "삭제 중 오류가 발생했습니다",
          MessageKeys.DASHBOARD.DELETE
        );
        return false;
      }
    },
    [isAdmin]
  );

  /**
   * 현재 날짜를 기준으로 과거 N일 범위 설정
   */
  const setDefaultDateRange = useCallback((days = 7) => {
    const endDate = dayjs();
    const startDate = endDate.subtract(days, "day");
    setDateRange([startDate, endDate]);
  }, []);

  // 컨텍스트 값
  const contextValue = {
    // 상태
    dashboards,
    loading,
    dateRange,
    searchMode,
    error,
    isAdmin,

    // 액션
    fetchDashboards,
    searchByOrderNo,
    resetSearchMode,
    updateDashboard: (dashboardId, updates) => {
      setDashboards((prev) =>
        prev.map((dash) =>
          dash.dashboard_id === dashboardId ? { ...dash, ...updates } : dash
        )
      );
    },
    updateMultipleDashboards: (newDashboards) => {
      const updatedMap = new Map(dashboards.map((d) => [d.dashboard_id, d]));

      newDashboards.forEach((newDash) => {
        if (newDash.dashboard_id) {
          updatedMap.set(newDash.dashboard_id, {
            ...updatedMap.get(newDash.dashboard_id),
            ...newDash,
          });
        }
      });

      setDashboards(Array.from(updatedMap.values()));
    },
    removeDashboards,
    setDefaultDateRange,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

// 훅 사용법 단순화
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};

export default DashboardContext;

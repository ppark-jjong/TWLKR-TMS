// frontend/src/contexts/DashboardContext.js
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { message } from 'antd';
import DashboardService from '../services/DashboardService';
import { useAuth } from './AuthContext';

const DashboardContext = createContext(null);

// 폴링 간격 설정
const POLLING_INTERVALS = {
  DEFAULT: 30000, // 30초
  ACTIVE: 15000, // 15초 (변경사항 있을 때)
  IDLE: 45000, // 45초 (변경사항 없을 때)
};

export const DashboardProvider = ({ children }) => {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(
    POLLING_INTERVALS.DEFAULT
  );
  const [lastUpdate, setLastUpdate] = useState(null);
  const pollingTimeoutRef = useRef(null);
  const { user } = useAuth();

  // 메모리 누수 방지를 위한 마운트 상태 추적
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  const startPolling = useCallback(
    (date) => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }

      const poll = async () => {
        try {
          const response = await DashboardService.getDashboardList(date);

          if (!mountedRef.current) return;

          const hasChanges =
            JSON.stringify(response.items) !== JSON.stringify(dashboards);

          if (hasChanges) {
            setDashboards(response.items);
            setPollingInterval(POLLING_INTERVALS.ACTIVE);
            setLastUpdate(new Date());
          } else {
            setPollingInterval(POLLING_INTERVALS.IDLE);
          }

          pollingTimeoutRef.current = setTimeout(poll, pollingInterval);
        } catch (error) {
          console.error('Polling error:', error);
          if (mountedRef.current) {
            setError(error);
            pollingTimeoutRef.current = setTimeout(
              poll,
              POLLING_INTERVALS.DEFAULT
            );
          }
        }
      };

      poll();
    },
    [dashboards, pollingInterval]
  );

  const stopPolling = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  // 일반 대시보드 목록 조회 (하루 단위)
  const fetchDashboards = useCallback(
    async (date) => {
      try {
        setLoading(true);
        setError(null);
        const response = await DashboardService.getDashboardList(date);

        if (!mountedRef.current) return;

        setDashboards(response.items);
        setLastUpdate(new Date());
        startPolling(date);
      } catch (error) {
        if (mountedRef.current) {
          setError(error);
          message.error('데이터 조회 중 오류가 발생했습니다');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [startPolling]
  );

  // 관리자용 대시보드 목록 조회 (기간 단위)
  const fetchAdminDashboards = useCallback(async (startDate, endDate) => {
    try {
      setLoading(true);
      setError(null);
      const response = await DashboardService.getAdminDashboardList(
        startDate,
        endDate
      );

      if (!mountedRef.current) return;

      setDashboards(response.items);
      setLastUpdate(new Date());
    } catch (error) {
      if (mountedRef.current) {
        setError(error);
        message.error('데이터 조회 중 오류가 발생했습니다');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // 단일 대시보드 업데이트
  const updateDashboard = useCallback((dashboardId, updates) => {
    setDashboards((prev) => {
      const newDashboards = prev.map((dash) =>
        dash.dashboard_id === dashboardId ? { ...dash, ...updates } : dash
      );
      return newDashboards;
    });
    setLastUpdate(new Date());
  }, []);

  // 여러 대시보드 업데이트
  const updateMultipleDashboards = useCallback((dashboardIds, updates) => {
    setDashboards((prev) => {
      const newDashboards = prev.map((dash) =>
        dashboardIds.includes(dash.dashboard_id)
          ? { ...dash, ...updates }
          : dash
      );
      return newDashboards;
    });
    setLastUpdate(new Date());
  }, []);

  // 대시보드 삭제
  const removeDashboards = useCallback((dashboardIds) => {
    setDashboards((prev) =>
      prev.filter((dash) => !dashboardIds.includes(dash.dashboard_id))
    );
    setLastUpdate(new Date());
  }, []);

  // 폴링 설정 업데이트
  const updatePollingSettings = useCallback((newInterval) => {
    setPollingInterval(newInterval);
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const value = {
    dashboards,
    loading,
    error,
    pollingInterval,
    lastUpdate,
    fetchDashboards,
    fetchAdminDashboards,
    updateDashboard,
    updateMultipleDashboards,
    removeDashboards,
    updatePollingSettings,
    startPolling,
    stopPolling,
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

export default DashboardContext;

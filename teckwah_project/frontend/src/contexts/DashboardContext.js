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
import { MessageKeys, MessageTemplates } from '../utils/message';

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
  const [pollingInterval, setPollingInterval] = useState(
    POLLING_INTERVALS.DEFAULT
  );
  const [lastRefresh, setLastRefresh] = useState(null);
  const [availableDateRange, setAvailableDateRange] = useState(null);
  const pollingTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  const fetchDashboards = useCallback(async (date) => {
    const key = MessageKeys.DASHBOARD.LOAD;
    try {
      setLoading(true);
      message.loading('데이터 조회 중...', key);

      const response = await DashboardService.getDashboardList(date);

      if (!mountedRef.current) return;

      setDashboards(response.items);
      setAvailableDateRange(response.date_range);
      setLastRefresh(new Date());

      if (response.items.length === 0) {
        message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
      } else {
        message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
      }

      return response;
    } catch (error) {
      if (mountedRef.current) {
        message.error(MessageTemplates.DATA.LOAD_ERROR, key);
      }
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
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
            setLastRefresh(new Date());
          } else {
            setPollingInterval(POLLING_INTERVALS.IDLE);
          }

          pollingTimeoutRef.current = setTimeout(() => poll(), pollingInterval);
        } catch (error) {
          console.error('Polling error:', error);
          if (mountedRef.current) {
            pollingTimeoutRef.current = setTimeout(
              () => poll(),
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

  const fetchAdminDashboards = useCallback(async (startDate, endDate) => {
    const key = MessageKeys.DASHBOARD.LOAD;
    try {
      setLoading(true);
      message.loading('데이터 조회 중...', key);

      const response = await DashboardService.getAdminDashboardList(
        startDate,
        endDate
      );

      if (!mountedRef.current) return;

      setDashboards(response.items);
      setAvailableDateRange(response.date_range);
      setLastRefresh(new Date());

      if (response.items.length === 0) {
        message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
      } else {
        message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
      }

      return response;
    } catch (error) {
      if (mountedRef.current) {
        message.error(MessageTemplates.DATA.LOAD_ERROR, key);
      }
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const updateDashboard = useCallback((dashboardId, updates) => {
    setDashboards((prev) => {
      const newDashboards = prev.map((dash) =>
        dash.dashboard_id === dashboardId ? { ...dash, ...updates } : dash
      );
      return newDashboards;
    });
    setLastRefresh(new Date());
  }, []);

  const updateMultipleDashboards = useCallback((dashboardIds, updates) => {
    setDashboards((prev) => {
      const newDashboards = prev.map((dash) =>
        dashboardIds.includes(dash.dashboard_id)
          ? { ...dash, ...updates }
          : dash
      );
      return newDashboards;
    });
    setLastRefresh(new Date());
  }, []);

  const removeDashboards = useCallback((dashboardIds) => {
    setDashboards((prev) =>
      prev.filter((dash) => !dashboardIds.includes(dash.dashboard_id))
    );
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const value = {
    dashboards,
    loading,
    pollingInterval,
    lastRefresh,
    availableDateRange,
    fetchDashboards,
    fetchAdminDashboards,
    updateDashboard,
    updateMultipleDashboards,
    removeDashboards,
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

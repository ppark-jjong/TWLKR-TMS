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

<<<<<<< HEAD
  // 일반 대시보드 목록 조회 (하루 단위)
  const fetchDashboards = useCallback(
    async (date) => {
      try {
        setLoading(true);
        const response = await DashboardService.getDashboardList(date);
        console.log('fetchDashboards 결과:', response);

        // response 객체의 구조 확인 및 설정
        const items = response?.items || [];
        setDashboards(items);

        // 데이터 변경 여부에 따른 폴링 간격 조정
        if (JSON.stringify(items) !== JSON.stringify(dashboards)) {
          setPollingInterval(15000); // 변경사항 있으면 15초
        } else {
          setPollingInterval(45000); // 변경사항 없으면 45초
        }
      } catch (error) {
        console.error('대시보드 목록 조회 오류:', error);
        message.error('데이터 조회 중 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    },
    [dashboards]
  );
=======
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);
>>>>>>> main

  const fetchDashboards = useCallback(async (date) => {
    const key = MessageKeys.DASHBOARD.LOAD;
    try {
      setLoading(true);
<<<<<<< HEAD
      const response = await DashboardService.getAdminDashboardList(
        startDate,
        endDate
      );
      console.log('fetchAdminDashboards 결과:', response);

      // response 객체의 구조 확인 및 설정
      const items = response?.items || [];
      setDashboards(items);
    } catch (error) {
      console.error('관리자 대시보드 목록 조회 오류:', error);
      message.error('데이터 조회 중 오류가 발생했습니다');
=======
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
>>>>>>> main
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
<<<<<<< HEAD
    setDashboards((prev) =>
      prev.map((dash) =>
        dash.dashboard_id === dashboardId ? { ...dash, ...updates } : dash
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

    setDashboards(newDashboards);
=======
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
>>>>>>> main
  }, []);

  const removeDashboards = useCallback((dashboardIds) => {
    setDashboards((prev) =>
      prev.filter((dash) => !dashboardIds.includes(dash.dashboard_id))
    );
<<<<<<< HEAD
=======
    setLastRefresh(new Date());
>>>>>>> main
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
<<<<<<< HEAD
=======
    startPolling,
    stopPolling,
>>>>>>> main
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
<<<<<<< HEAD
=======

export default DashboardContext;
>>>>>>> main

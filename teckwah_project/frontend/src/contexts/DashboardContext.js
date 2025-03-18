// src/contexts/DashboardContext.js
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import DashboardService from '../services/DashboardService';
import { useAuth } from './AuthContext';
import message, { MessageKeys, MessageTemplates } from '../utils/message';
import ErrorHandler from '../utils/ErrorHandler';
import { useLogger } from '../utils/LogUtils';
import TokenManager from '../utils/TokenManager';

/**
 * 대시보드 컨텍스트
 * 대시보드 데이터 관리 및 상태 공유를 위한 컨텍스트
 */
const DashboardContext = createContext(null);

/**
 * 대시보드 컨텍스트 프로바이더 컴포넌트
 * 대시보드 관련 상태와 함수를 제공
 */
export const DashboardProvider = ({ children }) => {
  const logger = useLogger('DashboardContext');
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();

  // 대시보드 상태 관리
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [availableDateRange, setAvailableDateRange] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [searchMode, setSearchMode] = useState(false);
  const [error, setError] = useState(null);

  // 요청 상태 추적을 위한 ref
  const requestInProgressRef = useRef(false);
  const searchRequestInProgressRef = useRef(false);
  const filterTriggerRef = useRef(false);

  // 낙관적 락을 위한 버전 관리
  const versionsMapRef = useRef(new Map());

  /**
   * 대시보드 데이터 조회
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   * @param {boolean} forceRefresh - 강제 새로고침 여부
   * @returns {Promise<Object>} - 조회 결과
   */
  const fetchDashboards = useCallback(
    async (startDate, endDate, forceRefresh = false) => {
      // 요청 중복 방지 체크
      if (requestInProgressRef.current && !forceRefresh) {
        logger.info(
          '이미 데이터 요청이 진행 중입니다. 중복 요청을 방지합니다.'
        );
        return { items: dashboards, date_range: availableDateRange };
      }

      // 이미 검색 모드인 경우와 강제 새로고침이 아닌 경우 데이터 재요청 방지
      if (searchMode && !forceRefresh && dashboards.length > 0) {
        logger.info('검색 모드에서는 데이터를 재요청하지 않습니다.');
        return { items: dashboards, date_range: availableDateRange };
      }

      try {
        // 요청 시작 표시
        requestInProgressRef.current = true;
        setLoading(true);
        setError(null);

        logger.info(
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
        logger.debug('fetchDashboards 결과:', response);

        // 항목과 날짜 범위 정보 처리
        const items = response.items || [];
        const dateRangeInfo = response.date_range || null;

        // 버전 정보 저장 (낙관적 락)
        if (items.length > 0) {
          const newVersionsMap = new Map();
          items.forEach((item) => {
            if (item.dashboard_id && item.version) {
              newVersionsMap.set(item.dashboard_id, item.version);
            }
          });
          versionsMapRef.current = newVersionsMap;
          logger.debug(
            '버전 정보 업데이트:',
            Object.fromEntries(newVersionsMap)
          );
        }

        // 검색 모드가 아니거나 강제 새로고침인 경우에만 데이터 업데이트
        if (!searchMode || forceRefresh) {
          setDashboards(items);
          setDateRange([startDate, endDate]);
          setLastUpdate(Date.now());

          // 날짜 범위 정보가 있으면 상태 업데이트
          if (dateRangeInfo) {
            setAvailableDateRange(dateRangeInfo);
          }
        }

        // 필터링 트리거 초기화
        filterTriggerRef.current = false;

        return response;
      } catch (error) {
        logger.error('대시보드 목록 조회 오류:', error.response?.data || error);
        setError(
          ErrorHandler.handle(error, 'dashboard-fetch').message ||
            '데이터 조회 중 오류가 발생했습니다'
        );

        // 인증 오류인 경우 로그인 페이지로 리디렉션
        if (ErrorHandler.isAuthenticationError(error)) {
          message.error(
            '인증이 만료되었습니다. 다시 로그인해주세요.',
            MessageKeys.AUTH.SESSION_EXPIRED
          );
          TokenManager.clearTokens();
          navigate('/login', { replace: true });
        }

        return { items: [], date_range: null };
      } finally {
        // 요청 완료 표시
        requestInProgressRef.current = false;
        setLoading(false);
      }
    },
    [dashboards, searchMode, availableDateRange, logger, navigate]
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
        logger.info('이미 검색 요청이 진행 중입니다. 중복 요청을 방지합니다.');
        return { items: dashboards };
      }

      // 검색어가 없으면 검색 모드 초기화
      if (!orderNo || !orderNo.trim()) {
        if (searchMode) {
          resetSearchMode();
        }
        return { items: dashboards };
      }

      try {
        // 검색 요청 시작 표시
        searchRequestInProgressRef.current = true;
        setLoading(true);
        setSearchMode(true);
        setError(null);

        logger.info('주문번호 검색 요청:', orderNo);

        const searchResults = await DashboardService.searchDashboardsByOrderNo(
          orderNo
        );

        // 버전 정보 저장 (낙관적 락)
        if (
          searchResults &&
          searchResults.items &&
          searchResults.items.length > 0
        ) {
          const searchVersionsMap = new Map(versionsMapRef.current);
          searchResults.items.forEach((item) => {
            if (item.dashboard_id && item.version) {
              searchVersionsMap.set(item.dashboard_id, item.version);
            }
          });
          versionsMapRef.current = searchVersionsMap;
        }

        const sortedResults = searchResults.items || [];
        setDashboards(sortedResults);
        setLastUpdate(Date.now());

        return { items: sortedResults };
      } catch (error) {
        logger.error('주문번호 검색 실패:', error);
        setError(
          ErrorHandler.handle(error, 'dashboard-search').message ||
            '검색 중 오류가 발생했습니다'
        );
        return { items: [] };
      } finally {
        // 검색 요청 완료 표시
        searchRequestInProgressRef.current = false;
        setLoading(false);
      }
    },
    [dashboards, searchMode, resetSearchMode, logger]
  );

  /**
   * 검색 모드 초기화 (날짜 기준 데이터로 복귀)
   */
  const resetSearchMode = useCallback(() => {
    // 이미 요청 중인 경우 중복 요청 방지
    if (requestInProgressRef.current) {
      logger.info('이미 요청이 진행 중입니다. 초기화 요청을 무시합니다.');
      return;
    }

    setSearchMode(false);
    if (dateRange && dateRange[0] && dateRange[1]) {
      // 필터링 트리거 설정
      filterTriggerRef.current = true;
      fetchDashboards(dateRange[0], dateRange[1], true);
    }
  }, [dateRange, fetchDashboards, logger]);

  /**
   * 대시보드 상태 변경
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} status - 변경할 상태
   * @returns {Promise<Object>} - 업데이트된 대시보드
   */
  const updateStatus = useCallback(
    async (dashboardId, status) => {
      try {
        logger.info(`상태 변경 요청: id=${dashboardId}, status=${status}`);

        // 버전 정보 가져오기 (낙관적 락)
        const clientVersion = versionsMapRef.current.get(dashboardId);

        // 관리자 여부에 따라 다른 API 호출
        const updatedDashboard = await DashboardService.updateStatus(
          dashboardId,
          status,
          isAdmin,
          clientVersion
        );

        // 성공 시 로컬 데이터와 버전 업데이트
        if (updatedDashboard) {
          // 버전 정보 업데이트
          if (updatedDashboard.version) {
            versionsMapRef.current.set(dashboardId, updatedDashboard.version);
          }

          // 대시보드 배열 업데이트
          updateDashboard(dashboardId, updatedDashboard);

          message.success(
            `${MessageTemplates.DASHBOARD.STATUS_SUCCESS(status)}`
          );
          return updatedDashboard;
        }

        return null;
      } catch (error) {
        logger.error('상태 변경 실패:', error);

        // 낙관적 락 충돌 처리
        if (ErrorHandler.isOptimisticLockError(error)) {
          const latestData = error.response?.data?.data;
          const currentVersion =
            error.response?.data?.version_info?.current_version;

          if (latestData && currentVersion) {
            // 버전 정보 업데이트
            versionsMapRef.current.set(dashboardId, currentVersion);

            // 대시보드 업데이트
            updateDashboard(dashboardId, latestData);

            message.warning(
              '다른 사용자가 이미 이 항목을 수정했습니다. 최신 정보로 갱신되었습니다.'
            );
            return latestData;
          }
        }

        ErrorHandler.handle(error, 'status-update');
        return null;
      }
    },
    [isAdmin, logger, updateDashboard]
  );

  /**
   * 배차 처리 함수
   * @param {Object} driverData - 배차 정보 (dashboard_ids, driver_name, driver_contact)
   * @returns {Promise<Array>} - 업데이트된 대시보드 배열
   */
  const assignDriver = useCallback(
    async (driverData) => {
      try {
        logger.info('배차 요청:', driverData);

        // 낙관적 락 버전 정보 추가
        const clientVersions = {};
        driverData.dashboard_ids.forEach((id) => {
          const version = versionsMapRef.current.get(id);
          if (version) {
            clientVersions[id] = version;
          }
        });

        // 버전 정보를 요청에 포함
        const requestData = {
          ...driverData,
          client_versions: clientVersions,
        };

        // 배차 처리 API 호출
        const updatedDashboards = await DashboardService.assignDriver(
          requestData
        );

        if (updatedDashboards && updatedDashboards.length > 0) {
          // 버전 정보 업데이트
          updatedDashboards.forEach((dashboard) => {
            if (dashboard.dashboard_id && dashboard.version) {
              versionsMapRef.current.set(
                dashboard.dashboard_id,
                dashboard.version
              );
            }
          });

          // 대시보드 목록 일괄 업데이트
          updateMultipleDashboards(updatedDashboards);

          message.success(MessageTemplates.DASHBOARD.ASSIGN_SUCCESS);
          return updatedDashboards;
        }

        return [];
      } catch (error) {
        logger.error('배차 처리 실패:', error);

        // 낙관적 락 충돌 처리
        if (ErrorHandler.isOptimisticLockError(error)) {
          const conflictedOrders = error.conflictedOrders || [];

          if (conflictedOrders.length > 0) {
            message.error(
              `다음 주문(${conflictedOrders.join(
                ', '
              )})이 이미 다른 사용자에 의해 수정되었습니다.`
            );
          } else {
            message.error('다른 사용자가 이미 이 항목을 수정했습니다.');
          }

          // 데이터 새로고침 필요
          if (dateRange && dateRange[0] && dateRange[1]) {
            fetchDashboards(dateRange[0], dateRange[1], true);
          }
        }
        // 비관적 락 충돌 처리
        else if (ErrorHandler.isPessimisticLockError(error)) {
          const lockedBy =
            error.response?.data?.error?.detail?.locked_by || '다른 사용자';
          message.error(
            `현재 ${lockedBy}님이 편집 중입니다. 잠시 후 다시 시도해주세요.`
          );
        } else {
          ErrorHandler.handle(error, 'assign-driver');
        }

        return [];
      }
    },
    [dateRange, fetchDashboards, logger, updateMultipleDashboards]
  );

  /**
   * 단일 대시보드 업데이트 (낙관적 락 고려)
   * @param {number|string} dashboardId - 대시보드 ID
   * @param {Object} updates - 업데이트할 필드 및 값
   */
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

    // 버전 정보 업데이트
    if (updates.version) {
      versionsMapRef.current.set(dashboardId, updates.version);
    }
  }, []);

  /**
   * 여러 대시보드 업데이트 (새로운 항목 추가 로직 포함)
   * @param {Array} newDashboards - 새로운 대시보드 배열
   */
  const updateMultipleDashboards = useCallback(
    (newDashboards) => {
      logger.debug('updateMultipleDashboards 호출됨:', newDashboards);

      if (!Array.isArray(newDashboards)) {
        logger.error(
          'updateMultipleDashboards: newDashboards는 배열이어야 합니다',
          newDashboards
        );
        return;
      }

      // 현재 대시보드 맵 생성 (ID 기준)
      const currentDashboardsMap = new Map(
        dashboards.map((d) => [d.dashboard_id, d])
      );

      // 새 대시보드 적용
      newDashboards.forEach((newDash) => {
        if (newDash.dashboard_id) {
          currentDashboardsMap.set(newDash.dashboard_id, {
            ...currentDashboardsMap.get(newDash.dashboard_id),
            ...newDash,
          });

          // 버전 정보 업데이트
          if (newDash.version) {
            versionsMapRef.current.set(newDash.dashboard_id, newDash.version);
          }
        }
      });

      // 맵에서 배열로 변환
      const mergedDashboards = Array.from(currentDashboardsMap.values());

      // 정렬 적용
      const sortedDashboards =
        DashboardService.sortDashboardsByStatus(mergedDashboards);

      // 데이터가 있을 경우에만 상태 업데이트
      if (sortedDashboards.length > 0) {
        setDashboards(sortedDashboards);
        setLastUpdate(Date.now());
      } else if (newDashboards.length === 0) {
        // 명시적으로 빈 배열을 설정한 경우 (검색 결과 없음 등)
        setDashboards([]);
      }
    },
    [dashboards, logger]
  );

  /**
   * 대시보드 삭제 (관리자 전용)
   * @param {Array} dashboardIds - 삭제할 대시보드 ID 배열
   * @returns {Promise<boolean>} - 삭제 성공 여부
   */
  const removeDashboards = useCallback(
    async (dashboardIds) => {
      if (!isAdmin) {
        message.error('관리자 권한이 필요합니다');
        return false;
      }

      if (!Array.isArray(dashboardIds)) {
        logger.error(
          'removeDashboards: dashboardIds는 배열이어야 합니다',
          dashboardIds
        );
        return false;
      }

      try {
        logger.info('대시보드 삭제 요청:', dashboardIds);

        // API 호출
        const success = await DashboardService.deleteDashboards(dashboardIds);

        if (success) {
          // 로컬 상태 업데이트
          setDashboards((prev) =>
            prev.filter((dash) => !dashboardIds.includes(dash.dashboard_id))
          );

          // 버전 정보 삭제
          dashboardIds.forEach((id) => {
            versionsMapRef.current.delete(id);
          });

          message.success(MessageTemplates.DASHBOARD.DELETE_SUCCESS);
          return true;
        }

        return false;
      } catch (error) {
        logger.error('대시보드 삭제 실패:', error);
        ErrorHandler.handle(error, 'dashboard-delete');
        return false;
      }
    },
    [isAdmin, logger]
  );

  /**
   * 현재 날짜를 기준으로 과거 N일 범위 설정
   * @param {number} days - 과거 일수
   */
  const setDefaultDateRange = useCallback((days = 7) => {
    const endDate = dayjs();
    const startDate = endDate.subtract(days, 'day');
    setDateRange([startDate, endDate]);
  }, []);

  /**
   * 대시보드 생성
   * @param {Object} dashboardData - 대시보드 데이터
   * @returns {Promise<Object>} - 생성된 대시보드
   */
  const createDashboard = useCallback(
    async (dashboardData) => {
      try {
        logger.info('대시보드 생성 요청:', dashboardData);

        const result = await DashboardService.createDashboard(dashboardData);

        if (result) {
          // 버전 정보 저장
          if (result.dashboard_id && result.version) {
            versionsMapRef.current.set(result.dashboard_id, result.version);
          }

          // 대시보드 목록 업데이트
          setDashboards((prev) => [result, ...prev]);

          message.success(MessageTemplates.DASHBOARD.CREATE_SUCCESS);
          return result;
        }

        return null;
      } catch (error) {
        logger.error('대시보드 생성 실패:', error);
        ErrorHandler.handle(error, 'dashboard-create');
        return null;
      }
    },
    [logger]
  );

  /**
   * 특정 dashboard_id의 현재 버전 조회
   * @param {number|string} dashboardId - 대시보드 ID
   * @returns {number|null} - 버전 정보
   */
  const getDashboardVersion = useCallback((dashboardId) => {
    return versionsMapRef.current.get(dashboardId) || null;
  }, []);

  // 인증 상태 변경 감지
  useEffect(() => {
    if (!isAuthenticated) {
      // 인증 해제 시 데이터 초기화
      setDashboards([]);
      setDateRange(null);
      versionsMapRef.current.clear();
    }
  }, [isAuthenticated]);

  // 컨텍스트에 제공할 값
  const value = {
    // 상태
    dashboards,
    loading,
    dateRange,
    lastUpdate,
    searchMode,
    availableDateRange,
    error,
    isAdmin,

    // 함수
    setAvailableDateRange,
    fetchDashboards,
    searchByOrderNo,
    resetSearchMode,
    updateDashboard,
    updateMultipleDashboards,
    removeDashboards,
    updateStatus,
    assignDriver,
    createDashboard,
    setDefaultDateRange,
    getDashboardVersion,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

/**
 * 대시보드 컨텍스트 사용을 위한 커스텀 훅
 * @returns {Object} - 대시보드 관련 상태 및 함수
 */
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export default DashboardContext;

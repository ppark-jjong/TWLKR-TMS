// src/hooks/useAdminData.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { Form, message } from 'antd';
import dayjs from 'dayjs';
import DashboardService from '../services/DashboardService';
import { useLogger } from '../utils/LogUtils';
import { MessageKeys } from '../utils/message';

/**
 * 관리자 데이터 관리를 위한 커스텀 훅
 * 상태 관리, 데이터 로드, 업데이트 기능을 제공
 * @returns {Object} 관리자 데이터 상태 및 핸들러 함수
 */
const useAdminData = () => {
  const logger = useLogger('useAdminData');

  // 상태 관리
  const [activeTab, setActiveTab] = useState('users');
  const [userList, setUserList] = useState([]);
  const [systemSettings, setSystemSettings] = useState({});
  const [dataStats, setDataStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [dataRange, setDataRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm] = Form.useForm();

  // 중복 요청 방지를 위한 플래그
  const isLoadingRef = useRef(false);

  /**
   * 목 데이터 로드 함수
   * 실제 구현에서는 API 호출로 대체됨
   */
  const loadData = useCallback(() => {
    if (isLoadingRef.current) {
      logger.info('이미 데이터를 로드 중입니다.');
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);

    // 데이터 로딩 시뮬레이션
    setTimeout(() => {
      try {
        // Mock 사용자 데이터
        const mockUsers = [
          {
            id: 1,
            user_id: 'admin1',
            user_role: 'ADMIN',
            user_department: 'CS',
            created_at: '2025-01-15T09:00:00',
          },
          {
            id: 2,
            user_id: 'user1',
            user_role: 'USER',
            user_department: 'HES',
            created_at: '2025-01-20T10:30:00',
          },
          {
            id: 3,
            user_id: 'user2',
            user_role: 'USER',
            user_department: 'LENOVO',
            created_at: '2025-02-05T14:45:00',
          },
        ];

        // Mock 시스템 설정
        const mockSettings = {
          api_timeout: 30000,
          refresh_interval: 60000,
          default_date_range: 30,
          lock_mechanism: 'pessimistic',
          allow_concurrent_edits: false,
        };

        // Mock 데이터 통계
        const mockStats = {
          total_orders: 2854,
          completed_orders: 1852,
          issues_count: 124,
          average_completion_time: 35.8,
          peak_hours: [14, 15, 16],
        };

        setUserList(mockUsers);
        setSystemSettings(mockSettings);
        setDataStats(mockStats);
        logger.info('관리자 데이터 로드 완료');
      } catch (error) {
        logger.error('데이터 로드 실패:', error);
        message.error('데이터 로드 중 오류가 발생했습니다');
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }, 800);
  }, [logger]);

  /**
   * 탭 변경 핸들러
   * @param {string} key - 선택된 탭 키
   */
  const handleTabChange = useCallback(
    (key) => {
      setActiveTab(key);
      logger.debug('탭 변경:', key);
    },
    [logger]
  );

  /**
   * 새로고침 핸들러
   */
  const handleRefresh = useCallback(() => {
    logger.info('관리자 데이터 새로고침');
    loadData();
  }, [loadData, logger]);

  /**
   * 사용자 저장 핸들러
   * @param {Object} values - 폼 데이터 값
   * @returns {Promise<Object>} - 처리 결과
   */
  const handleUserSave = useCallback(
    async (values) => {
      try {
        // 저장 처리 (실제로는 API 호출)
        logger.info(`사용자 ${editingUser ? '수정' : '추가'}:`, values);

        // Mock API 응답 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (editingUser) {
          // 기존 사용자 수정
          setUserList((prevUsers) =>
            prevUsers.map((u) =>
              u.id === editingUser.id ? { ...u, ...values } : u
            )
          );
          message.success(`사용자 ${values.user_id} 정보가 수정되었습니다`);
        } else {
          // 새 사용자 추가
          const newUser = {
            id: Math.max(...userList.map((u) => u.id), 0) + 1,
            ...values,
            created_at: new Date().toISOString(),
          };
          setUserList((prev) => [...prev, newUser]);
          message.success(`사용자 ${values.user_id}가 추가되었습니다`);
        }

        setShowUserModal(false);
        setEditingUser(null);
        return true;
      } catch (error) {
        logger.error('사용자 저장 오류:', error);
        message.error('사용자 정보 저장 중 오류가 발생했습니다');
        return false;
      }
    },
    [editingUser, userList, logger]
  );

  /**
   * 사용자 삭제 핸들러
   * @param {number} userId - 삭제할 사용자 ID
   * @returns {Promise<boolean>} - 삭제 결과
   */
  const handleUserDelete = useCallback(
    async (userId) => {
      try {
        logger.info('사용자 삭제 요청:', userId);

        // Mock API 호출 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 500));

        setUserList((prev) => prev.filter((u) => u.id !== userId));
        message.success('사용자가 삭제되었습니다');
        return true;
      } catch (error) {
        logger.error('사용자 삭제 오류:', error);
        message.error('사용자 삭제 중 오류가 발생했습니다');
        return false;
      }
    },
    [logger]
  );

  /**
   * 시스템 설정 저장 핸들러
   * @param {Object} values - 폼 데이터 값
   * @returns {Promise<boolean>} - 저장 결과
   */
  const handleSettingsSave = useCallback(
    async (values) => {
      try {
        logger.info('시스템 설정 저장:', values);

        // Mock API 호출 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 500));

        setSystemSettings(values);
        message.success('시스템 설정이 저장되었습니다');
        return true;
      } catch (error) {
        logger.error('설정 저장 오류:', error);
        message.error('설정 저장 중 오류가 발생했습니다');
        return false;
      }
    },
    [logger]
  );

  /**
   * 데이터 내보내기 핸들러
   * @returns {Promise<boolean>} - 내보내기 결과
   */
  const handleDataExport = useCallback(async () => {
    try {
      if (!dataRange || dataRange.length !== 2) {
        message.warning('유효한 날짜 범위를 선택해주세요');
        return false;
      }

      logger.info('데이터 내보내기 요청:', {
        startDate: dataRange[0].format('YYYY-MM-DD'),
        endDate: dataRange[1].format('YYYY-MM-DD'),
      });

      // 실제 구현에서는 백엔드 API를 호출하여 CSV 파일 다운로드
      message.loading('데이터 추출 중...', 1.5);

      // Mock API 호출 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 1500));

      message.success('데이터 내보내기가 완료되었습니다');
      return true;
    } catch (error) {
      logger.error('데이터 내보내기 오류:', error);
      message.error('데이터 내보내기 중 오류가 발생했습니다');
      return false;
    }
  }, [dataRange, logger]);

  /**
   * 데이터 정리 핸들러
   * @param {number|string} period - 정리할 기간(일) 또는 특정 상태('cancel')
   * @returns {Promise<boolean>} - 정리 결과
   */
  const handleDataCleanup = useCallback(
    async (period) => {
      try {
        if (typeof period === 'number') {
          logger.info(`${period}일 이상 된 데이터 정리 요청`);
        } else {
          logger.info(`${period} 상태 데이터 정리 요청`);
        }

        // Mock API 호출 시뮬레이션
        message.loading('데이터 정리 중...', 2);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (typeof period === 'number') {
          message.success(`${period}일 이상 된 데이터 정리가 완료되었습니다`);

          // 통계 데이터 업데이트 (시뮬레이션)
          setDataStats((prev) => ({
            ...prev,
            total_orders: Math.floor(prev.total_orders * 0.8), // 샘플 감소
            completed_orders: Math.floor(prev.completed_orders * 0.7),
          }));
        } else {
          message.success(`${period} 상태 데이터 정리가 완료되었습니다`);
        }

        return true;
      } catch (error) {
        logger.error('데이터 정리 오류:', error);
        message.error('데이터 정리 중 오류가 발생했습니다');
        return false;
      }
    },
    [logger]
  );

  /**
   * 날짜 범위 변경 핸들러
   * @param {Array<dayjs>} dates - 선택된 날짜 범위 배열
   */
  const handleDateRangeChange = useCallback((dates) => {
    if (dates && dates.length === 2) {
      setDataRange(dates);
    }
  }, []);

  return {
    // 상태
    activeTab,
    userList,
    systemSettings,
    dataStats,
    loading,
    dataRange,
    showUserModal,
    editingUser,
    userForm,

    // 액션 함수
    handleTabChange,
    handleRefresh,
    loadData,
    setShowUserModal,
    handleUserSave,
    handleUserDelete,
    handleSettingsSave,
    handleDataExport,
    handleDataCleanup,
    handleDateRangeChange,
  };
};

export default useAdminData;

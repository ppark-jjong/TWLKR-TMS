// src/hooks/useDashboardDetail.js
import { useState, useCallback, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import DashboardService from '../services/DashboardService';
import { useLogger } from '../utils/LogUtils';
import MessageService from '../utils/MessageService';
import { MessageKeys } from '../utils/Constants';
import { getLockTypeText } from '../utils/Formatter';

/**
 * 대시보드 상세 정보 관리 훅 (최적화 버전)
 * 락 관리, 상태 변경, 필드 업데이트, 메모 관리 등 통합
 *
 * @param {Object} options - 훅 옵션
 * @param {number|string} options.dashboardId - 대시보드 ID
 * @param {Function} options.onSuccess - 성공 콜백
 * @param {Function} options.onError - 에러 콜백
 * @returns {Object} - 상태 및 함수
 */
const useDashboardDetail = (options = {}) => {
  const { dashboardId, onSuccess, onError } = options;
  const logger = useLogger('useDashboardDetail');

  // 기본 상태
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 락 관련 상태
  const [lockLoading, setLockLoading] = useState(false);
  const [lockInfo, setLockInfo] = useState(null);

  // 메모 상태
  const [remarkContent, setRemarkContent] = useState('');

  // 편집 모드 상태
  const [editMode, setEditMode] = useState({
    fields: false,
    remark: false,
  });

  // 타이머 레퍼런스
  const lockExpiryTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const isLoadingRef = useRef(false);

  /**
   * 락 만료 경고 표시
   */
  const showLockExpiryWarning = useCallback(() => {
    MessageService.warning(
      '편집 세션이 곧 만료됩니다. 작업을 완료하거나 저장하세요.',
      MessageKeys.DASHBOARD.LOCK_WARNING
    );
  }, []);

  /**
   * 락 만료 처리
   */
  const handleLockExpiry = useCallback(() => {
    setEditMode({ fields: false, remark: false });
    setLockInfo(null);
    MessageService.error(
      '편집 세션이 만료되었습니다. 편집 모드를 다시 활성화해야 합니다.',
      MessageKeys.DASHBOARD.LOCK_EXPIRED
    );
  }, []);

  /**
   * 락 타이머 설정
   * @param {Object} lockData - 락 정보
   */
  const setupLockTimer = useCallback(
    (lockData) => {
      // 기존 타이머 정리
      clearTimeout(lockExpiryTimerRef.current);
      clearTimeout(warningTimerRef.current);

      if (!lockData || !lockData.expires_at) return;

      // 타이머 설정 성능 개선
      const expiryTime = new Date(lockData.expires_at).getTime();
      const now = Date.now();
      const timeRemaining = expiryTime - now;

      if (timeRemaining <= 0) return;

      // 만료 1분 전 경고
      const warningTime = Math.max(0, timeRemaining - 60000);
      if (warningTime > 0) {
        warningTimerRef.current = setTimeout(
          showLockExpiryWarning,
          warningTime
        );
      }

      // 실제 만료 처리
      lockExpiryTimerRef.current = setTimeout(handleLockExpiry, timeRemaining);

      logger.debug(
        `락 타이머 설정: 만료까지 ${Math.round(timeRemaining / 1000)}초`
      );
    },
    [showLockExpiryWarning, handleLockExpiry, logger]
  );

  /**
   * 대시보드 상세 정보 조회
   * @returns {Promise<Object>} 대시보드 상세 정보
   */
  const fetchDashboardDetail = useCallback(async () => {
    if (!dashboardId || isLoadingRef.current) return null;

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      logger.info(`대시보드 상세 정보 조회: id=${dashboardId}`);

      // 성능 최적화 - 중복 요청 방지
      const cacheKey = `dashboard_detail_${dashboardId}`;
      const cachedData = sessionStorage.getItem(cacheKey);

      // 캐시된 데이터가 있으면 우선 표시 (Stale-While-Revalidate 패턴)
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          setDashboard(parsedData);

          // 메모 내용 설정
          if (parsedData.remarks && parsedData.remarks.length > 0) {
            setRemarkContent(parsedData.remarks[0].content || '');
          }
        } catch (err) {
          // 캐시 파싱 오류 무시
          logger.warn('캐시 데이터 파싱 오류:', err);
        }
      }

      // API 호출로 최신 데이터 가져오기
      const data = await DashboardService.getDashboardDetail(dashboardId);

      if (data) {
        // 세션 스토리지에 캐싱 (10분 만료)
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
        sessionStorage.setItem(
          `${cacheKey}_timestamp`,
          Date.now() + 10 * 60 * 1000
        );

        setDashboard(data);

        // 메모 내용 설정 (첫 번째 메모만 사용)
        if (data.remarks && data.remarks.length > 0) {
          setRemarkContent(data.remarks[0].content || '');
        } else {
          setRemarkContent('');
        }
      }

      // 락 상태 조회
      checkLockStatus();

      return data;
    } catch (err) {
      logger.error('대시보드 상세 정보 조회 실패:', err);
      setError('상세 정보를 조회하는 중 오류가 발생했습니다');
      if (onError) onError(err);
      return null;
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [dashboardId, checkLockStatus, onError, logger]);

  /**
   * 락 상태 확인 (성능 최적화)
   * @returns {Promise<Object>} 락 상태 정보
   */
  const checkLockStatus = useCallback(async () => {
    if (!dashboardId) return null;

    try {
      setLockLoading(true);

      // 캐시된 락 정보 확인
      const cacheKey = `lock_status_${dashboardId}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);

      // 캐시가 10초 내에 저장된 것이면 재사용
      if (
        cachedData &&
        cacheTimestamp &&
        Date.now() - parseInt(cacheTimestamp) < 10000
      ) {
        try {
          const parsedLockStatus = JSON.parse(cachedData);
          // 만료 시간 남아있는지 확인
          if (parsedLockStatus.is_locked && parsedLockStatus.expires_at) {
            const expiryTime = new Date(parsedLockStatus.expires_at).getTime();
            if (expiryTime > Date.now()) {
              setLockInfo(parsedLockStatus);
              setupLockTimer(parsedLockStatus);
              return parsedLockStatus;
            }
          }
        } catch (err) {
          // 캐시 파싱 오류 무시
          logger.warn('락 캐시 파싱 오류:', err);
        }
      }

      // API로 락 상태 확인
      const lockStatus = await DashboardService.checkLockStatus(dashboardId);

      // 캐시 저장
      sessionStorage.setItem(cacheKey, JSON.stringify(lockStatus || {}));
      sessionStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());

      if (lockStatus && lockStatus.is_locked) {
        setLockInfo(lockStatus);
        setupLockTimer(lockStatus);
        return lockStatus;
      } else {
        setLockInfo(null);
        return null;
      }
    } catch (err) {
      logger.error('락 상태 확인 실패:', err);
      return null;
    } finally {
      setLockLoading(false);
    }
  }, [dashboardId, setupLockTimer, logger]);

  /**
   * 락 획득 함수 (공통화)
   * @param {string} lockType - 락 타입 (EDIT, REMARK 등)
   * @returns {Promise<Object|null>} 락 정보 또는 null
   */
  const acquireLock = useCallback(
    async (lockType) => {
      if (!dashboardId) return null;

      try {
        setLockLoading(true);
        setError(null);

        // 기존 다른 편집 모드가 활성화되어 있으면 획득 불가
        if (editMode.fields || editMode.remark) {
          MessageService.warning('이미 편집 모드가 활성화되어 있습니다');
          return null;
        }

        // 락 획득 요청 및 재시도 로직
        const maxRetries = 2;
        let retryCount = 0;
        let lock = null;

        while (retryCount <= maxRetries) {
          try {
            logger.info(
              `락 획득 요청(${retryCount}): id=${dashboardId}, type=${lockType}`
            );
            lock = await DashboardService.acquireLock(dashboardId, lockType);
            break; // 성공하면 루프 종료
          } catch (err) {
            // 이미 다른 사람이 락을 가지고 있는 경우
            if (err.response?.status === 423) {
              throw err; // 락 충돌은 재시도 하지 않고 바로 오류 처리
            }

            // 일시적 오류는 재시도
            if (retryCount < maxRetries) {
              retryCount++;
              // 지수 백오프 - 재시도 간격을 증가시킴
              await new Promise((resolve) =>
                setTimeout(resolve, 500 * Math.pow(2, retryCount))
              );
            } else {
              throw err; // 모든 재시도 실패 시 오류 전파
            }
          }
        }

        if (lock) {
          setLockInfo(lock);
          // 락 타이머 설정
          setupLockTimer(lock);
          logger.debug('락 획득 성공', lock);
          return lock;
        }

        return null;
      } catch (err) {
        logger.error('락 획득 실패:', err);
        setError('편집 모드를 활성화하는 중 오류가 발생했습니다');

        // 다른 사용자가 이미 락을 보유하고 있는 경우 (423 Locked)
        if (err.response?.status === 423) {
          const lockedBy =
            err.response?.data?.error?.detail?.locked_by || '다른 사용자';
          MessageService.warning(
            `현재 ${lockedBy}님이 편집 중입니다. 잠시 후 다시 시도해주세요.`,
            MessageKeys.DASHBOARD.PESSIMISTIC_LOCK
          );
          return null;
        }

        MessageService.error('편집 모드를 활성화할 수 없습니다');
        return null;
      } finally {
        setLockLoading(false);
      }
    },
    [dashboardId, editMode, setupLockTimer, logger]
  );

  /**
   * 필드 편집 시작
   */
  const startFieldsEdit = useCallback(async () => {
    const lock = await acquireLock('EDIT');
    if (lock) {
      setEditMode({ ...editMode, fields: true });
      MessageService.success('편집 모드가 활성화되었습니다');
    }
  }, [acquireLock, editMode]);

  /**
   * 메모 편집 시작
   */
  const startRemarkEdit = useCallback(async () => {
    const lock = await acquireLock('REMARK');
    if (lock) {
      setEditMode({ ...editMode, remark: true });
      MessageService.success('메모 편집 모드가 활성화되었습니다');
    }
  }, [acquireLock, editMode]);

  /**
   * 락 해제
   * @returns {Promise<boolean>} 해제 성공 여부
   */
  const releaseLock = useCallback(async () => {
    if (!dashboardId || (!editMode.fields && !editMode.remark)) return false;

    try {
      // 타이머 정리
      clearTimeout(lockExpiryTimerRef.current);
      clearTimeout(warningTimerRef.current);

      // 락 해제 요청
      logger.info(`락 해제 요청: id=${dashboardId}`);
      await DashboardService.releaseLock(dashboardId);
      setLockInfo(null);
      logger.debug('락 해제 성공');

      // 세션 스토리지 캐시 무효화
      sessionStorage.removeItem(`lock_status_${dashboardId}`);

      return true;
    } catch (err) {
      logger.error('락 해제 실패:', err);
      return false;
    }
  }, [dashboardId, editMode, logger]);

  /**
   * 필드 업데이트
   * @param {Object} fields - 업데이트할 필드 데이터
   * @returns {Promise<Object>} 업데이트된 대시보드
   */
  const updateFields = useCallback(
    async (fields) => {
      if (!dashboardId || !editMode.fields) return null;

      try {
        setLoading(true);
        setError(null);

        // 필드 업데이트 요청
        logger.info(`필드 업데이트 요청: id=${dashboardId}`, fields);
        const updatedDashboard = await DashboardService.updateFields(
          dashboardId,
          fields
        );

        if (updatedDashboard) {
          setDashboard(updatedDashboard);
          setEditMode({ ...editMode, fields: false });

          // 세션 스토리지 캐시 업데이트
          sessionStorage.setItem(
            `dashboard_detail_${dashboardId}`,
            JSON.stringify(updatedDashboard)
          );
          sessionStorage.setItem(
            `dashboard_detail_${dashboardId}_timestamp`,
            Date.now() + 10 * 60 * 1000
          );

          // 락 해제
          await releaseLock();
          MessageService.success('정보가 업데이트되었습니다');
          if (onSuccess) onSuccess(updatedDashboard);
        }

        return updatedDashboard;
      } catch (err) {
        logger.error('필드 업데이트 실패:', err);
        setError('정보 업데이트 중 오류가 발생했습니다');

        // 낙관적 락 충돌 처리
        if (err.response?.status === 409) {
          MessageService.warning(
            '다른 사용자가 이미 이 데이터를 수정했습니다. 새로고침 후 다시 시도해주세요.',
            MessageKeys.DASHBOARD.OPTIMISTIC_LOCK
          );
        } else {
          MessageService.error('정보 업데이트 중 오류가 발생했습니다');
        }

        if (onError) onError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [dashboardId, editMode, onSuccess, onError, releaseLock, logger]
  );

  /**
   * 메모 업데이트
   * @returns {Promise<Object>} 업데이트된 대시보드
   */
  const updateRemark = useCallback(async () => {
    if (!dashboardId || !editMode.remark) return null;

    try {
      setLoading(true);
      setError(null);

      let updatedDashboard;
      // 기존 메모가 있는지 확인
      if (dashboard.remarks && dashboard.remarks.length > 0) {
        // 메모 업데이트
        logger.info(
          `메모 업데이트 요청: id=${dashboardId}, remarkId=${dashboard.remarks[0].remark_id}`
        );
        updatedDashboard = await DashboardService.updateRemark(
          dashboardId,
          dashboard.remarks[0].remark_id,
          remarkContent
        );
      } else {
        // 새 메모 생성
        logger.info(`새 메모 생성 요청: id=${dashboardId}`);
        updatedDashboard = await DashboardService.createRemark(
          dashboardId,
          remarkContent
        );
      }

      if (updatedDashboard) {
        setDashboard(updatedDashboard);
        setEditMode({ ...editMode, remark: false });

        // 세션 스토리지 캐시 업데이트
        sessionStorage.setItem(
          `dashboard_detail_${dashboardId}`,
          JSON.stringify(updatedDashboard)
        );
        sessionStorage.setItem(
          `dashboard_detail_${dashboardId}_timestamp`,
          Date.now() + 10 * 60 * 1000
        );

        // 락 해제
        await releaseLock();
        MessageService.success('메모가 업데이트되었습니다');
        if (onSuccess) onSuccess(updatedDashboard);
      }

      return updatedDashboard;
    } catch (err) {
      logger.error('메모 업데이트 실패:', err);
      setError('메모 업데이트 중 오류가 발생했습니다');
      MessageService.error('메모 업데이트 중 오류가 발생했습니다');
      if (onError) onError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    dashboardId,
    editMode,
    dashboard,
    remarkContent,
    onSuccess,
    onError,
    releaseLock,
    logger,
  ]);

  /**
   * 편집 취소
   * @returns {Promise<boolean>} 취소 성공 여부
   */
  const cancelEdit = useCallback(async () => {
    // 편집 모드 비활성화
    setEditMode({ fields: false, remark: false });

    // 락 해제
    await releaseLock();

    // 원래 데이터로 복원
    if (dashboard && dashboard.remarks && dashboard.remarks.length > 0) {
      setRemarkContent(dashboard.remarks[0].content || '');
    }

    return true;
  }, [dashboard, releaseLock]);

  /**
   * 상태 업데이트
   * @param {string} status - 새 상태 값
   * @returns {Promise<Object>} 업데이트된 대시보드
   */
  const updateStatus = useCallback(
    async (status) => {
      if (!dashboardId) return null;

      try {
        setLoading(true);
        setError(null);

        // 상태 업데이트 요청
        logger.info(`상태 업데이트 요청: id=${dashboardId}, status=${status}`);
        const updatedDashboard = await DashboardService.updateStatus(
          dashboardId,
          status
        );

        if (updatedDashboard) {
          setDashboard(updatedDashboard);

          // 세션 스토리지 캐시 업데이트
          sessionStorage.setItem(
            `dashboard_detail_${dashboardId}`,
            JSON.stringify(updatedDashboard)
          );
          sessionStorage.setItem(
            `dashboard_detail_${dashboardId}_timestamp`,
            Date.now() + 10 * 60 * 1000
          );

          MessageService.success(`${status} 상태로 변경되었습니다`);
          if (onSuccess) onSuccess(updatedDashboard);
        }

        return updatedDashboard;
      } catch (err) {
        logger.error('상태 업데이트 실패:', err);
        setError('상태 변경 중 오류가 발생했습니다');

        // 낙관적 락 충돌 처리
        if (err.response?.status === 409) {
          MessageService.warning(
            '다른 사용자가 이미 이 데이터를 수정했습니다. 새로고침 후 다시 시도해주세요.',
            MessageKeys.DASHBOARD.OPTIMISTIC_LOCK
          );
        } else {
          MessageService.error('상태 변경 중 오류가 발생했습니다');
        }

        if (onError) onError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [dashboardId, onSuccess, onError, logger]
  );

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    if (dashboardId) {
      fetchDashboardDetail();
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      clearTimeout(lockExpiryTimerRef.current);
      clearTimeout(warningTimerRef.current);
      if (editMode.fields || editMode.remark) {
        releaseLock();
      }
    };
  }, [
    dashboardId,
    fetchDashboardDetail,
    editMode.fields,
    editMode.remark,
    releaseLock,
  ]);

  return {
    // 상태
    dashboard,
    loading,
    error,
    editMode,
    remarkContent,
    lockInfo,
    lockLoading,

    // 상태 설정 함수
    setRemarkContent,

    // 액션 함수
    fetchDashboardDetail,
    checkLockStatus,
    startFieldsEdit,
    startRemarkEdit,
    updateFields,
    updateRemark,
    releaseLock,
    cancelEdit,
    updateStatus,

    // 유틸리티 함수
    getLockTypeText,
  };
};

export default useDashboardDetail;

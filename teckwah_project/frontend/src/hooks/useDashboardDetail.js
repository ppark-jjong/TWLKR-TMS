// src/hooks/useDashboardDetail.js
import { useState, useCallback, useEffect, useRef } from 'react';
import DashboardService from '../services/DashboardService';
import LockService from '../services/LockService';
import message from '../utils/message';
import { MessageKeys } from '../utils/message';
import { useLogger } from '../utils/LogUtils';

/**
 * 대시보드 상세 정보 및 편집 모드를 관리하는 커스텀 훅
 * 비관적 락 메커니즘 지원 및 상태 관리 통합
 *
 * @param {Object} options - 옵션 객체
 * @returns {Object} - 상태 및 액션 함수들
 */
const useDashboardDetail = (options = {}) => {
  const { dashboardId, onSuccess, onError } = options;
  const logger = useLogger('useDashboardDetail');

  // 상태 관리
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lockLoading, setLockLoading] = useState(false);
  const [lockInfo, setLockInfo] = useState(null);
  const [remarkContent, setRemarkContent] = useState('');
  const [editMode, setEditMode] = useState({
    fields: false,
    remark: false,
  });

  // 타이머 및 플래그 관리
  const lockExpiryTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const isLoadingRef = useRef(false);

  // 락 만료 경고 표시 함수
  const showLockExpiryWarning = useCallback(() => {
    message.warning(
      '편집 세션이 곧 만료됩니다. 작업을 완료하거나 저장하세요.',
      MessageKeys.DASHBOARD.LOCK_WARNING
    );
  }, []);

  // 락 만료 처리 함수
  const handleLockExpiry = useCallback(() => {
    setEditMode({ fields: false, remark: false });
    setLockInfo(null);
    message.error(
      '편집 세션이 만료되었습니다. 편집 모드를 다시 활성화해야 합니다.',
      MessageKeys.DASHBOARD.LOCK_EXPIRED
    );
  }, []);

  // 락 타이머 설정 함수
  const setupLockTimer = useCallback(
    (lockData) => {
      // 기존 타이머 정리
      clearTimeout(lockExpiryTimerRef.current);
      clearTimeout(warningTimerRef.current);

      if (!lockData || !lockData.expires_at) return;

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
    },
    [showLockExpiryWarning, handleLockExpiry]
  );

  // 대시보드 상세 정보 조회
  const fetchDashboardDetail = useCallback(async () => {
    if (!dashboardId || isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      logger.info(`대시보드 상세 정보 조회: id=${dashboardId}`);
      const data = await DashboardService.getDashboardDetail(dashboardId);

      if (data) {
        setDashboard(data);
        // 메모 내용 설정 (첫 번째 메모만 사용)
        if (data.remarks && data.remarks.length > 0) {
          setRemarkContent(data.remarks[0].content || '');
        } else {
          setRemarkContent('');
        }
      }

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
  }, [dashboardId, logger, onError]);

  // 락 상태 확인
  const checkLockStatus = useCallback(async () => {
    if (!dashboardId) return null;

    try {
      setLockLoading(true);
      const lockStatus = await LockService.checkLockStatus(dashboardId);

      if (lockStatus && lockStatus.is_locked) {
        setLockInfo(lockStatus);
        // 락 타이머 설정
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
  }, [dashboardId, logger, setupLockTimer]);

  // 필드 편집 시작
  const startFieldsEdit = useCallback(async () => {
    if (!dashboardId || editMode.fields || editMode.remark) return;

    try {
      setLockLoading(true);
      setError(null);

      // 락 획득 요청
      const lock = await LockService.acquireLock(dashboardId, 'EDIT');

      if (lock) {
        setLockInfo(lock);
        setEditMode({ ...editMode, fields: true });
        // 락 타이머 설정
        setupLockTimer(lock);
        message.success('편집 모드가 활성화되었습니다');
      }
    } catch (err) {
      logger.error('필드 편집 시작 실패:', err);
      setError('편집 모드를 활성화하는 중 오류가 발생했습니다');
    } finally {
      setLockLoading(false);
    }
  }, [dashboardId, editMode, logger, setupLockTimer]);

  // 메모 편집 시작
  const startRemarkEdit = useCallback(async () => {
    if (!dashboardId || editMode.fields || editMode.remark) return;

    try {
      setLockLoading(true);
      setError(null);

      // 락 획득 요청
      const lock = await LockService.acquireLock(dashboardId, 'REMARK');

      if (lock) {
        setLockInfo(lock);
        setEditMode({ ...editMode, remark: true });
        // 락 타이머 설정
        setupLockTimer(lock);
        message.success('메모 편집 모드가 활성화되었습니다');
      }
    } catch (err) {
      logger.error('메모 편집 시작 실패:', err);
      setError('메모 편집 모드를 활성화하는 중 오류가 발생했습니다');
    } finally {
      setLockLoading(false);
    }
  }, [dashboardId, editMode, logger, setupLockTimer]);

  // 필드 업데이트
  const updateFields = useCallback(
    async (fields) => {
      if (!dashboardId || !editMode.fields) return;

      try {
        setLoading(true);
        setError(null);

        // 필드 업데이트 요청
        const updatedDashboard = await DashboardService.updateDashboardFields(
          dashboardId,
          fields
        );

        if (updatedDashboard) {
          setDashboard(updatedDashboard);
          setEditMode({ ...editMode, fields: false });
          // 락 해제
          await releaseLock();
          message.success('정보가 업데이트되었습니다');
          if (onSuccess) onSuccess(updatedDashboard);
        }

        return updatedDashboard;
      } catch (err) {
        logger.error('필드 업데이트 실패:', err);
        setError('정보 업데이트 중 오류가 발생했습니다');
        if (onError) onError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [dashboardId, editMode, logger, onSuccess, onError, releaseLock]
  );

  // 메모 업데이트
  const updateRemark = useCallback(async () => {
    if (!dashboardId || !editMode.remark) return;

    try {
      setLoading(true);
      setError(null);

      let updatedDashboard;
      // 기존 메모가 있는지 확인
      if (dashboard.remarks && dashboard.remarks.length > 0) {
        // 메모 업데이트
        updatedDashboard = await DashboardService.updateRemark(
          dashboardId,
          dashboard.remarks[0].remark_id,
          remarkContent
        );
      } else {
        // 새 메모 생성
        updatedDashboard = await DashboardService.createRemark(
          dashboardId,
          remarkContent
        );
      }

      if (updatedDashboard) {
        setDashboard(updatedDashboard);
        setEditMode({ ...editMode, remark: false });
        // 락 해제
        await releaseLock();
        message.success('메모가 업데이트되었습니다');
        if (onSuccess) onSuccess(updatedDashboard);
      }

      return updatedDashboard;
    } catch (err) {
      logger.error('메모 업데이트 실패:', err);
      setError('메모 업데이트 중 오류가 발생했습니다');
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
    logger,
    onSuccess,
    onError,
    releaseLock,
  ]);

  // 락 해제
  const releaseLock = useCallback(async () => {
    if (!dashboardId || (!editMode.fields && !editMode.remark)) return;

    try {
      // 타이머 정리
      clearTimeout(lockExpiryTimerRef.current);
      clearTimeout(warningTimerRef.current);

      // 락 해제 요청
      await LockService.releaseLock(dashboardId);
      setLockInfo(null);
      logger.info('락 해제 성공');
    } catch (err) {
      logger.error('락 해제 실패:', err);
    }
  }, [dashboardId, editMode, logger]);

  // 편집 취소
  const cancelEdit = useCallback(async () => {
    // 편집 모드 비활성화
    setEditMode({ fields: false, remark: false });
    // 락 해제
    await releaseLock();
    // 원래 데이터로 복원
    if (dashboard && dashboard.remarks && dashboard.remarks.length > 0) {
      setRemarkContent(dashboard.remarks[0].content || '');
    }
  }, [dashboard, releaseLock]);

  // 상태 업데이트
  const updateStatus = useCallback(
    async (status) => {
      if (!dashboardId) return;

      try {
        setLoading(true);
        setError(null);

        // 상태 업데이트 요청
        const updatedDashboard = await DashboardService.updateStatus(
          dashboardId,
          status
        );

        if (updatedDashboard) {
          setDashboard(updatedDashboard);
          message.success(`${status} 상태로 변경되었습니다`);
          if (onSuccess) onSuccess(updatedDashboard);
        }

        return updatedDashboard;
      } catch (err) {
        logger.error('상태 업데이트 실패:', err);
        setError('상태 변경 중 오류가 발생했습니다');
        if (onError) onError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [dashboardId, logger, onSuccess, onError]
  );

  // 락 타입에 따른 텍스트 반환
  const getLockTypeText = useCallback((lockType) => {
    switch (lockType) {
      case 'EDIT':
        return '편집';
      case 'STATUS':
        return '상태 변경';
      case 'ASSIGN':
        return '배차';
      case 'REMARK':
        return '메모 작성';
      default:
        return '수정';
    }
  }, []);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    if (dashboardId) {
      fetchDashboardDetail();
      checkLockStatus();
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
    checkLockStatus,
    editMode,
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

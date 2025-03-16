// src/hooks/useLock.js
import { useState, useEffect, useCallback, useRef } from 'react';
import message from '../utils/message';
import LockService from '../services/LockService';
import { MessageKeys } from '../utils/message';

/**
 * 비관적 락 관리를 위한 커스텀 훅
 * @param {Object} options - 옵션 객체
 * @param {string} options.dashboardId - 대시보드 ID
 * @param {string} options.lockType - 락 타입 (EDIT, STATUS, ASSIGN, REMARK)
 * @param {boolean} options.autoAcquire - 자동 락 획득 여부
 * @param {boolean} options.autoRelease - 컴포넌트 언마운트 시 자동 락 해제 여부
 * @param {Function} options.onLockSuccess - 락 획득 성공 시 콜백
 * @param {Function} options.onLockError - 락 획득 실패 시 콜백
 * @returns {Object} 락 관련 상태 및 함수
 */
const useLock = (options = {}) => {
  const {
    dashboardId,
    lockType = 'EDIT',
    autoAcquire = false,
    autoRelease = true,
    onLockSuccess,
    onLockError,
    messageKey = MessageKeys.DASHBOARD.LOCK_ACQUIRE,
  } = options;

  const [hasLock, setHasLock] = useState(false);
  const [lockInfo, setLockInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 락 타임아웃 추적을 위한 ref
  const lockTimeoutRef = useRef(null);

  // 사용자 액션 타임스탬프 추적 (자동 갱신용)
  const lastActionTimeRef = useRef(Date.now());

  // 컴포넌트 마운트 상태 추적
  const isMountedRef = useRef(true);

  // 락 획득 함수
  const acquireLock = useCallback(async () => {
    if (!dashboardId) {
      console.error('락 획득 실패: 대시보드 ID가 없습니다.');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      message.loading('편집 모드 진입 중...', messageKey);

      console.log(
        `[useLock] 락 획득 시도: ID=${dashboardId}, 타입=${lockType}`
      );
      const lockResult = await LockService.acquireLock(dashboardId, lockType);

      if (!isMountedRef.current) return false;

      // 락 정보 설정
      setLockInfo(lockResult);
      setHasLock(true);
      lastActionTimeRef.current = Date.now();

      // 성공 메시지 표시
      message.loadingToSuccess('편집 모드가 활성화되었습니다', messageKey);

      // 만료 시간 계산 (기본 5분)
      const expiresInMs = lockResult.expires_in_seconds * 1000 || 5 * 60 * 1000;

      // 만료 1분 전 경고 타이머 설정
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }

      lockTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && hasLock) {
          message.warning(
            '편집 시간이 1분 남았습니다. 작업을 완료하거나 연장하세요.'
          );
        }
      }, expiresInMs - 60000);

      // 성공 콜백 호출
      if (onLockSuccess) {
        onLockSuccess(lockResult);
      }

      return true;
    } catch (err) {
      if (!isMountedRef.current) return false;

      console.error('[useLock] 락 획득 실패:', err);
      setError(err);

      // 이미 락이 걸려있는 경우 (423 Locked)
      if (err.response?.status === 423) {
        const lockedBy = err.response.data?.detail?.locked_by || '다른 사용자';
        message.loadingToError(
          `현재 ${lockedBy}님이 이 데이터를 수정 중입니다. 잠시 후 다시 시도해주세요.`,
          messageKey
        );
      } else {
        message.loadingToError('편집 모드 활성화에 실패했습니다', messageKey);
      }

      // 실패 콜백 호출
      if (onLockError) {
        onLockError(err);
      }

      return false;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [dashboardId, lockType, messageKey, onLockSuccess, onLockError]);

  // 락 해제 함수
  const releaseLock = useCallback(async () => {
    if (!dashboardId || !hasLock) return;

    try {
      console.log(`[useLock] 락 해제 시도: ID=${dashboardId}`);
      await LockService.releaseLock(dashboardId);

      if (!isMountedRef.current) return;

      // 타이머 정리
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }

      // 상태 정리
      setHasLock(false);
      setLockInfo(null);

      console.log('[useLock] 락 해제 성공');
    } catch (err) {
      console.error('[useLock] 락 해제 실패:', err);

      // 실패해도 클라이언트 측에서는 락 해제 처리
      if (isMountedRef.current) {
        setHasLock(false);
        setLockInfo(null);
      }
    }
  }, [dashboardId, hasLock]);

  // 락 갱신 함수
  const renewLock = useCallback(async () => {
    if (!dashboardId || !hasLock) return;

    try {
      console.log(`[useLock] 락 갱신 시도: ID=${dashboardId}`);
      const refreshedLock = await LockService.renewLock(dashboardId);

      if (!isMountedRef.current) return;

      // 락 정보 업데이트
      setLockInfo(refreshedLock);
      lastActionTimeRef.current = Date.now();

      // 타이머 재설정
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }

      const expiresInMs =
        refreshedLock.expires_in_seconds * 1000 || 5 * 60 * 1000;

      lockTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && hasLock) {
          message.warning(
            '편집 시간이 1분 남았습니다. 작업을 완료하거나 연장하세요.'
          );
        }
      }, expiresInMs - 60000);

      console.log('[useLock] 락 갱신 성공');
    } catch (err) {
      console.error('[useLock] 락 갱신 실패:', err);

      // 갱신 실패 시 재획득 시도
      if (isMountedRef.current) {
        await acquireLock();
      }
    }
  }, [dashboardId, hasLock, acquireLock]);

  // 락 상태 확인 함수
  const checkLockStatus = useCallback(async () => {
    if (!dashboardId) return null;

    try {
      const status = await LockService.checkLockStatus(dashboardId);

      if (!isMountedRef.current) return null;

      // 내가 가진 락이 아닌 경우 상태 업데이트
      if (
        status.is_locked &&
        hasLock &&
        status.locked_by !== lockInfo?.locked_by
      ) {
        setHasLock(false);
        setLockInfo(null);

        if (lockTimeoutRef.current) {
          clearTimeout(lockTimeoutRef.current);
          lockTimeoutRef.current = null;
        }
      }

      return status;
    } catch (err) {
      console.error('[useLock] 락 상태 확인 실패:', err);
      return null;
    }
  }, [dashboardId, hasLock, lockInfo]);

  // 자동 락 획득
  useEffect(() => {
    if (autoAcquire && dashboardId && !hasLock && !loading) {
      acquireLock();
    }
  }, [autoAcquire, dashboardId, hasLock, loading, acquireLock]);

  // 사용자 활동 모니터링을 통한 자동 갱신
  useEffect(() => {
    const handleUserActivity = () => {
      lastActionTimeRef.current = Date.now();
    };

    // 사용자 활동 이벤트 리스너
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    // 주기적 락 갱신 타이머 (30초마다)
    const renewInterval = setInterval(() => {
      if (hasLock) {
        // 마지막 활동으로부터 4분 이상 경과하지 않았으면 갱신
        const inactiveTime = Date.now() - lastActionTimeRef.current;
        if (inactiveTime < 4 * 60 * 1000) {
          renewLock();
        }
      }
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      clearInterval(renewInterval);
    };
  }, [hasLock, renewLock]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // 타이머 정리
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }

      // 자동 락 해제
      if (autoRelease && hasLock) {
        releaseLock();
      }
    };
  }, [autoRelease, hasLock, releaseLock]);

  return {
    hasLock,
    lockInfo,
    loading,
    error,
    acquireLock,
    releaseLock,
    renewLock,
    checkLockStatus,
  };
};

export default useLock;

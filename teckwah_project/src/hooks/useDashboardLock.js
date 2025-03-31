// src/hooks/useDashboardLock.js
import { useState } from 'react';
import { message } from 'antd';
import { acquireLock, releaseLock } from '../utils/api';

/**
 * 대시보드 락 관리 훅
 * @returns {Object} 락 관련 상태 및 함수들
 */
const useDashboardLock = () => {
  const [lockConflictInfo, setLockConflictInfo] = useState(null);
  const [lockType, setLockType] = useState('');
  const [dashboardIdForLock, setDashboardIdForLock] = useState(null);
  const [actionAfterLock, setActionAfterLock] = useState(null);
  const [isLockLoading, setIsLockLoading] = useState(false);

  /**
   * 락 획득 시도
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} type - 락 타입 (EDIT, STATUS, ASSIGN)
   * @param {Function} action - 락 획득 후 실행할 함수
   */
  const handleAcquireLock = async (dashboardId, type, action) => {
    try {
      setIsLockLoading(true);
      setDashboardIdForLock(dashboardId);
      setLockType(type);
      setActionAfterLock(action);

      // 락 획득 시도
      const response = await acquireLock(dashboardId, type);

      // 락 획득 성공 시 액션 실행
      if (response.data.success) {
        if (action) action();
      } else {
        // 실패 시 이미 에러 객체가 있을 경우 락 충돌 처리
        if (response.data.error_code === 'LOCK_CONFLICT') {
          setLockConflictInfo(response.data.data);
        } else {
          message.error(response.data.message || '락 획득에 실패했습니다');
        }
      }
    } catch (error) {
      console.error('Lock acquisition error:', error);

      if (error.response?.data?.error_code === 'LOCK_CONFLICT') {
        setLockConflictInfo(error.response.data.data);
        return;
      }

      message.error('락 획득 중 오류가 발생했습니다');
    } finally {
      setIsLockLoading(false);
    }
  };

  /**
   * 락 해제
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} type - 락 타입 (EDIT, STATUS, ASSIGN)
   */
  const handleReleaseLock = async (dashboardId, type) => {
    if (!dashboardId || !type) return;

    try {
      await releaseLock(dashboardId, type);
      // 락이 해제되었다는 알림은 굳이 표시하지 않음
    } catch (error) {
      console.error('Lock release error:', error);
      // 락 해제 실패는 조용히 처리 (이미 해제된 경우도 있으므로)
    }
  };

  /**
   * 여러 대시보드에 대한 락 획득 시도
   * @param {Array<number>} dashboardIds - 대시보드 ID 배열
   * @param {string} type - 락 타입 (EDIT, STATUS, ASSIGN)
   * @param {Function} action - 락 획득 성공 시 실행할 함수
   */
  const handleAcquireMultipleLocks = async (dashboardIds, type, action) => {
    if (!dashboardIds || dashboardIds.length === 0) {
      message.warning('선택된 항목이 없습니다');
      return false;
    }

    try {
      setIsLockLoading(true);
      setLockType(type);
      setActionAfterLock(action);

      // 백엔드 API를 통한 다중 락 획득 시도 (한 번의 호출로 원자성 보장)
      const response = await acquireLock(dashboardIds, type, true); // 새 파라미터로 다중 락 요청임을 표시

      if (response.data.success) {
        // 성공 시 액션 실행
        if (action) await action();
        return true;
      } else {
        // 실패 시 락 충돌 정보 표시
        if (response.data.error_code === 'LOCK_CONFLICT') {
          setLockConflictInfo(response.data.data);
        } else {
          message.error(response.data.message || '락 획득에 실패했습니다');
        }
        return false;
      }
    } catch (error) {
      console.error('Multiple lock acquisition error:', error);

      if (error.response?.data?.error_code === 'LOCK_CONFLICT') {
        setLockConflictInfo(error.response.data.data);
      } else {
        message.error('락 획득 중 오류가 발생했습니다');
      }
      return false;
    } finally {
      setIsLockLoading(false);
    }
  };

  /**
   * 여러 대시보드에 대한 락 해제
   * @param {Array<number>} dashboardIds - 대시보드 ID 배열
   * @param {string} type - 락 타입 (EDIT, STATUS, ASSIGN)
   */
  const handleReleaseMultipleLocks = async (dashboardIds, type) => {
    if (!dashboardIds || !dashboardIds.length || !type) return;

    try {
      // 백엔드 API를 통한 다중 락 해제 (한 번의 호출로 원자성 보장)
      await releaseLock(dashboardIds, type, true); // 새 파라미터로 다중 락 요청임을 표시
    } catch (error) {
      console.error('Multiple lock release error:', error);
      // 락 해제 실패는 조용히 처리 (이미 해제된 경우도 있으므로)
    }
  };

  /**
   * 락 충돌 모달 닫기
   */
  const handleCancelLock = () => {
    setLockConflictInfo(null);
    setDashboardIdForLock(null);
    setLockType('');
    setActionAfterLock(null);
  };

  /**
   * 락 재시도
   */
  const handleRetryLock = async () => {
    setLockConflictInfo(null);

    if (dashboardIdForLock && lockType && actionAfterLock) {
      handleAcquireLock(dashboardIdForLock, lockType, actionAfterLock);
    }
  };

  return {
    lockConflictInfo,
    isLockLoading,
    acquireLock: handleAcquireLock,
    releaseLock: handleReleaseLock,
    acquireMultipleLocks: handleAcquireMultipleLocks,
    releaseMultipleLocks: handleReleaseMultipleLocks,
    cancelLock: handleCancelLock,
    retryLock: handleRetryLock,
  };
};

export default useDashboardLock;

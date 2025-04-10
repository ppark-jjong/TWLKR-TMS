// src/hooks/useDashboardLock.js
import { useState } from 'react';
import { message } from 'antd';
import { acquireLock, releaseLock } from '../utils/Api';

/**
 * 락 상태 관리를 위한 타입
 * @typedef {Object} LockState
 * @property {string} type - 락 타입 (EDIT, STATUS, ASSIGN)
 * @property {number|number[]} dashboardId - 대시보드 ID 또는 ID 배열
 * @property {Function} actionAfterLock - 락 획득 후 실행할 함수
 */

/**
 * 대시보드 락 관리 훅 - 간소화된 버전
 * @returns {Object} 락 관련 상태 및 함수들
 */
const useDashboardLock = () => {
  // 락 충돌 정보
  const [lockConflictInfo, setLockConflictInfo] = useState(null);
  // 현재 락 상태
  const [lockState, setLockState] = useState({
    type: '',
    dashboardId: null,
    actionAfterLock: null,
  });
  // 락 처리 로딩 상태
  const [isLockLoading, setIsLockLoading] = useState(false);

  /**
   * 락 획득 시도
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} type - 락 타입 (EDIT, STATUS, ASSIGN)
   * @param {Function} action - 락 획득 후 실행할 함수
   */
  const handleAcquireLock = async (dashboardId, type, action) => {
    try {
      if (!dashboardId || !type) {
        message.error('락 획득에 필요한 정보가 부족합니다');
        return false;
      }

      setIsLockLoading(true);
      // 락 상태 설정
      setLockState({
        type,
        dashboardId,
        actionAfterLock: action,
      });

      // 락 획득 시도
      const response = await acquireLock(dashboardId, type);
      const result = response.data;

      // 락 획득 성공 시 액션 실행
      if (result && result.success) {
        if (action) action();
        return true;
      } else {
        // 실패 시 락 충돌 처리
        if (result && result.error_code === 'LOCK_CONFLICT') {
          setLockConflictInfo(result.data);
          message.warning(result.message || '이미 다른 사용자가 편집 중입니다');
        } else if (result) {
          message.error(result.message || '락 획득에 실패했습니다');
        }
        return false;
      }
    } catch (error) {
      console.error('락 획득 오류:', error);

      if (error.response?.data?.error_code === 'LOCK_CONFLICT') {
        setLockConflictInfo(error.response.data.data);
        message.warning(
          error.response.data.message || '이미 다른 사용자가 편집 중입니다'
        );
      } else {
        message.error('락 획득 중 오류가 발생했습니다');
      }
      return false;
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
    if (!dashboardId || !type) return false;

    try {
      const response = await releaseLock(dashboardId, type);
      return response.data && response.data.success;
    } catch (error) {
      console.error('락 해제 오류:', error);
      return false;
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

    if (!type) {
      message.error('락 유형이 지정되지 않았습니다');
      return false;
    }

    try {
      setIsLockLoading(true);
      // 락 상태 설정
      setLockState({
        type,
        dashboardId: dashboardIds,
        actionAfterLock: action,
      });

      // 다중 락 획득 시도
      const response = await acquireLock(dashboardIds, type, true);
      const result = response.data;

      if (result && result.success) {
        // 성공 시 액션 실행
        if (action) await action();
        return true;
      } else {
        // 실패 시 락 충돌 정보 표시
        if (result && result.error_code === 'LOCK_CONFLICT') {
          setLockConflictInfo(result.data);
          message.warning(
            result.message || '이미 다른 사용자가 편집 중인 항목이 있습니다'
          );
        } else if (result) {
          message.error(result.message || '락 획득에 실패했습니다');
        }
        return false;
      }
    } catch (error) {
      console.error('다중 락 획득 오류:', error);

      if (error.response?.data?.error_code === 'LOCK_CONFLICT') {
        setLockConflictInfo(error.response.data.data);
        message.warning(
          error.response.data.message ||
            '이미 다른 사용자가 편집 중인 항목이 있습니다'
        );
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
    if (!dashboardIds || !dashboardIds.length || !type) return false;

    try {
      const response = await releaseLock(dashboardIds, type, true);
      return response.data && response.data.success;
    } catch (error) {
      console.error('다중 락 해제 오류:', error);
      return false;
    }
  };

  /**
   * 락 충돌 취소 처리
   */
  const handleCancelLock = () => {
    setLockConflictInfo(null);
    setLockState({
      type: '',
      dashboardId: null,
      actionAfterLock: null,
    });
  };

  /**
   * 락 획득 재시도
   */
  const handleRetryLock = async () => {
    setLockConflictInfo(null);

    const { type, dashboardId, actionAfterLock } = lockState;

    if (dashboardId && type && actionAfterLock) {
      if (Array.isArray(dashboardId)) {
        return await handleAcquireMultipleLocks(
          dashboardId,
          type,
          actionAfterLock
        );
      } else {
        return await handleAcquireLock(dashboardId, type, actionAfterLock);
      }
    }

    return false;
  };

  return {
    lockConflictInfo,
    isLockLoading,
    handleAcquireLock,
    handleReleaseLock,
    handleAcquireMultipleLocks,
    handleReleaseMultipleLocks,
    handleCancelLock,
    handleRetryLock,
  };
};

export default useDashboardLock;

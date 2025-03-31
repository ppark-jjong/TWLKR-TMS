// src/utils/lockHelpers.js

import { acquireLock, releaseLock, getLockInfo } from './api';

/**
 * 락 획득
 * @param {number} dashboardId - 대시보드 ID
 * @param {string} lockType - 락 타입 (EDIT, STATUS, ASSIGN)
 * @returns {Promise<Object>} 락 정보
 * @throws {Error} 락 획득 실패 시
 */
export const acquireLockAsync = async (dashboardId, lockType) => {
  try {
    // 락 획득 시도
    const response = await acquireLock(dashboardId, lockType);

    if (response.data.success) {
      return response.data.data;
    }

    // API가 success: false를 반환한 경우 상세 오류 처리 (수정)
    if (response.data.error_code === 'LOCK_CONFLICT') {
      const error = new Error(response.data.message || '락 충돌 발생');
      error.lockInfo = response.data.data;
      error.errorCode = 'LOCK_CONFLICT';
      throw error;
    }

    throw new Error(response.data.message || '락 획득 실패');
  } catch (error) {
    // 네트워크 오류 등 기타 예외 케이스 처리 개선 (수정)
    if (!error.errorCode) {
      console.error('Lock acquisition error:', error);
      // 원본 에러 객체에 추가 정보 첨부
      error.dashboardId = dashboardId;
      error.lockType = lockType;
    }
    throw error;
  }
};

/**
 * 락 해제
 * @param {number} dashboardId - 대시보드 ID
 * @param {string} lockType - 락 타입 (EDIT, STATUS, ASSIGN)
 * @returns {Promise<boolean>} 성공 여부
 */
export const releaseLockAsync = async (dashboardId, lockType) => {
  try {
    // null/undefined 체크 추가 (수정)
    if (!dashboardId || !lockType) return false;

    const response = await releaseLock(dashboardId, lockType);
    return response.data.success;
  } catch (error) {
    console.error('Lock release error:', error);
    return false;
  }
};

/**
 * 락 정보 조회
 * @param {number} dashboardId - 대시보드 ID
 * @param {string} lockType - 락 타입 (EDIT, STATUS, ASSIGN)
 * @returns {Promise<Object>} 락 정보
 */
export const getLockInfoAsync = async (dashboardId, lockType) => {
  try {
    const response = await getLockInfo(dashboardId, lockType);
    return response.data.data;
  } catch (error) {
    console.error('Lock info fetch error:', error);
    return { is_locked: false };
  }
};

/**
 * 다중 락 획득 시도
 * @param {Array<number>} dashboardIds - 대시보드 ID 배열
 * @param {string} lockType - 락 타입 (EDIT, STATUS, ASSIGN)
 * @returns {Promise<Array<Object>>} 락 정보 배열
 * @throws {Error} 락 획득 실패 시
 */
export const acquireMultipleLocks = async (dashboardIds, lockType) => {
  try {
    // 다중 락 API 사용
    const response = await acquireLock(dashboardIds, lockType, true);

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(
        response.data.message || '일부 항목의 락 획득에 실패했습니다'
      );
    }
  } catch (error) {
    console.error('Multiple lock acquisition error:', error);
    throw error;
  }
};

/**
 * 다중 락 해제
 * @param {Array<number>} dashboardIds - 대시보드 ID 배열
 * @param {string} lockType - 락 타입 (EDIT, STATUS, ASSIGN)
 * @returns {Promise<boolean>} 성공 여부
 */
export const releaseMultipleLocks = async (dashboardIds, lockType) => {
  try {
    // 파라미터 검증 추가
    if (!dashboardIds || !dashboardIds.length || !lockType) {
      return false;
    }

    // 다중 락 해제 API 사용
    const response = await releaseLock(dashboardIds, lockType, true);
    return response.data.success;
  } catch (error) {
    console.error('Multiple lock release error:', error);
    return false;
  }
};

export default {
  acquireLockAsync,
  releaseLockAsync,
  getLockInfoAsync,
  acquireMultipleLocks,
  releaseMultipleLocks,
};

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
    const response = await acquireLock(dashboardId, lockType);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || '락 획득 실패');
  } catch (error) {
    console.error('Lock acquisition error:', error);
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
    // 모든 락 획득 시도
    const lockPromises = dashboardIds.map(id => acquireLock(id, lockType));
    const responses = await Promise.all(lockPromises);
    
    // 실패한 락이 있는지 확인
    const hasFailure = responses.some(response => !response.data.success);
    
    if (hasFailure) {
      // 실패 시 이미 획득한 락 해제
      await releaseMultipleLocks(dashboardIds, lockType);
      throw new Error('일부 항목의 락 획득에 실패했습니다');
    }
    
    // 락 정보 반환
    return responses.map(response => response.data.data);
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
    // 모든 락 해제 시도
    const releasePromises = dashboardIds.map(id => releaseLock(id, lockType));
    await Promise.all(releasePromises);
    return true;
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
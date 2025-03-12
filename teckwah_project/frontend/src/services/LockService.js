// frontend/src/services/LockService.js
import axios from 'axios';
import message from '../utils/message';
import { MessageKeys } from '../utils/message';

/**
 * 비관적 락(Pessimistic Lock) 관리 서비스
 * 동시 편집 제어를 위한 락 획득, 해제, 상태 확인 기능 제공
 */
class LockService {
  /**
   * 비관적 락 획득 요청
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} lockType - 락 타입 (EDIT, STATUS, ASSIGN, REMARK)
   * @returns {Promise<Object>} - 락 정보
   */
  async acquireLock(dashboardId, lockType) {
    const key = MessageKeys.DASHBOARD.LOCK_ACQUIRE || 'lock-acquire';
    try {
      message.loading('편집 모드 진입 중...', key);
      console.log(
        `[LockService] 락 획득 요청: dashboardId=${dashboardId}, lockType=${lockType}`
      );

      const response = await axios.post(`/dashboard/${dashboardId}/lock`, {
        lock_type: lockType,
      });

      message.loadingToSuccess('편집 모드가 활성화되었습니다', key);
      console.log(
        `[LockService] 락 획득 성공: ${JSON.stringify(response.data)}`
      );
      return response.data;
    } catch (error) {
      console.error('[LockService] 락 획득 실패:', error);

      // 이미 락이 걸려있는 경우 (423 Locked)
      if (error.response?.status === 423) {
        const lockedBy =
          error.response.data?.detail?.locked_by || '다른 사용자';
        message.loadingToError(
          `현재 ${lockedBy}님이 이 데이터를 수정 중입니다. 잠시 후 다시 시도해주세요.`,
          key
        );
      } else {
        message.loadingToError('편집 모드 활성화에 실패했습니다', key);
      }
      throw error;
    }
  }

  /**
   * 비관적 락 해제 요청
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<boolean>} - 성공 여부
   */
  async releaseLock(dashboardId) {
    try {
      console.log(`[LockService] 락 해제 요청: dashboardId=${dashboardId}`);
      const response = await axios.delete(`/dashboard/${dashboardId}/lock`);
      console.log('[LockService] 락 해제 성공');
      return true;
    } catch (error) {
      console.error('[LockService] 락 해제 실패:', error);
      // 실패해도 사용자 경험을 위해 UI는 락 해제 상태로 전환
      return false;
    }
  }

  /**
   * 락 상태 확인
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<Object>} - 락 상태 정보
   */
  async checkLockStatus(dashboardId) {
    try {
      console.log(`[LockService] 락 상태 확인: dashboardId=${dashboardId}`);
      const response = await axios.get(`/dashboard/${dashboardId}/lock/status`);
      const lockInfo = response.data.data || {};

      console.log(
        `[LockService] 락 상태: ${lockInfo.is_locked ? '잠김' : '해제됨'}`
      );
      if (lockInfo.is_locked) {
        console.log(
          `[LockService] 락 소유자: ${lockInfo.locked_by}, 타입: ${lockInfo.lock_type}`
        );
      }

      return lockInfo;
    } catch (error) {
      console.error('[LockService] 락 상태 확인 실패:', error);
      // 락 상태 확인 실패 시 기본값 반환
      return { is_locked: false };
    }
  }

  /**
   * 관리자 전용 강제 락 해제
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<boolean>} - 성공 여부
   */
  async forceReleaseLock(dashboardId) {
    try {
      console.log(
        `[LockService] 강제 락 해제 요청: dashboardId=${dashboardId}`
      );
      const response = await axios.delete(
        `/dashboard/${dashboardId}/lock/force`
      );
      message.success('락이 강제로 해제되었습니다');
      return true;
    } catch (error) {
      console.error('[LockService] 강제 락 해제 실패:', error);
      message.error('강제 락 해제에 실패했습니다');
      return false;
    }
  }

  /**
   * 여러 대시보드에 대한 락 획득 (배차 처리용)
   * @param {Array<number>} dashboardIds - 대시보드 ID 배열
   * @param {string} lockType - 락 타입 (주로 'ASSIGN')
   * @returns {Promise<Array<number>>} - 락 획득 성공한 ID 배열
   */
  async acquireMultipleLocks(dashboardIds, lockType = 'ASSIGN') {
    if (!dashboardIds || !dashboardIds.length) return [];

    const successIds = [];
    const failedIds = [];

    try {
      console.log(
        `[LockService] 다중 락 획득 요청: ${dashboardIds.join(', ')}`
      );

      // 개별 락 획득 요청을 배열로 생성
      const lockPromises = dashboardIds.map((id) =>
        this.acquireLock(id, lockType)
          .then(() => successIds.push(id))
          .catch(() => failedIds.push(id))
      );

      // 모든 락 획득 요청 처리 대기
      await Promise.all(lockPromises);

      // 일부 락 획득 실패 시 이미 획득한 락도 모두 해제
      if (failedIds.length > 0) {
        console.warn(
          `[LockService] 일부 항목 락 획득 실패: ${failedIds.join(', ')}`
        );

        // 이미 획득한 락 모두 해제
        await Promise.all(successIds.map((id) => this.releaseLock(id)));

        return [];
      }

      console.log(`[LockService] 다중 락 획득 성공: ${successIds.join(', ')}`);
      return successIds;
    } catch (error) {
      console.error('[LockService] 다중 락 획득 중 예외 발생:', error);

      // 예외 발생 시 이미 획득한 락 모두 해제
      await Promise.all(successIds.map((id) => this.releaseLock(id)));

      return [];
    }
  }

  /**
   * 락 획득 실패 시 자동 재시도 기능
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} lockType - 락 타입
   * @param {number} maxRetries - 최대 재시도 횟수
   * @param {number} delay - 재시도 간격 (ms)
   * @returns {Promise<Object>} - 락 정보
   */
  async acquireLockWithRetry(
    dashboardId,
    lockType,
    maxRetries = 3,
    delay = 2000
  ) {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        return await this.acquireLock(dashboardId, lockType);
      } catch (error) {
        retries++;

        // 마지막 시도가 아니면 재시도 메시지 표시
        if (retries < maxRetries && error.response?.status === 423) {
          const waitTime = delay / 1000;
          message.info(
            `편집 중인 사용자가 있습니다. ${waitTime}초 후 자동 재시도합니다.`
          );

          // 지정된 시간만큼 대기
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    throw new Error(`최대 재시도 횟수(${maxRetries})를 초과했습니다.`);
  }
}

export default new LockService();

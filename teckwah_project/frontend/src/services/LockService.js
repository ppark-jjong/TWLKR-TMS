// src/services/LockService.js
import axios from 'axios';
import message from '../utils/message';
import { MessageKeys } from '../utils/message';
import { useLogger } from '../utils/LogUtils';

/**
 * 비관적 락(Pessimistic Lock) 관리 서비스
 * 백엔드 API와의 일치성 확보 및 중앙 집중형 락 관리 로직 제공
 */
class LockService {
  constructor() {
    this.logger = useLogger('LockService');
    this.lockTimeouts = new Map(); // 락 자동 해제 타이머 관리
  }

  /**
   * 락 획득 요청
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} lockType - 락 타입 (EDIT, STATUS, ASSIGN, REMARK)
   * @returns {Promise<Object>} - 락 정보
   */
  async acquireLock(dashboardId, lockType) {
    try {
      this.logger.info(`락 획득 요청: id=${dashboardId}, type=${lockType}`);

      // 백엔드 API 명세에 맞는 엔드포인트 호출
      const response = await axios.post(`/dashboard/${dashboardId}/lock`, {
        lock_type: lockType,
      });

      if (response.data && response.data.success) {
        this.logger.info('락 획득 성공:', response.data.data);

        // 자동 해제 타이머 설정 (만료 10초 전에 알림)
        if (response.data.data.expires_at) {
          this._setupLockExpiryTimer(dashboardId, response.data.data);
        }

        return response.data.data;
      } else {
        throw new Error(response.data?.message || '락 획득에 실패했습니다');
      }
    } catch (error) {
      this.logger.error('락 획득 실패:', error);

      // 이미 락이 걸려있는 경우 (423 Locked)
      if (error.response?.status === 423) {
        const errorData = error.response.data;
        const detail = errorData?.error?.detail || errorData?.detail || {};
        const lockedBy = detail.locked_by || '다른 사용자';
        const lockType = detail.lock_type || '';

        message.error(
          `현재 ${lockedBy}님이 이 데이터를 ${this._getLockTypeText(
            lockType
          )} 중입니다. 잠시 후 다시 시도해주세요.`,
          MessageKeys.DASHBOARD.LOCK_ACQUIRE,
          5
        );
      } else {
        message.error(
          '락 획득에 실패했습니다',
          MessageKeys.DASHBOARD.LOCK_ACQUIRE
        );
      }

      throw error;
    }
  }

  /**
   * 락 해제 요청
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<boolean>} - 성공 여부
   */
  async releaseLock(dashboardId) {
    try {
      this.logger.info(`락 해제 요청: id=${dashboardId}`);

      // 자동 해제 타이머 제거
      this._clearLockExpiryTimer(dashboardId);

      const response = await axios.delete(`/dashboard/${dashboardId}/lock`);

      if (response.data && response.data.success) {
        this.logger.info('락 해제 성공');
        return true;
      } else {
        this.logger.warn('락 해제 응답이 예상과 다름:', response.data);
        return false;
      }
    } catch (error) {
      this.logger.error('락 해제 실패:', error);
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
      this.logger.info(`락 상태 확인: id=${dashboardId}`);

      const response = await axios.get(`/dashboard/${dashboardId}/lock/status`);

      if (response.data && response.data.success) {
        this.logger.debug('락 상태 확인 결과:', response.data.data);

        // 락이 있는 경우 자동 해제 타이머 설정
        if (response.data.data.is_locked && response.data.data.expires_at) {
          this._setupLockExpiryTimer(dashboardId, response.data.data);
        }

        return response.data.data;
      } else {
        return { is_locked: false };
      }
    } catch (error) {
      this.logger.error('락 상태 확인 실패:', error);
      return { is_locked: false };
    }
  }

  /**
   * 락 갱신 요청
   * 백엔드 API가 지원하는 경우 사용 가능
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<Object>} - 갱신된 락 정보
   */
  async renewLock(dashboardId) {
    try {
      this.logger.info(`락 갱신 요청: id=${dashboardId}`);

      // 현재 락 상태 확인
      const currentLock = await this.checkLockStatus(dashboardId);

      if (!currentLock || !currentLock.is_locked) {
        this.logger.warn('갱신할 락이 없습니다');
        return null;
      }

      // 갱신 엔드포인트가 있는 경우 (현재 백엔드 API에 없음)
      // const response = await axios.put(`/dashboard/${dashboardId}/lock`, {
      //   lock_type: currentLock.lock_type
      // });

      // 대체 구현: 락 해제 후 재획득
      await this.releaseLock(dashboardId);
      const renewedLock = await this.acquireLock(
        dashboardId,
        currentLock.lock_type
      );

      this.logger.info('락 갱신 성공');
      return renewedLock;
    } catch (error) {
      this.logger.error('락 갱신 실패:', error);
      throw error;
    }
  }

  /**
   * 락 만료 타이머 설정
   * @param {number} dashboardId - 대시보드 ID
   * @param {Object} lockInfo - 락 정보
   * @private
   */
  _setupLockExpiryTimer(dashboardId, lockInfo) {
    // 기존 타이머 제거
    this._clearLockExpiryTimer(dashboardId);

    if (!lockInfo.expires_at) return;

    // 만료 시간 계산
    const expiryTime = new Date(lockInfo.expires_at).getTime();
    const now = Date.now();
    let timeRemaining = expiryTime - now;

    if (timeRemaining <= 0) return;

    // 만료 1분 전 알림
    const warningTime = Math.max(0, timeRemaining - 60000);

    if (warningTime > 0) {
      const warningTimer = setTimeout(() => {
        message.warning(
          '편집 세션이 1분 후 만료됩니다. 작업을 완료하거나 저장하세요.',
          `lock-expiry-warning-${dashboardId}`
        );
      }, warningTime);

      this.lockTimeouts.set(`${dashboardId}-warning`, warningTimer);
    }

    // 실제 만료 알림
    const expiryTimer = setTimeout(() => {
      message.error(
        '편집 세션이 만료되었습니다. 편집 모드를 다시 활성화해야 합니다.',
        `lock-expiry-${dashboardId}`
      );

      // 발행-구독 패턴으로 컴포넌트에 만료 알림
      window.dispatchEvent(
        new CustomEvent('lock-expired', {
          detail: { dashboardId, lockType: lockInfo.lock_type },
        })
      );
    }, timeRemaining);

    this.lockTimeouts.set(`${dashboardId}-expiry`, expiryTimer);
  }

  /**
   * 락 만료 타이머 제거
   * @param {number} dashboardId - 대시보드 ID
   * @private
   */
  _clearLockExpiryTimer(dashboardId) {
    // 경고 타이머 제거
    const warningTimer = this.lockTimeouts.get(`${dashboardId}-warning`);
    if (warningTimer) {
      clearTimeout(warningTimer);
      this.lockTimeouts.delete(`${dashboardId}-warning`);
    }

    // 만료 타이머 제거
    const expiryTimer = this.lockTimeouts.get(`${dashboardId}-expiry`);
    if (expiryTimer) {
      clearTimeout(expiryTimer);
      this.lockTimeouts.delete(`${dashboardId}-expiry`);
    }
  }

  /**
   * 락 타입에 따른 표시 텍스트 반환
   * @param {string} lockType - 락 타입
   * @returns {string} - 표시 텍스트
   * @private
   */
  _getLockTypeText(lockType) {
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
  }
}

export default new LockService();

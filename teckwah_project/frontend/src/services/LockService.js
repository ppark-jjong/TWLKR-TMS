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
          MessageKeys.DASHBOARD.LOCK_ACQUIRE
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
   * 락 갱신 요청 (만료 시간 연장)
   * 백엔드 API가 지원하는 경우 사용 가능
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<Object>} - 갱신된 락 정보
   */
  async renewLock(dashboardId) {
    try {
      this.logger.info(`락 갱신 요청: id=${dashboardId}`);

      // 갱신 API가 없는 경우 대체 로직 (락 해제 후 재획득)
      // 실제 구현시 백엔드 API 명세에 맞게 수정 필요
      const currentLock = await this.checkLockStatus(dashboardId);

      if (!currentLock || !currentLock.is_locked) {
        this.logger.warn('갱신할 락이 없습니다');
        return null;
      }

      // 갱신 엔드포인트가 있다면 아래와 같이 구현
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

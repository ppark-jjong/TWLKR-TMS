// src/services/LockService.js - 개선된 버전
import axios from 'axios';
import message from '../utils/message';
import { useLogger } from '../utils/LogUtils';

/**
 * 락(Lock) 관리 서비스
 * 편집, 상태 변경 등의 작업 시 락 획득/해제를 관리
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

      const response = await axios.post(`/dashboard/${dashboardId}/lock`, {
        lock_type: lockType,
      });

      if (response.data && response.data.success) {
        this.logger.info('락 획득 성공:', response.data.data);
        message.success('편집 모드가 활성화되었습니다');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || '락 획득에 실패했습니다');
      }
    } catch (error) {
      this.logger.error('락 획득 실패:', error);

      // 이미 락이 걸려있는 경우 (423 Locked)
      if (error.response?.status === 423) {
        const detail = error.response.data?.error?.detail || {};
        const lockedBy = detail.locked_by || '다른 사용자';
        const lockType = detail.lock_type || '';

        message.error(
          `현재 ${lockedBy}님이 이 데이터를 ${this._getLockTypeText(
            lockType
          )} 중입니다. 잠시 후 다시 시도해주세요.`
        );
      } else {
        message.error('편집 모드 활성화에 실패했습니다');
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

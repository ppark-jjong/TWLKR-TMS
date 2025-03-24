// src/services/DashboardService.js (개선)
import ApiService from './ApiService';
import Logger from '../utils/Logger';
import { STATUS_TYPES } from '../utils/Constants';

const logger = Logger.getLogger('DashboardService');

/**
 * 대시보드 비즈니스 로직 서비스
 * API 호출 + 데이터 변환 및 가공을 담당
 */
class DashboardService {
  /**
   * 대시보드 목록 조회
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   * @returns {Promise<Object>} 대시보드 목록
   */
  async getDashboardList(startDate, endDate) {
    try {
      // 파라미터 검증
      if (!startDate || !endDate) {
        logger.warn('날짜 범위가 지정되지 않았습니다');
        return { items: [], date_range: null };
      }

      // API 호출
      const response = await ApiService.getDashboardList(startDate, endDate);

      // 목록 정렬 및 가공
      if (response && response.items) {
        response.items = this.sortDashboardsByStatus(response.items);
      }

      return response || { items: [], date_range: null };
    } catch (error) {
      logger.error('대시보드 목록 조회 실패:', error);
      return { items: [], date_range: null };
    }
  }

  /**
   * 대시보드 상세 정보 조회
   * @param {string|number} dashboardId - 대시보드 ID
   * @returns {Promise<Object>} 대시보드 상세 정보
   */
  async getDashboardDetail(dashboardId) {
    if (!dashboardId) {
      logger.warn('대시보드 ID가 지정되지 않았습니다');
      throw new Error('대시보드 ID가 필요합니다');
    }

    return await ApiService.getDashboardDetail(dashboardId);
  }

  /**
   * 대시보드 필드 업데이트
   * @param {string|number} dashboardId - 대시보드 ID
   * @param {Object} fields - 업데이트할 필드
   * @returns {Promise<Object>} 업데이트된 대시보드
   */
  async updateFields(dashboardId, fields) {
    if (!dashboardId || !fields) {
      logger.warn('필수 파라미터가 누락되었습니다');
      throw new Error('대시보드 ID와 필드는 필수입니다');
    }

    return await ApiService.updateDashboardFields(dashboardId, fields);
  }

  /**
   * 상태 업데이트
   * @param {string|number} dashboardId - 대시보드 ID
   * @param {string} status - 새 상태
   * @param {boolean} isAdmin - 관리자 권한 여부
   * @returns {Promise<Object>} 업데이트된 대시보드
   */
  async updateStatus(dashboardId, status, isAdmin = false) {
    // 상태 유효성 검증
    if (!Object.values(STATUS_TYPES).includes(status)) {
      throw new Error(`유효하지 않은 상태: ${status}`);
    }

    return await ApiService.updateStatus(dashboardId, status, isAdmin);
  }

  /**
   * 락 관련 메서드들 - 비관적 락 처리를 위한 핵심 기능
   */
  async acquireLock(dashboardId, lockType) {
    return await ApiService.acquireLock(dashboardId, lockType);
  }

  async releaseLock(dashboardId) {
    return await ApiService.releaseLock(dashboardId);
  }

  async checkLockStatus(dashboardId) {
    return await ApiService.checkLockStatus(dashboardId);
  }

  /**
   * 대시보드 정렬
   * @param {Array} dashboards - 대시보드 배열
   * @returns {Array} 정렬된 대시보드 배열
   */
  sortDashboardsByStatus(dashboards) {
    if (!Array.isArray(dashboards) || dashboards.length === 0) {
      return [];
    }

    // 상태별 정렬 우선순위
    const statusPriority = {
      [STATUS_TYPES.WAITING]: 1,
      [STATUS_TYPES.IN_PROGRESS]: 2,
      [STATUS_TYPES.COMPLETE]: 3,
      [STATUS_TYPES.ISSUE]: 4,
      [STATUS_TYPES.CANCEL]: 5,
    };

    return [...dashboards].sort((a, b) => {
      // 상태 기준 정렬
      const priorityA = statusPriority[a.status] || 999;
      const priorityB = statusPriority[b.status] || 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 같은 상태면 ETA 기준 정렬
      const etaA = a.eta ? new Date(a.eta) : new Date(9999, 11, 31);
      const etaB = b.eta ? new Date(b.eta) : new Date(9999, 11, 31);

      return etaA - etaB;
    });
  }
}

export default new DashboardService();

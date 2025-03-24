// src/services/DashboardService.js (비관적 락 처리 적용)
import ApiService from './ApiService';
import Logger from '../utils/Logger';
import { STATUS_TYPES } from '../utils/Constants';

const logger = Logger.getLogger('DashboardService');

/**
 * 대시보드 비즈니스 로직 서비스
 * 대시보드 데이터 관련 작업을 처리하는 핵심 서비스
 * 낙관적 락 관련 코드 제거 및 비관적 락 처리 강화
 */
class DashboardService {
  /**
   * 대시보드 목록 조회
   */
  async getDashboardList(startDate, endDate) {
    try {
      const response = await ApiService.getDashboardList(startDate, endDate);
      return response || { items: [], date_range: null };
    } catch (error) {
      logger.error('대시보드 목록 조회 실패:', error);
      return { items: [], date_range: null };
    }
  }

  /**
   * 주문번호로 대시보드 검색
   */
  async searchByOrderNo(orderNo) {
    try {
      const response = await ApiService.searchDashboardsByOrderNo(orderNo);
      return response || { items: [] };
    } catch (error) {
      logger.error('주문번호 검색 실패:', error);
      return { items: [] };
    }
  }

  /**
   * 대시보드 상세 정보 조회
   */
  async getDashboardDetail(dashboardId) {
    return await ApiService.getDashboardDetail(dashboardId);
  }

  /**
   * 대시보드 생성
   */
  async createDashboard(dashboardData) {
    return await ApiService.createDashboard(dashboardData);
  }

  /**
   * 대시보드 필드 업데이트 (낙관적 락 관련 client_version 파라미터 제거)
   */
  async updateFields(dashboardId, fields) {
    // 낙관적 락 관련 코드 제거
    return await ApiService.updateDashboardFields(dashboardId, fields);
  }

  /**
   * 대시보드 상태 업데이트 (관리자 권한 포함 처리)
   */
  async updateStatus(dashboardId, status, isAdmin = false) {
    // 낙관적 락 관련 코드 제거
    return await ApiService.updateStatus(dashboardId, status, isAdmin);
  }

  /**
   * 배차 처리
   */
  async assignDriver(driverData) {
    return await ApiService.assignDriver(driverData);
  }

  /**
   * 대시보드 삭제
   */
  async deleteDashboards(dashboardIds) {
    return await ApiService.deleteDashboards(dashboardIds);
  }

  /**
   * 메모 생성
   */
  async createRemark(dashboardId, content) {
    return await ApiService.createRemark(dashboardId, content);
  }

  /**
   * 메모 업데이트
   */
  async updateRemark(dashboardId, remarkId, content) {
    return await ApiService.updateRemark(dashboardId, remarkId, content);
  }

  /**
   * 메모 삭제
   */
  async deleteRemark(dashboardId, remarkId) {
    return await ApiService.deleteRemark(dashboardId, remarkId);
  }

  /**
   * 락 획득
   */
  async acquireLock(dashboardId, lockType) {
    return await ApiService.acquireLock(dashboardId, lockType);
  }

  /**
   * 락 해제
   */
  async releaseLock(dashboardId) {
    return await ApiService.releaseLock(dashboardId);
  }

  /**
   * 락 상태 확인
   */
  async checkLockStatus(dashboardId) {
    return await ApiService.checkLockStatus(dashboardId);
  }

  /**
   * 대시보드 정렬
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
      // 먼저 상태 기준으로 정렬
      const priorityA = statusPriority[a.status] || 999;
      const priorityB = statusPriority[b.status] || 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 같은 상태면 ETA 기준으로 정렬
      const etaA = a.eta ? new Date(a.eta) : new Date(9999, 11, 31);
      const etaB = b.eta ? new Date(b.eta) : new Date(9999, 11, 31);

      return etaA - etaB;
    });
  }
}

export default new DashboardService();

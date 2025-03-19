// src/services/DashboardService.js - 개선된 버전
import axios from 'axios';
import message from '../utils/message';
import { MessageKeys, MessageTemplates } from '../utils/message';
import ErrorHandler from '../utils/ErrorHandler';
import { useLogger } from '../utils/LogUtils';

/**
 * 대시보드 서비스 클래스
 * 백엔드 API와의 통신 및 데이터 처리를 담당하는 서비스 계층
 */
class DashboardService {
  constructor() {
    this.logger = useLogger('DashboardService');
  }

  /**
   * 대시보드 목록 조회 (ETA 기준)
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   * @returns {Promise<Object>} - 대시보드 항목 배열과 날짜 범위 정보
   */
  async getDashboardList(startDate, endDate) {
    try {
      // 날짜 형식 확인
      const formattedStartDate = startDate.format('YYYY-MM-DD');
      const formattedEndDate = endDate.format('YYYY-MM-DD');
      this.logger.debug(
        '요청 날짜 범위:',
        formattedStartDate,
        '~',
        formattedEndDate
      );

      // API 요청 실행
      const response = await axios.get('/dashboard/list', {
        params: {
          start_date: formattedStartDate,
          end_date: formattedEndDate,
        },
      });

      this.logger.debug('대시보드 목록 응답:', response.data);

      // 백엔드 API 응답 구조에 맞춰 반환
      if (response.data && response.data.success) {
        return response.data.data || { items: [] };
      } else {
        this.logger.warn('API 응답 형식이 예상과 다름:', response.data);
        return { items: [] };
      }
    } catch (error) {
      this.logger.error('대시보드 목록 조회 실패:', error);
      ErrorHandler.handle(error, 'dashboard-list');
      return { items: [] };
    }
  }

  /**
   * 대시보드 검색 API 호출 (주문번호 기준)
   * @param {string} orderNo - 검색할 주문번호
   * @returns {Promise<Object>} - 검색 결과
   */
  async searchDashboardsByOrderNo(orderNo) {
    try {
      this.logger.info('주문번호 검색 요청:', orderNo);

      // 검색어가 없는 경우 빈 배열 반환
      if (!orderNo || !orderNo.trim()) {
        return { items: [] };
      }

      // API 호출 실행
      const response = await axios.get('/dashboard/search', {
        params: { order_no: orderNo.trim() },
      });

      this.logger.debug('주문번호 검색 응답:', response.data);

      if (response.data && response.data.success) {
        return response.data.data || { items: [] };
      } else {
        return { items: [] };
      }
    } catch (error) {
      this.logger.error('주문번호 검색 실패:', error);
      ErrorHandler.handle(error, 'dashboard-search');
      return { items: [] };
    }
  }

  /**
   * 대시보드 상세 정보 조회
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<Object>} - 대시보드 상세 정보
   */
  async getDashboardDetail(dashboardId) {
    try {
      this.logger.debug(`대시보드 상세 조회 요청: id=${dashboardId}`);

      // API 요청 실행
      const response = await axios.get(`/dashboard/${dashboardId}`);

      this.logger.debug('대시보드 상세 정보 응답:', response.data);

      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error('상세 정보 조회에 실패했습니다');
      }
    } catch (error) {
      this.logger.error('대시보드 상세 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 대시보드 생성
   * @param {Object} dashboardData - 생성할 대시보드 데이터
   * @returns {Promise<Object>} - 생성된 대시보드 정보
   */
  async createDashboard(dashboardData) {
    try {
      this.logger.info('대시보드 생성 요청 데이터:', dashboardData);

      // 날짜 형식 변환 (필요시)
      const processedData = this._processDateFields(dashboardData);

      const response = await axios.post('/dashboard', processedData);
      this.logger.debug('대시보드 생성 응답:', response.data);

      if (response.data && response.data.success) {
        message.success(MessageTemplates.DASHBOARD.CREATE_SUCCESS);
        return response.data.data;
      } else {
        throw new Error(
          response.data?.message || '대시보드 생성에 실패했습니다'
        );
      }
    } catch (error) {
      this.logger.error('대시보드 생성 실패:', error);
      ErrorHandler.handle(error, 'dashboard-create');
      throw error;
    }
  }

  /**
   * 상태 업데이트
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} status - 변경할 상태
   * @param {boolean} isAdmin - 관리자 여부
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateStatus(dashboardId, status, isAdmin = false) {
    try {
      this.logger.info(
        `상태 업데이트 요청: id=${dashboardId}, status=${status}, isAdmin=${isAdmin}`
      );

      const response = await axios.patch(`/dashboard/${dashboardId}/status`, {
        status,
        is_admin: isAdmin,
      });

      this.logger.debug('상태 업데이트 응답:', response.data);

      if (response.data && response.data.success) {
        message.success(MessageTemplates.DASHBOARD.STATUS_SUCCESS(status));
        return response.data.data;
      } else {
        throw new Error(
          response.data?.message || '상태 업데이트에 실패했습니다'
        );
      }
    } catch (error) {
      this.logger.error('상태 업데이트 실패:', error);
      ErrorHandler.handle(error, 'status-update');
      throw error;
    }
  }

  /**
   * 대시보드 필드 업데이트
   * @param {number} dashboardId - 대시보드 ID
   * @param {Object} fields - 업데이트할 필드 데이터
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateDashboardFields(dashboardId, fields) {
    try {
      this.logger.info(`필드 업데이트 요청: id=${dashboardId}`, fields);

      // 날짜 필드 처리
      const processedFields = this._processDateFields(fields);

      const response = await axios.patch(
        `/dashboard/${dashboardId}/fields`,
        processedFields
      );

      this.logger.debug('필드 업데이트 응답:', response.data);

      if (response.data && response.data.success) {
        message.success('필드가 업데이트되었습니다');
        return response.data.data;
      } else {
        throw new Error(
          response.data?.message || '필드 업데이트에 실패했습니다'
        );
      }
    } catch (error) {
      this.logger.error('필드 업데이트 실패:', error);
      ErrorHandler.handle(error, 'fields-update');
      throw error;
    }
  }

  /**
   * 메모 업데이트
   * @param {number} dashboardId - 대시보드 ID
   * @param {number} remarkId - 메모 ID
   * @param {string} content - 메모 내용
   * @returns {Promise<Object>} - 업데이트된 메모 정보
   */
  async updateRemark(dashboardId, remarkId, content) {
    try {
      this.logger.info(
        `메모 업데이트 요청: id=${dashboardId}, remarkId=${remarkId}`
      );

      const response = await axios.patch(
        `/dashboard/${dashboardId}/remarks/${remarkId}`,
        { content }
      );

      this.logger.debug('메모 업데이트 응답:', response.data);

      if (response.data) {
        message.success('메모가 업데이트되었습니다');
        return response.data;
      } else {
        throw new Error('메모 업데이트에 실패했습니다');
      }
    } catch (error) {
      this.logger.error('메모 업데이트 실패:', error);
      ErrorHandler.handle(error, 'remark-update');
      throw error;
    }
  }

  /**
   * 배차 처리 함수
   * @param {Object} driverData - 배차 정보 (dashboard_ids, driver_name, driver_contact)
   * @returns {Promise<Array>} - 업데이트된 대시보드 배열
   */
  async assignDriver(driverData) {
    try {
      this.logger.info('배차 요청:', driverData);

      const response = await axios.post('/dashboard/assign', driverData);

      this.logger.debug('배차 응답:', response.data);

      if (response.data && response.data.success) {
        message.success(MessageTemplates.DASHBOARD.ASSIGN_SUCCESS);
        return response.data.data?.updated_dashboards || [];
      } else {
        throw new Error(response.data?.message || '배차 처리에 실패했습니다');
      }
    } catch (error) {
      this.logger.error('배차 처리 실패:', error);
      ErrorHandler.handle(error, 'assign-driver');
      throw error;
    }
  }

  /**
   * 대시보드 삭제 (관리자 전용)
   * @param {Array<number>} dashboardIds - 삭제할 대시보드 ID 배열
   * @returns {Promise<boolean>} - 삭제 성공 여부
   */
  async deleteDashboards(dashboardIds) {
    try {
      this.logger.info('삭제 요청 ID 목록:', dashboardIds);

      const response = await axios.delete('/dashboard', {
        data: { dashboard_ids: dashboardIds },
      });

      this.logger.debug('삭제 응답:', response.data);

      if (response.data && response.data.success) {
        message.success(MessageTemplates.DASHBOARD.DELETE_SUCCESS);
        return true;
      } else {
        throw new Error(
          response.data?.message || '대시보드 삭제에 실패했습니다'
        );
      }
    } catch (error) {
      this.logger.error('대시보드 삭제 실패:', error);
      ErrorHandler.handle(error, 'dashboard-delete');
      throw error;
    }
  }

  /**
   * 날짜 범위 조회
   * @returns {Promise<Object>} - 조회 가능한 날짜 범위
   */
  async getDateRange() {
    try {
      const response = await axios.get('/visualization/date_range');
      this.logger.debug('날짜 범위 조회 응답:', response.data);

      if (response.data && response.data.success) {
        return (
          response.data.date_range || {
            oldest_date: new Date().toISOString().split('T')[0],
            latest_date: new Date().toISOString().split('T')[0],
          }
        );
      } else {
        return {
          oldest_date: new Date().toISOString().split('T')[0],
          latest_date: new Date().toISOString().split('T')[0],
        };
      }
    } catch (error) {
      this.logger.error('날짜 범위 조회 실패:', error);
      return {
        oldest_date: new Date().toISOString().split('T')[0],
        latest_date: new Date().toISOString().split('T')[0],
      };
    }
  }

  /**
   * 날짜 필드 처리 (ISO 형식 변환)
   * @param {Object} data - 처리할 데이터 객체
   * @returns {Object} - 처리된 데이터 객체
   * @private
   */
  _processDateFields(data) {
    if (!data) return data;

    const processed = { ...data };

    // eta 필드가 객체인 경우 (dayjs 또는 Date) ISO 문자열로 변환
    if (processed.eta && typeof processed.eta === 'object') {
      if (processed.eta.format) {
        // dayjs 객체인 경우
        processed.eta = processed.eta.format();
      } else if (processed.eta.toISOString) {
        // Date 객체인 경우
        processed.eta = processed.eta.toISOString();
      }
    }

    return processed;
  }
}

export default new DashboardService();

// src/services/DashboardService.js
import axios from 'axios';
import message from '../utils/message';
import { MessageKeys, MessageTemplates } from '../utils/message';
import ErrorHandler from '../utils/ErrorHandler';
import { useLogger } from '../utils/LogUtils';

/**
 * 대시보드 서비스 클래스
 * 백엔드 API와의 통신 및 데이터 처리를 담당하는 서비스 계층
 * 백엔드 API 명세와 일치하는 요청/응답 구조 제공
 */
class DashboardService {
  constructor() {
    this.logger = useLogger('DashboardService');
  }

  /**
   * 대시보드 목록 조회 (ETA 기준)
   * GET /dashboard/list
   *
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   * @returns {Promise<Object>} - 대시보드 목록 및 날짜 범위 정보
   */
  async getDashboardList(startDate, endDate) {
    try {
      // 날짜 형식 검증 및 변환
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

      // 백엔드 API 응답 구조에 맞게 데이터 반환
      // 성공 응답 형식: { success: true, message: "메시지", data: { ... } }
      if (response.data && response.data.success) {
        return (
          response.data.data || {
            date_range: null,
            items: [],
            user_role: '',
            is_admin: false,
          }
        );
      } else {
        this.logger.warn('API 응답 형식이 예상과 다름:', response.data);
        return {
          date_range: null,
          items: [],
          user_role: '',
          is_admin: false,
        };
      }
    } catch (error) {
      this.logger.error('대시보드 목록 조회 실패:', error);
      ErrorHandler.handle(error, 'dashboard-list');
      return {
        date_range: null,
        items: [],
        user_role: '',
        is_admin: false,
      };
    }
  }

  /**
   * 대시보드 검색 API 호출 (주문번호 기준)
   * GET /dashboard/search
   *
   * @param {string} orderNo - 검색할 주문번호
   * @returns {Promise<Object>} - 검색 결과
   */
  async searchDashboardsByOrderNo(orderNo) {
    try {
      this.logger.info('주문번호 검색 요청:', orderNo);

      // 검색어가 없는 경우 빈 배열 반환
      if (!orderNo || !orderNo.trim()) {
        return {
          date_range: null,
          items: [],
          user_role: '',
          is_admin: false,
        };
      }

      // API 호출 실행
      const response = await axios.get('/dashboard/search', {
        params: { order_no: orderNo.trim() },
      });

      this.logger.debug('주문번호 검색 응답:', response.data);

      // 백엔드 API 응답 구조에 맞게 데이터 반환
      if (response.data && response.data.success) {
        return (
          response.data.data || {
            date_range: null,
            items: [],
            user_role: '',
            is_admin: false,
          }
        );
      } else {
        return {
          date_range: null,
          items: [],
          user_role: '',
          is_admin: false,
        };
      }
    } catch (error) {
      this.logger.error('주문번호 검색 실패:', error);
      ErrorHandler.handle(error, 'dashboard-search');
      return {
        date_range: null,
        items: [],
        user_role: '',
        is_admin: false,
      };
    }
  }

  /**
   * 대시보드 상세 정보 조회
   * GET /dashboard/{dashboard_id}
   *
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<Object>} - 대시보드 상세 정보
   */
  async getDashboardDetail(dashboardId) {
    try {
      this.logger.debug(`대시보드 상세 조회 요청: id=${dashboardId}`);

      // API 요청 실행
      const response = await axios.get(`/dashboard/${dashboardId}`);

      this.logger.debug('대시보드 상세 정보 응답:', response.data);

      // 백엔드 API 응답 구조에 맞게 데이터 반환
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
   * POST /dashboard
   *
   * @param {Object} dashboardData - 생성할 대시보드 데이터
   * @returns {Promise<Object>} - 생성된 대시보드 정보
   */
  async createDashboard(dashboardData) {
    try {
      this.logger.info('대시보드 생성 요청 데이터:', dashboardData);

      // 날짜 형식 변환 (필요시)
      const processedData = this._processDateFields(dashboardData);

      // API 요청 실행
      const response = await axios.post('/dashboard', processedData);
      this.logger.debug('대시보드 생성 응답:', response.data);

      // 백엔드 API 응답 구조에 맞게 데이터 반환
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
   * PATCH /dashboard/{dashboard_id}/status
   *
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} status - 변경할 상태 (WAITING, IN_PROGRESS, COMPLETE, ISSUE, CANCEL)
   * @param {boolean} isAdmin - 관리자 여부
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateStatus(dashboardId, status, isAdmin = false) {
    try {
      this.logger.info(
        `상태 업데이트 요청: id=${dashboardId}, status=${status}, isAdmin=${isAdmin}`
      );

      // API 요청 실행 - 비관적 락 메커니즘 적용됨
      const response = await axios.patch(`/dashboard/${dashboardId}/status`, {
        status,
        is_admin: isAdmin,
      });

      this.logger.debug('상태 업데이트 응답:', response.data);

      // 백엔드 API 응답 구조에 맞게 데이터 반환
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
   * PATCH /dashboard/{dashboard_id}/fields
   *
   * @param {number} dashboardId - 대시보드 ID
   * @param {Object} fields - 업데이트할 필드 데이터
   * @param {number} clientVersion - 클라이언트가 알고 있는 버전 (낙관적 락)
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateDashboardFields(dashboardId, fields, clientVersion = null) {
    try {
      this.logger.info(`필드 업데이트 요청: id=${dashboardId}`, fields);

      // 날짜 필드 처리
      const processedFields = this._processDateFields(fields);

      // 요청 데이터 구성
      const requestData = {
        ...processedFields,
      };

      // 낙관적 락을 위해 클라이언트 버전 포함 (백엔드에서 지원하는 경우)
      if (clientVersion) {
        requestData.client_version = clientVersion;
      }

      // API 요청 실행 - 비관적 락 메커니즘 적용됨
      const response = await axios.patch(
        `/dashboard/${dashboardId}/fields`,
        requestData
      );

      this.logger.debug('필드 업데이트 응답:', response.data);

      // 백엔드 API 응답 구조에 맞게 데이터 반환
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

      // 낙관적 락 충돌 (409 Conflict) 감지 및 처리
      if (error.response?.status === 409) {
        message.error(
          '다른 사용자가 이미 이 데이터를 수정했습니다',
          MessageKeys.DASHBOARD.OPTIMISTIC_LOCK
        );

        // 최신 버전 정보 추출
        const versionInfo = error.response?.data?.version_info;
        if (versionInfo && versionInfo.current_version) {
          this.logger.warn(
            `낙관적 락 충돌: 서버 버전 ${versionInfo.current_version}`
          );
        }
      } else {
        ErrorHandler.handle(error, 'fields-update');
      }

      throw error;
    }
  }

  /**
   * 메모 업데이트
   * PATCH /dashboard/{dashboard_id}/remarks/{remark_id}
   *
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

      // API 요청 실행 - 비관적 락 메커니즘 적용됨
      const response = await axios.patch(
        `/dashboard/${dashboardId}/remarks/${remarkId}`,
        { content }
      );

      this.logger.debug('메모 업데이트 응답:', response.data);

      // 백엔드 API 응답 구조에 맞게 데이터 반환
      if (response.data && response.data.success) {
        message.success('메모가 업데이트되었습니다');
        return response.data.data;
      } else {
        throw new Error(
          response.data?.message || '메모 업데이트에 실패했습니다'
        );
      }
    } catch (error) {
      this.logger.error('메모 업데이트 실패:', error);
      ErrorHandler.handle(error, 'remark-update');
      throw error;
    }
  }

  /**
   * 메모 생성
   * POST /dashboard/{dashboard_id}/remarks
   *
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} content - 메모 내용
   * @returns {Promise<Object>} - 생성된 메모 정보
   */
  async createRemark(dashboardId, content) {
    try {
      this.logger.info(`메모 생성 요청: id=${dashboardId}`);

      // API 요청 실행 - 비관적 락 메커니즘 적용됨
      const response = await axios.post(`/dashboard/${dashboardId}/remarks`, {
        content,
      });

      this.logger.debug('메모 생성 응답:', response.data);

      // 백엔드 API 응답 구조에 맞게 데이터 반환
      if (response.data && response.data.success) {
        message.success('메모가 생성되었습니다');
        return response.data.data;
      } else {
        throw new Error(response.data?.message || '메모 생성에 실패했습니다');
      }
    } catch (error) {
      this.logger.error('메모 생성 실패:', error);
      ErrorHandler.handle(error, 'remark-create');
      throw error;
    }
  }

  /**
   * 메모 삭제
   * DELETE /dashboard/{dashboard_id}/remarks/{remark_id}
   *
   * @param {number} dashboardId - 대시보드 ID
   * @param {number} remarkId - 메모 ID
   * @returns {Promise<boolean>} - 삭제 성공 여부
   */
  async deleteRemark(dashboardId, remarkId) {
    try {
      this.logger.info(
        `메모 삭제 요청: id=${dashboardId}, remarkId=${remarkId}`
      );

      // API 요청 실행 - 비관적 락 메커니즘 적용됨
      const response = await axios.delete(
        `/dashboard/${dashboardId}/remarks/${remarkId}`
      );

      this.logger.debug('메모 삭제 응답:', response.data);

      // 백엔드 API 응답 구조에 맞게 데이터 반환
      if (response.data && response.data.success) {
        message.success('메모가 삭제되었습니다');
        return true;
      } else {
        throw new Error(response.data?.message || '메모 삭제에 실패했습니다');
      }
    } catch (error) {
      this.logger.error('메모 삭제 실패:', error);
      ErrorHandler.handle(error, 'remark-delete');
      throw error;
    }
  }

  /**
   * 배차 처리 함수
   * POST /dashboard/assign
   *
   * @param {Object} driverData - 배차 정보 (dashboard_ids, driver_name, driver_contact)
   * @param {Object} clientVersions - 각 대시보드의 클라이언트 버전 (낙관적 락)
   * @returns {Promise<Array>} - 업데이트된 대시보드 배열
   */
  async assignDriver(driverData, clientVersions = {}) {
    try {
      this.logger.info('배차 요청:', driverData);

      // 요청 데이터 구성
      const requestData = {
        ...driverData,
      };

      // 낙관적 락을 위해 클라이언트 버전 포함 (백엔드에서 지원하는 경우)
      if (Object.keys(clientVersions).length > 0) {
        requestData.client_versions = clientVersions;
      }

      // API 요청 실행
      const response = await axios.post('/dashboard/assign', requestData);

      this.logger.debug('배차 응답:', response.data);

      // 백엔드 API 응답 구조에 맞게 데이터 반환
      if (response.data && response.data.success) {
        message.success(MessageTemplates.DASHBOARD.ASSIGN_SUCCESS);
        return response.data.data?.updated_dashboards || [];
      } else {
        throw new Error(response.data?.message || '배차 처리에 실패했습니다');
      }
    } catch (error) {
      this.logger.error('배차 처리 실패:', error);

      // 낙관적 락 충돌 (409 Conflict) 감지 및 처리
      if (error.response?.status === 409) {
        const conflictDetail = error.response?.data?.error?.detail || {};
        const conflictedOrders = conflictDetail.conflicted_orders || [];

        if (conflictedOrders.length > 0) {
          message.error(
            `다음 주문이 이미 수정되었습니다: ${conflictedOrders.join(', ')}`,
            MessageKeys.DASHBOARD.OPTIMISTIC_LOCK
          );
        } else {
          message.error(
            '다른 사용자가 이미 이 데이터를 수정했습니다',
            MessageKeys.DASHBOARD.OPTIMISTIC_LOCK
          );
        }
      } else if (error.response?.status === 423) {
        // 비관적 락 충돌 (423 Locked) 감지 및 처리
        const lockDetail = error.response?.data?.error?.detail || {};
        const lockedBy = lockDetail.locked_by || '다른 사용자';
        const lockType = lockDetail.lock_type || '';

        message.error(
          `현재 ${lockedBy}님이 ${this._getLockTypeText(lockType)} 중입니다`,
          MessageKeys.DASHBOARD.PESSIMISTIC_LOCK
        );
      } else {
        ErrorHandler.handle(error, 'assign-driver');
      }

      throw error;
    }
  }

  /**
   * 대시보드 삭제 (관리자 전용)
   * DELETE /dashboard
   *
   * @param {Array<number>} dashboardIds - 삭제할 대시보드 ID 배열
   * @returns {Promise<boolean>} - 삭제 성공 여부
   */
  async deleteDashboards(dashboardIds) {
    try {
      this.logger.info('삭제 요청 ID 목록:', dashboardIds);

      // API 요청 실행
      const response = await axios.delete('/dashboard', {
        data: { dashboard_ids: dashboardIds },
      });

      this.logger.debug('삭제 응답:', response.data);

      // 백엔드 API 응답 구조에 맞게 데이터 반환
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

      // 권한 오류 (403 Forbidden) 감지 및 처리
      if (error.response?.status === 403) {
        message.error(
          '삭제 권한이 없습니다. 관리자만 이 기능을 사용할 수 있습니다.',
          MessageKeys.DASHBOARD.DELETE
        );
      } else {
        ErrorHandler.handle(error, 'dashboard-delete');
      }

      throw error;
    }
  }

  /**
   * 날짜 범위 조회
   * GET /visualization/date_range
   *
   * @returns {Promise<Object>} - 조회 가능한 날짜 범위
   */
  async getDateRange() {
    try {
      // 시각화 서비스 API 호출 (데이터 범위 조회)
      const response = await axios.get('/visualization/date_range');
      this.logger.debug('날짜 범위 조회 응답:', response.data);

      // 백엔드 API 응답 구조에 맞게 데이터 반환
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
   * 대시보드 목록 정렬 기능
   * 백엔드 API에서 정렬된 결과를 반환하지만, 클라이언트 측에서도 추가 정렬을 위해 사용
   *
   * @param {Array} dashboards - 대시보드 목록
   * @returns {Array} - 정렬된 대시보드 목록
   */
  sortDashboardsByStatus(dashboards) {
    if (!Array.isArray(dashboards) || dashboards.length === 0) {
      return [];
    }

    // 상태별 정렬 우선순위 설정
    const statusPriority = {
      WAITING: 1,
      IN_PROGRESS: 2,
      COMPLETE: 3,
      ISSUE: 4,
      CANCEL: 5,
    };

    // 상태별 그룹화 후 ETA 기준 정렬
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

  /**
   * 락 타입에 따른 표시 텍스트 반환
   * @private
   *
   * @param {string} lockType - 락 타입 (EDIT, STATUS, ASSIGN, REMARK)
   * @returns {string} - 표시 텍스트
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

  /**
   * 날짜 필드 처리 (ISO 형식 변환)
   * @private
   *
   * @param {Object} data - 처리할 데이터 객체
   * @returns {Object} - 처리된 데이터 객체
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

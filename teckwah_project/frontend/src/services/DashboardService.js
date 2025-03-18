// src/services/DashboardService.js
import axios from 'axios';
import message, { MessageKeys, MessageTemplates } from '../utils/message';
import ErrorHandler from '../utils/ErrorHandler';
import TokenManager from '../utils/TokenManager';
import { useLogger } from '../utils/LogUtils';

/**
 * 대시보드 서비스 클래스
 * 백엔드 API와의 통신 및 데이터 처리를 담당하는 서비스 계층
 * 낙관적/비관적 락 통합 지원 및 권한 기반 데이터 처리
 */
class DashboardService {
  constructor() {
    this.logger = useLogger('DashboardService');
    this.cancelTokens = new Map();
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

      // 이전 요청 취소 (중복 요청 방지)
      this._cancelPreviousRequest('dashboard-list');
      const cancelToken = axios.CancelToken.source();
      this.cancelTokens.set('dashboard-list', cancelToken);

      // 타임아웃 설정
      const timeoutId = setTimeout(() => {
        cancelToken.cancel('조회 요청 타임아웃');
        this.cancelTokens.delete('dashboard-list');
      }, 30000);

      // API 요청 실행
      const response = await axios.get('/dashboard/list', {
        params: {
          start_date: formattedStartDate,
          end_date: formattedEndDate,
        },
        cancelToken: cancelToken.token,
      });

      // 타임아웃 해제
      clearTimeout(timeoutId);
      this.cancelTokens.delete('dashboard-list');

      this.logger.debug('대시보드 목록 응답:', response.data);

      // 응답 데이터 정규화
      return this._normalizeListResponse(response.data);
    } catch (error) {
      // 요청 취소인 경우 별도 처리
      if (axios.isCancel(error)) {
        this.logger.info('조회 요청이 취소되었습니다:', error.message);
        return { items: [], date_range: null };
      }

      this.logger.error(
        '대시보드 목록 조회 실패:',
        error.response?.data || error
      );
      throw error;
    }
  }

  /**
   * 대시보드 검색 API 호출 (주문번호 기준)
   * @param {string} orderNo - 검색할 주문번호
   * @returns {Promise<Array>} - 검색 결과 배열
   */
  async searchDashboardsByOrderNo(orderNo) {
    try {
      this.logger.info('주문번호 검색 요청:', orderNo);

      // 검색어가 없는 경우 빈 배열 반환
      if (!orderNo || !orderNo.trim()) {
        return { items: [], date_range: null };
      }

      // 이전 요청 취소 (중복 요청 방지)
      this._cancelPreviousRequest('dashboard-search');
      const cancelToken = axios.CancelToken.source();
      this.cancelTokens.set('dashboard-search', cancelToken);

      // API 호출 실행
      const response = await axios.get('/dashboard/search', {
        params: { order_no: orderNo.trim() },
        cancelToken: cancelToken.token,
      });

      this.cancelTokens.delete('dashboard-search');
      this.logger.debug('주문번호 검색 응답:', response.data);

      // 응답 데이터 정규화
      const normalizedResponse = this._normalizeListResponse(response.data);

      // 항상 정렬된 결과 반환
      if (normalizedResponse && normalizedResponse.items) {
        normalizedResponse.items = this._sortDashboardsByStatus(
          normalizedResponse.items
        );
      }

      return normalizedResponse;
    } catch (error) {
      // 요청 취소인 경우 별도 처리
      if (axios.isCancel(error)) {
        this.logger.info('검색 요청이 취소되었습니다:', error.message);
        return { items: [], date_range: null };
      }

      this.logger.error('주문번호 검색 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 대시보드 상세 정보 조회 (낙관적 락 버전 지원)
   * @param {number} dashboardId - 대시보드 ID
   * @param {number} clientVersion - 클라이언트 알고 있는 버전 (선택적)
   * @returns {Promise<Object>} - 대시보드 상세 정보
   */
  async getDashboardDetail(dashboardId, clientVersion) {
    try {
      this.logger.debug(
        `대시보드 상세 조회 요청: id=${dashboardId}, version=${
          clientVersion || 'none'
        }`
      );

      // 중복 요청 방지
      this._cancelPreviousRequest(`dashboard-detail-${dashboardId}`);
      const cancelToken = axios.CancelToken.source();
      this.cancelTokens.set(`dashboard-detail-${dashboardId}`, cancelToken);

      // 버전 정보 포함 요청 (낙관적 락)
      const params = clientVersion ? { client_version: clientVersion } : {};

      // API 요청 실행
      const response = await axios.get(`/dashboard/${dashboardId}`, {
        params,
        cancelToken: cancelToken.token,
      });

      this.cancelTokens.delete(`dashboard-detail-${dashboardId}`);
      this.logger.debug('대시보드 상세 정보 응답:', response.data);

      // 응답 유효성 검증
      this._validateResponse(response.data, '상세 정보 조회');

      // 버전 정보 추출 및 포함
      const result = response.data.data;
      const versionInfo = response.data.version_info || {
        current_version: result.version,
      };
      const isLatest = response.data.is_latest !== false;

      return {
        ...result,
        _versionInfo: versionInfo,
        _isLatest: isLatest,
      };
    } catch (error) {
      this.logger.error(
        '대시보드 상세 조회 실패:',
        error.response?.data || error
      );

      // 낙관적 락 충돌 특수 처리
      if (error.response?.status === 409) {
        error.isOptimisticLockError = true;
        error.currentVersion =
          error.response?.data?.version_info?.current_version;
        error.latestData = error.response?.data?.data;
      }

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

      // 응답 유효성 검증
      this._validateResponse(response.data, '대시보드 생성');

      return response.data.data;
    } catch (error) {
      this.logger.error('대시보드 생성 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 상태 업데이트 (낙관적 락 적용)
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} status - 변경할 상태
   * @param {boolean} isAdmin - 관리자 여부
   * @param {number} clientVersion - 클라이언트 버전 (낙관적 락)
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateStatus(dashboardId, status, isAdmin = false, clientVersion) {
    try {
      this.logger.info(
        `상태 업데이트 요청: id=${dashboardId}, status=${status}, isAdmin=${isAdmin}, version=${
          clientVersion || 'none'
        }`
      );

      // 버전 정보 포함 요청 (낙관적 락)
      const params = clientVersion ? { client_version: clientVersion } : {};

      const response = await axios.patch(
        `/dashboard/${dashboardId}/status`,
        {
          status,
          is_admin: isAdmin,
        },
        { params }
      );

      this.logger.debug('상태 업데이트 응답:', response.data);

      // 응답 유효성 검증
      this._validateResponse(response.data, '상태 업데이트');

      // 버전 정보 추출 및 포함
      const result = response.data.data;
      const versionInfo = response.data.version_info || {
        current_version: result.version,
      };

      return {
        ...result,
        _versionInfo: versionInfo,
      };
    } catch (error) {
      this.logger.error('상태 업데이트 실패:', error.response?.data || error);

      // 낙관적 락 충돌 특수 처리
      if (error.response?.status === 409) {
        error.isOptimisticLockError = true;
        error.currentVersion =
          error.response?.data?.version_info?.current_version;
        error.latestData = error.response?.data?.data;
      }

      throw error;
    }
  }

  /**
   * 비관적 락 획득 후 상태 변경 처리 (통합 락 처리)
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} status - 변경할 상태
   * @param {boolean} isAdmin - 관리자 여부
   * @param {number} clientVersion - 클라이언트 버전 (낙관적 락)
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateStatusWithLock(
    dashboardId,
    status,
    isAdmin = false,
    clientVersion
  ) {
    try {
      // 1. 먼저 비관적 락 획득 시도
      const LockService = (await import('./LockService')).default;
      await LockService.acquireLock(dashboardId, 'STATUS');

      try {
        // 2. 상태 변경 API 호출 (낙관적 락 버전 포함)
        return await this.updateStatus(
          dashboardId,
          status,
          isAdmin,
          clientVersion
        );
      } finally {
        // 3. 락 해제 (성공/실패 상관없이)
        await LockService.releaseLock(dashboardId);
      }
    } catch (error) {
      // 비관적 락 획득 실패 처리
      if (error.response?.status === 423) {
        this.logger.error('비관적 락 획득 실패:', error.response?.data);

        // 에러 객체에 추가 정보 부여
        error.isPessimisticLockError = true;
        error.lockedBy = error.response?.data?.error?.detail?.locked_by;
        error.lockType = error.response?.data?.error?.detail?.lock_type;
      }

      throw error;
    }
  }

  /**
   * 대시보드 필드 업데이트 (낙관적 락 적용)
   * @param {number} dashboardId - 대시보드 ID
   * @param {Object} fields - 업데이트할 필드 데이터
   * @param {number} clientVersion - 클라이언트 버전 (낙관적 락)
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateDashboardFields(dashboardId, fields, clientVersion) {
    try {
      this.logger.info(
        `필드 업데이트 요청: id=${dashboardId}, version=${
          clientVersion || 'none'
        }`,
        fields
      );

      // 날짜 필드 처리
      const processedFields = this._processDateFields(fields);

      // 버전 정보 포함 요청 (낙관적 락)
      const params = clientVersion ? { client_version: clientVersion } : {};

      const response = await axios.patch(
        `/dashboard/${dashboardId}/fields`,
        processedFields,
        { params }
      );

      this.logger.debug('필드 업데이트 응답:', response.data);

      // 응답 유효성 검증
      this._validateResponse(response.data, '필드 업데이트');

      // 버전 정보 추출 및 포함
      const result = response.data.data;
      const versionInfo = response.data.version_info || {
        current_version: result.version,
      };

      return {
        ...result,
        _versionInfo: versionInfo,
      };
    } catch (error) {
      this.logger.error('필드 업데이트 실패:', error.response?.data || error);

      // 낙관적 락 충돌 특수 처리
      if (error.response?.status === 409) {
        error.isOptimisticLockError = true;
        error.currentVersion =
          error.response?.data?.version_info?.current_version;
        error.latestData = error.response?.data?.data;
      }

      throw error;
    }
  }

  /**
   * 비관적 락 획득 후 필드 업데이트 처리 (통합 락 처리)
   * @param {number} dashboardId - 대시보드 ID
   * @param {Object} fields - 업데이트할 필드 데이터
   * @param {number} clientVersion - 클라이언트 버전 (낙관적 락)
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateFieldsWithLock(dashboardId, fields, clientVersion) {
    try {
      // 1. 먼저 비관적 락 획득 시도
      const LockService = (await import('./LockService')).default;
      await LockService.acquireLock(dashboardId, 'EDIT');

      try {
        // 2. 필드 업데이트 API 호출 (낙관적 락 버전 포함)
        return await this.updateDashboardFields(
          dashboardId,
          fields,
          clientVersion
        );
      } finally {
        // 3. 락 해제 (성공/실패 상관없이)
        await LockService.releaseLock(dashboardId);
      }
    } catch (error) {
      // 비관적 락 획득 실패 처리
      if (error.response?.status === 423) {
        this.logger.error('비관적 락 획득 실패:', error.response?.data);

        // 에러 객체에 추가 정보 부여
        error.isPessimisticLockError = true;
        error.lockedBy = error.response?.data?.error?.detail?.locked_by;
        error.lockType = error.response?.data?.error?.detail?.lock_type;
      }

      throw error;
    }
  }

  /**
   * 메모 업데이트 (낙관적 락 버전 관리 기능 통합)
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} content - 메모 내용
   * @param {number} clientVersion - 클라이언트 버전 (낙관적 락)
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateRemark(dashboardId, content, clientVersion) {
    try {
      this.logger.info(
        `메모 업데이트 요청: id=${dashboardId}, version=${
          clientVersion || 'none'
        }`
      );

      // 버전 정보 포함 요청 (낙관적 락)
      const params = clientVersion ? { dashboard_version: clientVersion } : {};

      const response = await axios.patch(
        `/dashboard/${dashboardId}/remark`,
        {
          content,
        },
        { params }
      );

      this.logger.debug('메모 업데이트 응답:', response.data);

      // 응답 유효성 검증
      this._validateResponse(response.data, '메모 업데이트');

      // 버전 정보 추출 및 포함
      const result = response.data.data;
      const versionInfo = response.data.version_info || {
        current_version: result.version,
      };

      return {
        ...result,
        _versionInfo: versionInfo,
      };
    } catch (error) {
      this.logger.error('메모 업데이트 실패:', error.response?.data || error);

      // 낙관적 락 충돌 특수 처리
      if (error.response?.status === 409) {
        error.isOptimisticLockError = true;
        error.currentVersion =
          error.response?.data?.version_info?.current_version;
        error.latestData = error.response?.data?.data;
      }

      throw error;
    }
  }

  /**
   * 비관적 락 획득 후 메모 업데이트 처리 (통합 락 처리)
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} content - 메모 내용
   * @param {number} clientVersion - 클라이언트 버전 (낙관적 락)
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateRemarkWithLock(dashboardId, content, clientVersion) {
    try {
      // 1. 먼저 비관적 락 획득 시도
      const LockService = (await import('./LockService')).default;
      await LockService.acquireLock(dashboardId, 'REMARK');

      try {
        // 2. 메모 업데이트 API 호출 (낙관적 락 버전 포함)
        return await this.updateRemark(dashboardId, content, clientVersion);
      } finally {
        // 3. 락 해제 (성공/실패 상관없이)
        await LockService.releaseLock(dashboardId);
      }
    } catch (error) {
      // 비관적 락 획득 실패 처리
      if (error.response?.status === 423) {
        this.logger.error('비관적 락 획득 실패:', error.response?.data);

        // 에러 객체에 추가 정보 부여
        error.isPessimisticLockError = true;
        error.lockedBy = error.response?.data?.error?.detail?.locked_by;
        error.lockType = error.response?.data?.error?.detail?.lock_type;
      }

      throw error;
    }
  }

  /**
   * 배차 처리 (다중 대시보드 및 낙관적 락 지원)
   * @param {Object} driverData - 배차 정보 (dashboard_ids, driver_name, driver_contact, client_versions)
   * @returns {Promise<Array>} - 업데이트된 대시보드 정보 배열
   */
  async assignDriver(driverData) {
    if (!driverData.dashboard_ids || !driverData.dashboard_ids.length) {
      throw new Error('배차할 대시보드 ID가 지정되지 않았습니다');
    }

    try {
      this.logger.info('배차 요청 데이터:', driverData);

      const response = await axios.post('/dashboard/assign', driverData);
      this.logger.debug('배차 응답:', response.data);

      // 응답 유효성 검증
      this._validateResponse(response.data, '배차 처리');

      return response.data.data?.updated_dashboards || [];
    } catch (error) {
      this.logger.error('배차 처리 실패:', error.response?.data || error);

      // 낙관적 락 충돌 특수 처리
      if (error.response?.status === 409) {
        error.isOptimisticLockError = true;

        // 충돌한 대시보드/주문번호 정보 추출
        const conflictedOrders =
          error.response?.data?.error?.detail?.conflicted_orders ||
          error.response?.data?.detail?.conflicted_orders ||
          [];

        error.conflictedOrders = conflictedOrders;
      }
      // 비관적 락 획득 실패 처리
      else if (error.response?.status === 423) {
        error.isPessimisticLockError = true;

        // 충돌 ID 정보 추출
        const conflictIds =
          error.response?.data?.error?.detail?.conflict_ids ||
          error.response?.data?.detail?.conflict_ids ||
          [];

        error.conflictIds = conflictIds;
        error.lockedBy = error.response?.data?.error?.detail?.locked_by;
      }

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
        data: dashboardIds,
      });

      this.logger.debug('삭제 응답:', response.data);

      // 응답 유효성 검증
      return this._validateResponse(response.data, '대시보드 삭제');
    } catch (error) {
      this.logger.error('대시보드 삭제 실패:', error.response?.data || error);
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

      if (response.data && response.data.success && response.data.date_range) {
        return {
          oldest_date: response.data.date_range.oldest_date,
          latest_date: response.data.date_range.latest_date,
        };
      }

      // 다양한 응답 구조 처리
      if (
        response.data &&
        response.data.data &&
        response.data.data.date_range
      ) {
        return {
          oldest_date: response.data.data.date_range.oldest_date,
          latest_date: response.data.data.date_range.latest_date,
        };
      }

      // 백업 형식
      if (
        response.data &&
        response.data.oldest_date &&
        response.data.latest_date
      ) {
        return {
          oldest_date: response.data.oldest_date,
          latest_date: response.data.latest_date,
        };
      }

      // 기본값 반환
      return {
        oldest_date: new Date().toISOString().split('T')[0],
        latest_date: new Date().toISOString().split('T')[0],
      };
    } catch (error) {
      this.logger.error('날짜 범위 조회 실패:', error.response?.data || error);
      // 에러 발생 시 기본값 반환
      return {
        oldest_date: new Date().toISOString().split('T')[0],
        latest_date: new Date().toISOString().split('T')[0],
      };
    }
  }

  /**
   * 비관적 락 + 낙관적 락 통합 배차 처리
   * @param {Object} driverData - 배차 정보
   * @returns {Promise<Array>} - 업데이트된 대시보드 정보 배열
   */
  async assignDriverWithLock(driverData) {
    try {
      // 1. 먼저 다중 비관적 락 획득 시도
      const LockService = (await import('./LockService')).default;
      const lockedIds = await LockService.acquireMultipleLocks(
        driverData.dashboard_ids,
        'ASSIGN'
      );

      try {
        // 2. 배차 처리 API 호출 (낙관적 락 버전 정보 포함)
        return await this.assignDriver(driverData);
      } finally {
        // 3. 락 해제 (성공/실패 상관없이)
        await LockService.releaseMultipleLocks(lockedIds);
      }
    } catch (error) {
      // 비관적 락 획득 실패 처리
      if (error.response?.status === 423) {
        this.logger.error('비관적 락 획득 실패:', error.response?.data);

        // 에러 객체에 추가 정보 부여
        error.isPessimisticLockError = true;

        // 충돌 ID 정보 추출
        const conflictIds =
          error.response?.data?.error?.detail?.conflict_ids ||
          error.response?.data?.detail?.conflict_ids ||
          [];

        error.conflictIds = conflictIds;
        error.lockedBy = error.response?.data?.error?.detail?.locked_by;
      }

      throw error;
    }
  }

  /**
   * 상태와 ETA에 따른 정렬 처리
   * @param {Array} dashboards - 대시보드 항목 목록
   * @returns {Array} - 정렬된 항목 목록
   */
  _sortDashboardsByStatus(dashboards) {
    if (!Array.isArray(dashboards)) return [];

    // 상태 우선순위 정의
    const statusPriority = {
      WAITING: 1,
      IN_PROGRESS: 2,
      COMPLETE: 10,
      ISSUE: 11,
      CANCEL: 12,
    };

    return [...dashboards].sort((a, b) => {
      // 상태 우선순위 비교
      const aPriority = statusPriority[a.status] || 99;
      const bPriority = statusPriority[b.status] || 99;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // 같은 상태 그룹 내에서는 ETA 기준 정렬
      return new Date(a.eta) - new Date(b.eta);
    });
  }

  /**
   * API 응답 유효성 검증
   * @param {Object} response - API 응답 객체
   * @param {string} context - 오류 컨텍스트 정보
   * @returns {boolean} - 유효성 여부
   * @private
   */
  _validateResponse(response, context) {
    if (!response) {
      throw new Error(`${context} 응답이 없습니다`);
    }

    // success 필드가 있는 경우
    if (response.success !== undefined) {
      if (!response.success) {
        const message = response.message || `${context} 실패`;
        const error = new Error(message);
        error.details = response.error || {};
        throw error;
      }
      return true;
    }

    // success 필드 없이 data 필드만 있는 경우
    if (response.data !== undefined) {
      return true;
    }

    // 응답 자체가 데이터인 경우
    return true;
  }

  /**
   * 목록 응답 데이터 정규화
   * @param {Object} responseData - API 응답 데이터
   * @returns {Object} - 정규화된 응답 객체
   * @private
   */
  _normalizeListResponse(responseData) {
    // 응답 데이터 구조 검증
    if (!responseData) {
      this.logger.error('응답에 데이터가 없습니다');
      return { items: [], date_range: null };
    }

    // 백엔드 API 응답 구조 처리 (success, message, data 구조)
    if (responseData.success && responseData.data) {
      // 성공 응답 처리
      const items = responseData.data.items || [];
      const dateRange = responseData.data.date_range;
      const userRole = responseData.data.user_role;
      const isAdmin = responseData.data.is_admin;

      return {
        items,
        date_range: dateRange,
        user_role: userRole,
        is_admin: isAdmin,
      };
    } else {
      // 응답은 성공했지만 데이터 형식이 다른 경우
      this.logger.warn(
        '서버 응답 데이터 형식이 예상과 다릅니다:',
        responseData
      );

      // 다양한 응답 구조 대응 (하위 호환성)
      let items = [];
      let dateRange = null;
      let userRole = null;
      let isAdmin = false;

      if (responseData.items) {
        items = responseData.items;
        dateRange = responseData.date_range;
        userRole = responseData.user_role;
        isAdmin = responseData.is_admin;
      } else if (Array.isArray(responseData)) {
        items = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        items = responseData.data;
        dateRange = responseData.date_range;
      }

      return {
        items,
        date_range: dateRange,
        user_role: userRole,
        is_admin: isAdmin,
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

  /**
   * 이전 요청 취소 처리 (중복 요청 방지)
   * @param {string} key - 요청 식별자
   * @private
   */
  _cancelPreviousRequest(key) {
    if (this.cancelTokens.has(key)) {
      const source = this.cancelTokens.get(key);
      source.cancel('이전 요청 취소');
      this.cancelTokens.delete(key);
      this.logger.debug(`이전 ${key} 요청 취소됨`);
    }
  }

  /**
   * 모든 진행 중인 요청 취소
   * 페이지 이탈 시 호출
   */
  cancelAllRequests() {
    for (const [key, source] of this.cancelTokens.entries()) {
      source.cancel(`모든 요청 취소: ${key}`);
      this.logger.debug(`요청 취소됨: ${key}`);
    }
    this.cancelTokens.clear();
    this.logger.info('모든 진행 중인 요청이 취소되었습니다');
  }

  /**
   * 버전 충돌 자동 처리 (낙관적 락)
   * @param {Object} error - 에러 객체
   * @param {Function} onUpdate - 업데이트 콜백 함수
   * @param {string} messageKey - 메시지 키
   * @returns {boolean} - 처리 성공 여부
   */
  handleVersionConflict(error, onUpdate, messageKey) {
    if (error.response?.status === 409) {
      // 서버 응답에서 최신 데이터 및 버전 정보 추출
      const latestData = error.response.data?.data;
      const currentVersion =
        error.response.data?.version_info?.current_version ||
        (latestData ? latestData.version : null);

      if (latestData && currentVersion) {
        // 최신 데이터로 UI 갱신
        if (typeof onUpdate === 'function') {
          onUpdate(latestData, currentVersion);
        }

        // 사용자에게 충돌 알림
        if (messageKey) {
          message.warning(
            '다른 사용자가 이미 이 정보를 수정했습니다. 최신 정보로 갱신되었습니다.',
            messageKey
          );
        }

        return true;
      }
    }

    return false;
  }
}

export default new DashboardService();

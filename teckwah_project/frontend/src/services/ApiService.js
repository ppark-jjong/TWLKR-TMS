// src/services/ApiService.js (개선)
import axios from 'axios';
import TokenManager from '../utils/TokenManager';
import Logger from '../utils/Logger';

const logger = Logger.getLogger('ApiService');

/**
 * 통합 API 서비스
 * 모든 HTTP 요청을 처리하는 중앙 서비스
 * 도메인 로직은 포함하지 않고 순수 HTTP 통신에 집중
 */
class ApiService {
  /**
   * HTTP 요청 실행
   * @param {string} method - HTTP 메서드 (get, post, put, delete 등)
   * @param {string} url - 요청 URL
   * @param {Object} data - 요청 데이터 (params, data, headers 등)
   * @returns {Promise<any>} 응답 데이터
   */
  async request(method, url, data = {}) {
    try {
      logger.debug(`API 요청: ${method.toUpperCase()} ${url}`);

      // 인증 토큰 설정
      const token = TokenManager.getAccessToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data.headers || {}),
      };

      // Axios 요청 설정
      const config = {
        method,
        url,
        headers,
        ...data,
      };

      // 요청 실행
      const response = await axios(config);

      // 응답 검증 및 변환
      if (!response.data) {
        throw new Error('응답 데이터가 없습니다');
      }

      logger.debug(`API 응답 성공: ${method.toUpperCase()} ${url}`);

      return response.data.success
        ? response.data.data || response.data
        : Promise.reject(new Error(response.data.message || '요청 처리 실패'));
    } catch (error) {
      logger.error(`API 요청 오류: ${method.toUpperCase()} ${url}`, error);
      throw error;
    }
  }

  // 인증 관련 API
  async login(userId, password) {
    return this.request('post', '/auth/login', {
      data: { user_id: userId, password },
    });
  }

  async refreshToken(refreshToken) {
    return this.request('post', '/auth/refresh', {
      data: { refresh_token: refreshToken || TokenManager.getRefreshToken() },
    });
  }

  async logout() {
    return this.request('post', '/auth/logout', {
      data: { refresh_token: TokenManager.getRefreshToken() },
    });
  }

  async checkSession() {
    return this.request('get', '/auth/check-session');
  }

  // 대시보드 관련 API
  async getDashboardList(startDate, endDate) {
    return this.request('get', '/dashboard/list', {
      params: {
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
      },
    });
  }

  async getDashboardDetail(dashboardId) {
    if (!dashboardId) throw new Error('대시보드 ID가 필요합니다');
    return this.request('get', `/dashboard/${dashboardId}`);
  }

  async updateDashboardFields(dashboardId, fields) {
    if (!dashboardId) throw new Error('대시보드 ID가 필요합니다');
    return this.request('patch', `/dashboard/${dashboardId}/fields`, {
      data: fields,
    });
  }

  async updateStatus(dashboardId, status, isAdmin = false) {
    if (!dashboardId || !status)
      throw new Error('필수 파라미터가 누락되었습니다');
    return this.request('patch', `/dashboard/${dashboardId}/status`, {
      data: { status, is_admin: isAdmin },
    });
  }

  // 배차 처리 API 수정 - dashboard_ids 배열로 변경
  async assignDriver(data) {
    return this.request('post', '/dashboard/assign', {
      data,
    });
  }

  // 메모 관련 API 수정 - 단일 remark만 지원
  async updateRemark(dashboardId, remarkId, content) {
    if (!dashboardId || !remarkId)
      throw new Error('대시보드 ID와 메모 ID가 필요합니다');
    return this.request(
      'patch',
      `/dashboard/${dashboardId}/remarks/${remarkId}`,
      {
        data: { content },
      }
    );
  }

  // 시각화 API 수정 - 언더스코어 사용
  async getDeliveryStatus(startDate, endDate) {
    return this.request('get', '/visualization/delivery_status', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
  }

  async getHourlyOrders(startDate, endDate) {
    return this.request('get', '/visualization/hourly_orders', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
  }

  // session 체크 API 추가
  async checkSession() {
    return this.request('get', '/auth/check-session');
  }

  // 락 관련 API
  async acquireLock(dashboardId, lockType) {
    if (!dashboardId || !lockType)
      throw new Error('필수 파라미터가 누락되었습니다');
    return this.request('post', `/dashboard/${dashboardId}/lock`, {
      data: { lock_type: lockType },
    });
  }

  async releaseLock(dashboardId) {
    if (!dashboardId) throw new Error('대시보드 ID가 필요합니다');
    return this.request('delete', `/dashboard/${dashboardId}/lock`);
  }

  async checkLockStatus(dashboardId) {
    if (!dashboardId) throw new Error('대시보드 ID가 필요합니다');
    return this.request('get', `/dashboard/${dashboardId}/lock/status`);
  }
}

export default new ApiService();

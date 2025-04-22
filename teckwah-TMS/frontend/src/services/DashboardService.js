/**
 * 대시보드(주문) 관련 API 서비스
 */
import api from './api';
import logger from '../utils/logger';

// 서비스 이름 상수
const SERVICE_NAME = 'DashboardService';

const DashboardService = {
  /**
   * 주문 목록 조회
   * @param {Object} params 검색 조건
   * @returns {Promise} 주문 목록 및 상태별 카운트
   */
  getOrders: async (params) => {
    const url = '/dashboard/list';
    try {
      logger.service(SERVICE_NAME, 'getOrders');
      logger.api('GET', url);
      const response = await api.get(url, { params });
      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error('주문 목록 조회 실패', error);
      throw error; // api 인터셉터에서 처리
    }
  },

  /**
   * 특정 주문 조회
   * @param {number} orderId 주문 ID
   * @returns {Promise} 주문 상세 정보
   */
  getOrder: async (orderId) => {
    const url = `/dashboard/${orderId}`;
    try {
      logger.service(SERVICE_NAME, 'getOrder', { orderId });
      logger.api('GET', url);
      const response = await api.get(url);
      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error(`주문 상세 조회 실패: ID=${orderId}`, error);
      throw error;
    }
  },

  /**
   * 주문 생성
   * @param {Object} orderData 주문 데이터
   * @returns {Promise} 생성된 주문 정보
   */
  createOrder: async (orderData) => {
    const url = '/dashboard';
    try {
      logger.service(SERVICE_NAME, 'createOrder');

      // 우편번호 처리는 백엔드에서 일괄 처리
      // 4자리 우편번호인 경우 5자리로 보정 (중복 체크)
      if (orderData.postalCode && orderData.postalCode.length === 4) {
        orderData.postalCode = '0' + orderData.postalCode;
        logger.info('우편번호 자동 보정 (프론트엔드)', orderData.postalCode);
      }

      logger.api('POST', url);
      const response = await api.post(url, orderData);

      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error('주문 생성 실패', error);
      throw error;
    }
  },

  /**
   * 주문 수정
   * @param {number} orderId 주문 ID
   * @param {Object} orderData 주문 데이터
   * @returns {Promise} 수정된 주문 정보
   */
  updateOrder: async (orderId, orderData) => {
    const url = `/dashboard/${orderId}`;
    try {
      logger.service(SERVICE_NAME, 'updateOrder', { orderId });

      // 우편번호 처리는 백엔드에서 일괄 처리하지만 프론트에서도 중복 검증
      if (orderData.postalCode && orderData.postalCode.length === 4) {
        orderData.postalCode = '0' + orderData.postalCode;
        logger.info('우편번호 자동 보정 (프론트엔드)', orderData.postalCode);
      }

      logger.api('PUT', url);
      const response = await api.put(url, orderData);

      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error(`주문 수정 실패: ID=${orderId}`, error);
      throw error;
    }
  },

  /**
   * 주문 삭제
   * @param {number} orderId 주문 ID
   * @returns {Promise} 삭제 결과
   */
  deleteOrder: async (orderId) => {
    const url = `/dashboard/${orderId}`;
    try {
      logger.service(SERVICE_NAME, 'deleteOrder', { orderId });
      logger.api('DELETE', url);
      const response = await api.delete(url);
      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error(`주문 삭제 실패: ID=${orderId}`, error);
      throw error;
    }
  },

  /**
   * 주문 다중 삭제 (백엔드 API: delete_multiple_orders)
   * @param {Array<number>} orderIds 주문 ID 배열
   * @returns {Promise} 삭제 결과
   */
  deleteOrders: async (orderIds) => {
    const url = '/dashboard/delete-multiple';
    try {
      logger.service(SERVICE_NAME, 'deleteOrders', { count: orderIds.length });
      logger.api('POST', url);
      const response = await api.post(url, {
        orderIds, // Pydantic alias를 통해 백엔드에서 order_ids로 매핑됨
      });
      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error('다중 삭제 실패', error);
      throw error;
    }
  },

  /**
   * 주문 상태 변경
   * @param {number} orderId 주문 ID
   * @param {string} status 변경할 상태
   * @returns {Promise} 변경 결과
   */
  updateOrderStatus: async (orderId, status) => {
    try {
      logger.service(SERVICE_NAME, 'updateOrderStatus', { orderId, status });
      logger.api('POST', `/dashboard/${orderId}/status`);

      const response = await api.post(`/dashboard/${orderId}/status`, {
        status,
      });

      logger.response(`/dashboard/${orderId}/status`, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error(`주문 상태 변경 실패: ID=${orderId}, 상태=${status}`, error);
      throw error;
    }
  },

  /**
   * 주문 상태 일괄 변경 (백엔드 API: update_multiple_orders_status)
   * @param {Array<number>} orderIds 주문 ID 배열
   * @param {string} status 변경할 상태
   * @returns {Promise} 변경 결과
   */
  updateOrdersStatus: async (orderIds, status) => {
    const url = '/dashboard/status-multiple';
    try {
      logger.service(SERVICE_NAME, 'updateOrdersStatus');
      logger.api('POST', url);
      const response = await api.post(url, {
        orderIds, // Pydantic alias를 통해 백엔드에서 order_ids로 매핑됨
        status,
      });
      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error('상태 일괄 변경 실패', error);
      throw error;
    }
  },

  /**
   * 기사 일괄 배정 (백엔드 API: assign_driver_to_orders)
   * @param {Array<number>} orderIds 주문 ID 배열
   * @param {string} driverName 기사 이름
   * @param {string} driverContact 기사 연락처
   * @returns {Promise} 배정 결과
   */
  assignDriverToOrders: async (orderIds, driverName, driverContact) => {
    const url = '/dashboard/assign-driver';
    try {
      logger.service(SERVICE_NAME, 'assignDriverToOrders', {
        count: orderIds.length,
        driverName,
      });
      logger.api('POST', url);
      const response = await api.post(url, {
        orderIds, // Pydantic alias를 통해 백엔드에서 order_ids로 매핑됨
        driverName,
        driverContact,
      });
      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error('기사 배정 실패', error);
      throw error;
    }
  },

  /**
   * 주문 락 획득
   * @param {number} orderId 주문 ID
   * @returns {Promise} 락 획득 결과
   */
  lockOrder: async (orderId) => {
    const url = `/dashboard/${orderId}/lock`;
    try {
      logger.service(SERVICE_NAME, 'lockOrder', { orderId });
      logger.api('POST', url);
      const response = await api.post(url);
      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error(`주문 락 획득 실패: ID=${orderId}`, error);
      throw error;
    }
  },

  /**
   * 주문 락 해제
   * @param {number} orderId 주문 ID
   * @returns {Promise} 락 해제 결과
   */
  unlockOrder: async (orderId) => {
    const url = `/dashboard/${orderId}/unlock`;
    try {
      logger.service(SERVICE_NAME, 'unlockOrder', { orderId });
      logger.api('POST', url);
      const response = await api.post(url);
      logger.response(url, response.data?.success);
      return response.data;
    } catch (error) {
      logger.error(`주문 락 해제 실패: ID=${orderId}`, error);
      throw error;
    }
  },

  /**
   * 주문 데이터 다운로드
   * @param {Object} params 검색 조건
   * @returns {Promise} 다운로드 처리
   */
  downloadOrders: async (params) => {
    const url = '/dashboard/download';
    try {
      logger.service(SERVICE_NAME, 'downloadOrders');
      logger.api('GET', url);

      // 실제 REST API에서는 api.get('/dashboard/download', {params})가 될 수 있음
      // 현재는 기존 주문 조회 기능을 활용
      const response = await api.get(url, {
        params,
        responseType: 'blob', // Blob 형태로 받기
      });

      // Excel 파일로 저장
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // 다운로드 파일명 설정 (yyyy-MM-dd_orders.xlsx)
      const today = new Date();
      const date = today.toISOString().split('T')[0];
      a.download = `${date}_orders.xlsx`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      logger.response(url, true);
      return { success: true };
    } catch (error) {
      logger.error('주문 데이터 다운로드 실패', error);
      throw error;
    }
  },
};

export default DashboardService;

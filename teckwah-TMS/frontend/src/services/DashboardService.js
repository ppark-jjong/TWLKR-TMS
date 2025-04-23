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
   * 주문 삭제 (단일)
   * 백엔드에서 개별 삭제 API가 제거되어 일괄 삭제 API를 사용하도록 수정
   * @param {number} orderId 주문 ID
   * @returns {Promise} 삭제 결과
   */
  deleteOrder: async (orderId) => {
    logger.service(SERVICE_NAME, 'deleteOrder', { orderId });
    logger.info('개별 삭제 대신 일괄 삭제 API 사용');
    // 단일 ID를 배열에 담아 일괄 삭제 API 호출
    return DashboardService.deleteOrders([orderId]);
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
   * 주문 상태 변경 (단일)
   * 백엔드에서 개별 상태 변경 API가 제거되어 일괄 상태 변경 API를 사용하도록 수정
   * @param {number} orderId 주문 ID
   * @param {string} status 변경할 상태
   * @returns {Promise} 변경 결과
   */
  updateOrderStatus: async (orderId, status) => {
    logger.service(SERVICE_NAME, 'updateOrderStatus', { orderId, status });
    logger.info('개별 상태 변경 대신 일괄 상태 변경 API 사용');
    // 단일 ID를 배열에 담아 일괄 상태 변경 API 호출
    return DashboardService.updateOrdersStatus([orderId], status);
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
   * 백엔드에 해당 API가 없는 것으로 보이므로 기존 조회 API 활용
   * @param {Object} params 검색 조건
   * @returns {Promise} 다운로드 처리
   */
  downloadOrders: async (params) => {
    try {
      logger.service(SERVICE_NAME, 'downloadOrders');
      
      // 일반 주문 목록 조회 API 사용
      logger.info('다운로드용 API가 없어 일반 목록 조회 API 활용');
      const response = await DashboardService.getOrders({
        ...params,
        limit: 1000 // 다운로드를 위해 많은 데이터 요청
      });
      
      if (!response.success) {
        throw new Error(response.message || '데이터 조회 실패');
      }
      
      // 데이터를 CSV 형식으로 변환
      const orders = response.data.items || [];
      
      // 헤더 생성
      const headers = [
        'ID', '주문번호', '유형', '상태', '부서', '창고', 
        '고객명', '주소', '우편번호', 'ETA', '생성시간'
      ].join(',');
      
      // 데이터 행 생성
      const rows = orders.map(order => [
        order.dashboardId,
        order.orderNo,
        order.type,
        order.status,
        order.department,
        order.warehouse,
        order.customer ? order.customer.replace(/,/g, ' ') : '',
        order.address ? order.address.replace(/,/g, ' ') : '',
        order.postalCode,
        order.eta,
        order.createTime
      ].join(','));
      
      // CSV 내용 생성
      const csvContent = [headers, ...rows].join('\n');
      
      // Blob 생성 및 다운로드
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // 다운로드 파일명 설정
      const today = new Date();
      const date = today.toISOString().split('T')[0];
      a.download = `${date}_orders.csv`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true, message: '데이터 다운로드 완료' };
    } catch (error) {
      logger.error('주문 데이터 다운로드 실패', error);
      throw error;
    }
  },
};

export default DashboardService;
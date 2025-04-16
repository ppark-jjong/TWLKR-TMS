/**
 * 대시보드(주문) 관련 API 서비스
 */
import api from './api';

const DashboardService = {
  /**
   * 주문 목록 조회
   * @param {Object} params 검색 조건
   * @returns {Promise} 주문 목록 및 상태별 카운트
   */
  getOrders: async (params) => {
    try {
      console.log('주문 목록 조회 요청:', params);
      const response = await api.get('/dashboard', { params });
      console.log('주문 목록 조회 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('주문 목록 조회 오류:', error);
      throw error; // api 인터셉터에서 처리
    }
  },
  
  /**
   * 특정 주문 조회
   * @param {number} orderId 주문 ID
   * @returns {Promise} 주문 상세 정보
   */
  getOrder: async (orderId) => {
    try {
      console.log(`주문 상세 조회 요청: ID=${orderId}`);
      const response = await api.get(`/dashboard/${orderId}`);
      console.log('주문 상세 조회 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error(`주문 상세 조회 오류: ID=${orderId}`, error);
      throw error;
    }
  },
  
  /**
   * 주문 생성
   * @param {Object} orderData 주문 데이터
   * @returns {Promise} 생성된 주문 정보
   */
  createOrder: async (orderData) => {
    try {
      console.log('주문 생성 요청:', orderData);
      
      // 우편번호 5자리 맞추기
      if (orderData.postal_code) {
        orderData.postal_code = orderData.postal_code.padStart(5, '0');
      }
      
      const response = await api.post('/dashboard', orderData);
      console.log('주문 생성 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('주문 생성 오류:', error);
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
    try {
      console.log(`주문 수정 요청: ID=${orderId}`, orderData);
      
      // 우편번호 5자리 맞추기
      if (orderData.postal_code) {
        orderData.postal_code = orderData.postal_code.padStart(5, '0');
      }
      
      const response = await api.put(`/dashboard/${orderId}`, orderData);
      console.log('주문 수정 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error(`주문 수정 오류: ID=${orderId}`, error);
      throw error;
    }
  },
  
  /**
   * 주문 삭제
   * @param {number} orderId 주문 ID
   * @returns {Promise} 삭제 결과
   */
  deleteOrder: async (orderId) => {
    try {
      console.log(`주문 삭제 요청: ID=${orderId}`);
      const response = await api.delete(`/dashboard/${orderId}`);
      console.log('주문 삭제 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error(`주문 삭제 오류: ID=${orderId}`, error);
      throw error;
    }
  },
  
  /**
   * 주문 다중 삭제
   * @param {Array<number>} orderIds 주문 ID 배열
   * @returns {Promise} 삭제 결과
   */
  deleteMultipleOrders: async (orderIds) => {
    try {
      console.log('다중 삭제 요청:', { orderIds });
      const response = await api.post('/dashboard/delete-multiple', { 
        order_ids: orderIds  // order_ids로 백엔드와 일치시킴
      });
      console.log('다중 삭제 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('다중 삭제 오류:', error);
      return {
        success: false,
        message: '주문 다중 삭제 실패',
        data: null
      };
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
      console.log(`주문 상태 변경 요청: ID=${orderId}, 상태=${status}`);
      const response = await api.post(`/dashboard/${orderId}/status`, { status });
      console.log('주문 상태 변경 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error(`주문 상태 변경 오류: ID=${orderId}, 상태=${status}`, error);
      throw error;
    }
  },
  
  /**
   * 주문 상태 일괄 변경
   * @param {Array<number>} orderIds 주문 ID 배열
   * @param {string} status 변경할 상태
   * @returns {Promise} 변경 결과
   */
  updateMultipleStatus: async (orderIds, status) => {
    try {
      console.log('상태 일괄 변경 요청:', { orderIds, status });
      const response = await api.post('/dashboard/status-multiple', { 
        order_ids: orderIds, 
        status 
      });
      console.log('상태 일괄 변경 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('상태 일괄 변경 오류:', error);
      return {
        success: false,
        message: '주문 상태 일괄 변경 실패',
        data: null
      };
    }
  },
  
  /**
   * 기사 일괄 배정
   * @param {Array<number>} orderIds 주문 ID 배열
   * @param {string} driverName 기사 이름
   * @param {string} driverContact 기사 연락처
   * @returns {Promise} 배정 결과
   */
  assignDriver: async (orderIds, driverName, driverContact) => {
    try {
      console.log('기사 배정 요청:', { orderIds, driverName, driverContact });
      const response = await api.post('/dashboard/assign-driver', {
        order_ids: orderIds,  // order_ids로 백엔드와 일치시킴
        driver_name: driverName,
        driver_contact: driverContact
      });
      console.log('기사 배정 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('기사 배정 오류:', error);
      return {
        success: false,
        message: '기사 배정 실패',
        data: null
      };
    }
  },
  
  /**
   * 주문 락 획득
   * @param {number} orderId 주문 ID
   * @returns {Promise} 락 획득 결과
   */
  lockOrder: async (orderId) => {
    try {
      console.log(`주문 락 획득 요청: ID=${orderId}`);
      const response = await api.post(`/dashboard/${orderId}/lock`);
      console.log('주문 락 획득 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error(`주문 락 획득 오류: ID=${orderId}`, error);
      throw error;
    }
  },
  
  /**
   * 주문 락 해제
   * @param {number} orderId 주문 ID
   * @returns {Promise} 락 해제 결과
   */
  unlockOrder: async (orderId) => {
    try {
      console.log(`주문 락 해제 요청: ID=${orderId}`);
      const response = await api.post(`/dashboard/${orderId}/unlock`);
      console.log('주문 락 해제 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error(`주문 락 해제 오류: ID=${orderId}`, error);
      throw error;
    }
  },

  /**
   * 주문 데이터 다운로드
   * @param {Object} params 검색 조건
   * @returns {Promise} 다운로드 처리
   */
  downloadOrders: async (params) => {
    try {
      console.log('주문 데이터 다운로드 요청:', params);
      // 실제 REST API에서는 api.get('/dashboard/download', {params})가 될 수 있음
      // 현재는 기존 주문 조회 기능을 활용
      const response = await api.get('/dashboard', { 
        params,
        responseType: 'blob' // Blob 형태로 받기
      });
      
      // Excel 파일로 저장
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
      
      console.log('주문 데이터 다운로드 완료');
      return { success: true };
    } catch (error) {
      console.error('주문 데이터 다운로드 오류:', error);
      throw error;
    }
  }
};

export default DashboardService;
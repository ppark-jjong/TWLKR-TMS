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
    const response = await api.get('/dashboard', { params });
    return response.data;
  },
  
  /**
   * 특정 주문 조회
   * @param {number} orderId 주문 ID
   * @returns {Promise} 주문 상세 정보
   */
  getOrder: async (orderId) => {
    const response = await api.get(`/dashboard/${orderId}`);
    return response.data;
  },
  
  /**
   * 주문 생성
   * @param {Object} orderData 주문 데이터
   * @returns {Promise} 생성된 주문 정보
   */
  createOrder: async (orderData) => {
    // 우편번호 5자리 맞추기
    if (orderData.postal_code) {
      orderData.postal_code = orderData.postal_code.padStart(5, '0');
    }
    const response = await api.post('/dashboard', orderData);
    return response.data;
  },
  
  /**
   * 주문 수정
   * @param {number} orderId 주문 ID
   * @param {Object} orderData 주문 데이터
   * @returns {Promise} 수정된 주문 정보
   */
  updateOrder: async (orderId, orderData) => {
    // 우편번호 5자리 맞추기
    if (orderData.postal_code) {
      orderData.postal_code = orderData.postal_code.padStart(5, '0');
    }
    const response = await api.put(`/dashboard/${orderId}`, orderData);
    return response.data;
  },
  
  /**
   * 주문 삭제
   * @param {number} orderId 주문 ID
   * @returns {Promise} 삭제 결과
   */
  deleteOrder: async (orderId) => {
    const response = await api.delete(`/dashboard/${orderId}`);
    return response.data;
  },
  
  /**
   * 주문 다중 삭제
   * @param {Array<number>} orderIds 주문 ID 배열
   * @returns {Promise} 삭제 결과
   */
  deleteMultipleOrders: async (orderIds) => {
    const response = await api.post('/dashboard/delete-multiple', { orderIds });
    return response.data;
  },
  
  /**
   * 주문 상태 변경
   * @param {number} orderId 주문 ID
   * @param {string} status 변경할 상태
   * @returns {Promise} 변경 결과
   */
  updateOrderStatus: async (orderId, status) => {
    const response = await api.post(`/dashboard/${orderId}/status`, { status });
    return response.data;
  },
  
  /**
   * 주문 상태 일괄 변경
   * @param {Array<number>} orderIds 주문 ID 배열
   * @param {string} status 변경할 상태
   * @returns {Promise} 변경 결과
   */
  updateMultipleStatus: async (orderIds, status) => {
    const response = await api.post('/dashboard/update-status', { orderIds, status });
    return response.data;
  },
  
  /**
   * 기사 일괄 배정
   * @param {Array<number>} orderIds 주문 ID 배열
   * @param {string} driverName 기사 이름
   * @param {string} driverContact 기사 연락처
   * @returns {Promise} 배정 결과
   */
  assignDriver: async (orderIds, driverName, driverContact) => {
    const response = await api.post('/dashboard/assign-driver', {
      orderIds,
      driverName,
      driverContact
    });
    return response.data;
  },
  
  /**
   * 주문 락 획득
   * @param {number} orderId 주문 ID
   * @returns {Promise} 락 획득 결과
   */
  lockOrder: async (orderId) => {
    const response = await api.post(`/dashboard/${orderId}/lock`);
    return response.data;
  },
  
  /**
   * 주문 락 해제
   * @param {number} orderId 주문 ID
   * @returns {Promise} 락 해제 결과
   */
  unlockOrder: async (orderId) => {
    const response = await api.post(`/dashboard/${orderId}/unlock`);
    return response.data;
  },

  /**
   * 주문 데이터 다운로드
   * @param {Object} params 검색 조건
   * @returns {Promise} 다운로드 처리
   */
  downloadOrders: async (params) => {
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
    
    return { success: true };
  }
};

export default DashboardService;

/**
 * 대시보드 액션 모듈
 * 주요 버튼 액션 및 상호작용 관리
 */
window.DashboardActions = {
  /**
   * 액션 모듈을 초기화합니다.
   */
  init: function() {
    this.setupEventListeners();
  },
  
  /**
   * 이벤트 리스너를 설정합니다.
   */
  setupEventListeners: function() {
    // 현재 페이지 테이블 기준으로 상태별 건수 집계 이벤트
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', this.handleRefresh);
    }
    
    // 날짜 필드 초기화
    this.initDateFields();
  },
  
  /**
   * 날짜 필드를 초기화합니다.
   */
  initDateFields: function() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput && endDateInput) {
      // URL에서 날짜 파라미터 가져오기
      const urlParams = new URLSearchParams(window.location.search);
      const startDate = urlParams.get('startDate');
      const endDate = urlParams.get('endDate');
      
      // 날짜 필드 값 설정
      if (startDate) {
        startDateInput.value = startDate;
      }
      
      if (endDate) {
        endDateInput.value = endDate;
      }
      
      // 시작 날짜가 종료 날짜보다 늦을 경우 종료 날짜 자동 조정
      startDateInput.addEventListener('change', function() {
        if (startDateInput.value && endDateInput.value && startDateInput.value > endDateInput.value) {
          endDateInput.value = startDateInput.value;
        }
      });
      
      // 종료 날짜가 시작 날짜보다 빠를 경우 시작 날짜 자동 조정
      endDateInput.addEventListener('change', function() {
        if (startDateInput.value && endDateInput.value && endDateInput.value < startDateInput.value) {
          startDateInput.value = endDateInput.value;
        }
      });
    }
  },
  
  /**
   * 데이터 새로고침을 처리합니다.
   * @param {Event} event - 이벤트 객체
   */
  handleRefresh: function(event) {
    if (event) {
      event.preventDefault();
    }
    
    // 현재 페이지 URL 그대로 새로고침
    window.location.reload();
  },
  
  /**
   * 주문 상세 정보를 가져옵니다.
   * @param {string} orderId - 주문 ID
   * @returns {Promise<Object>} - 주문 데이터
   */
  getOrderDetail: async function(orderId) {
    try {
      const response = await API.get(`/dashboard/orders/${orderId}`);
      
      if (response.success) {
        return response.data;
      } else {
        Alerts.error(response.message || '주문 정보를 불러오는 중 오류가 발생했습니다.');
        return null;
      }
    } catch (error) {
      console.error('주문 상세 정보 로드 중 오류:', error);
      Alerts.error('주문 정보를 불러오는 중 오류가 발생했습니다.');
      return null;
    }
  },
  
  /**
   * 주문 락 상태를 확인합니다.
   * @param {string} orderId - 주문 ID
   * @returns {Promise<Object>} - 락 상태 정보
   */
  checkOrderLock: async function(orderId) {
    try {
      return await Utils.checkLock(orderId);
    } catch (error) {
      console.error('락 확인 중 오류:', error);
      return { hasLock: false, canEdit: false };
    }
  },
  
  /**
   * 주문을 생성합니다.
   * @param {Object} orderData - 주문 데이터
   * @returns {Promise<Object>} - 응답 데이터
   */
  createOrder: async function(orderData) {
    try {
      const response = await API.post('/dashboard/orders', orderData);
      
      if (response.success) {
        Alerts.success('주문이 성공적으로 생성되었습니다.');
      } else {
        Alerts.error(response.message || '주문 생성 중 오류가 발생했습니다.');
      }
      
      return response;
    } catch (error) {
      console.error('주문 생성 중 오류:', error);
      Alerts.error('주문 생성 중 오류가 발생했습니다.');
      return { success: false, message: error.message };
    }
  },
  
  /**
   * 주문을 수정합니다.
   * @param {string} orderId - 주문 ID
   * @param {Object} orderData - 주문 데이터
   * @returns {Promise<Object>} - 응답 데이터
   */
  updateOrder: async function(orderId, orderData) {
    try {
      const response = await API.put(`/dashboard/orders/${orderId}`, orderData);
      
      if (response.success) {
        Alerts.success('주문이 성공적으로 수정되었습니다.');
      } else {
        Alerts.error(response.message || '주문 수정 중 오류가 발생했습니다.');
      }
      
      return response;
    } catch (error) {
      console.error('주문 수정 중 오류:', error);
      Alerts.error('주문 수정 중 오류가 발생했습니다.');
      return { success: false, message: error.message };
    }
  },
  
  /**
   * 주문 상태를 변경합니다.
   * @param {Array<string>} orderIds - 주문 ID 목록
   * @param {string} status - 변경할 상태
   * @returns {Promise<Object>} - 응답 데이터
   */
  changeStatus: async function(orderIds, status) {
    try {
      const response = await API.post('/dashboard/status', {
        orderIds,
        status
      });
      
      if (response.success) {
        Alerts.success(`${response.data?.count || 0}건의 주문 상태가 성공적으로 변경되었습니다.`);
      } else {
        Alerts.error(response.message || '상태 변경 중 오류가 발생했습니다.');
      }
      
      return response;
    } catch (error) {
      console.error('상태 변경 중 오류:', error);
      Alerts.error('상태 변경 중 오류가 발생했습니다.');
      return { success: false, message: error.message };
    }
  },
  
  /**
   * 기사를 배정합니다.
   * @param {Array<string>} orderIds - 주문 ID 목록
   * @param {string} driverName - 기사 이름
   * @param {string} driverContact - 기사 연락처
   * @returns {Promise<Object>} - 응답 데이터
   */
  assignDriver: async function(orderIds, driverName, driverContact) {
    try {
      const response = await API.post('/dashboard/driver', {
        orderIds,
        driverName,
        driverContact
      });
      
      if (response.success) {
        Alerts.success(`${response.data?.count || 0}건의 주문이 성공적으로 배차 처리되었습니다.`);
      } else {
        Alerts.error(response.message || '배차 처리 중 오류가 발생했습니다.');
      }
      
      return response;
    } catch (error) {
      console.error('배차 처리 중 오류:', error);
      Alerts.error('배차 처리 중 오류가 발생했습니다.');
      return { success: false, message: error.message };
    }
  },
  
  /**
   * 주문을 삭제합니다.
   * @param {Array<string>} orderIds - 주문 ID 목록
   * @returns {Promise<Object>} - 응답 데이터
   */
  deleteOrders: async function(orderIds) {
    try {
      const response = await API.post('/dashboard/delete', {
        orderIds
      });
      
      if (response.success) {
        Alerts.success(`${response.data?.count || 0}건의 주문이 성공적으로 삭제되었습니다.`);
      } else {
        Alerts.error(response.message || '주문 삭제 중 오류가 발생했습니다.');
      }
      
      return response;
    } catch (error) {
      console.error('주문 삭제 중 오류:', error);
      Alerts.error('주문 삭제 중 오류가 발생했습니다.');
      return { success: false, message: error.message };
    }
  },
  
  /**
   * 페이지 파라미터로 이동합니다.
   * @param {Object} params - 페이지 파라미터
   */
  navigateWithParams: function(params) {
    const url = new URL(window.location.href);
    
    // 기존 파라미터 유지
    const currentParams = new URLSearchParams(window.location.search);
    
    // 새 파라미터 추가/변경
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        currentParams.delete(key);
      } else {
        currentParams.set(key, value);
      }
    });
    
    // 페이지 이동
    window.location.href = `${url.pathname}?${currentParams.toString()}`;
  },
  
  /**
   * 폼 유효성을 검사합니다.
   * @param {HTMLFormElement} form - 폼 요소
   * @returns {boolean} - 유효성 여부
   */
  validateForm: function(form) {
    return Modal.validateForm(form);
  }
};

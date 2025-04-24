/**
 * API 통신 관련 공통 함수
 * 모든 페이지에서 일관된 API 호출 인터페이스를 제공합니다.
 */

// API 요청 기본 설정
// 중복 선언 방지를 위해 window 객체에 저장
if (typeof window.API_CONFIG === 'undefined') {
  window.API_CONFIG = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'include'
  };
}
const API_CONFIG = window.API_CONFIG;

/**
 * API 요청 래퍼 함수
 * @param {string} url - API 엔드포인트 URL
 * @param {Object} options - fetch 옵션
 * @param {boolean} showLoadingIndicator - 로딩 인디케이터 표시 여부
 * @returns {Promise<Object>} 응답 데이터
 */
async function fetchAPI(url, options = {}, showLoadingIndicator = true) {
  try {
    // 기본 설정과 사용자 지정 옵션 병합
    const fetchOptions = {
      ...API_CONFIG,
      ...options,
      headers: {
        ...API_CONFIG.headers,
        ...(options.headers || {})
      }
    };
    
    // 요청 전 로딩 표시
    if (showLoadingIndicator && window.Utils) {
      window.Utils.showLoading(true);
    } else {
      document.body.classList.add('api-loading');
    }
    
    // API 요청 실행
    const response = await fetch(url, fetchOptions);
    
    // 응답 상태 확인
    if (!response.ok) {
      throw new Error(`HTTP 오류! 상태: ${response.status}`);
    }
    
    // JSON 응답 파싱
    const result = await response.json();
    
    // 요청 완료 후 로딩 표시 제거
    if (showLoadingIndicator && window.Utils) {
      window.Utils.showLoading(false);
    } else {
      document.body.classList.remove('api-loading');
    }
    
    // 응답이 표준 형식을 따르는지 확인
    if (result && typeof result === 'object' && !result.hasOwnProperty('success')) {
      // 표준 형식이 아닌 경우 표준 형식으로 변환
      return {
        success: true,
        data: result
      };
    }
    
    return result;
  } catch (error) {
    // 요청 완료 후 로딩 표시 제거
    if (showLoadingIndicator && window.Utils) {
      window.Utils.showLoading(false);
    } else {
      document.body.classList.remove('api-loading');
    }
    
    console.error('API 요청 오류:', error);
    
    // 오류 발생 시 알림 표시
    if (window.Utils) {
      window.Utils.showAlert('서버 통신 중 오류가 발생했습니다: ' + error.message, 'error');
    }
    
    return {
      success: false,
      message: '서버 통신 중 오류가 발생했습니다',
      error: error.message
    };
  }
}

/**
 * GET 요청
 * @param {string} url - API 엔드포인트 URL
 * @param {Object} params - URL 파라미터 (객체 형태)
 * @param {boolean} showLoadingIndicator - 로딩 인디케이터 표시 여부
 * @returns {Promise<Object>} 응답 데이터
 */
async function get(url, params = null, showLoadingIndicator = true) {
  // URL 파라미터가 있는 경우 URL에 추가
  if (params) {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    if (queryString) {
      url = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
    }
  }
  
  return fetchAPI(url, { method: 'GET' }, showLoadingIndicator);
}

/**
 * POST 요청
 * @param {string} url - API 엔드포인트 URL
 * @param {Object} data - 요청 본문 데이터 (객체 형태)
 * @param {boolean} showLoadingIndicator - 로딩 인디케이터 표시 여부
 * @returns {Promise<Object>} 응답 데이터
 */
async function post(url, data = null, showLoadingIndicator = true) {
  const options = {
    method: 'POST'
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  return fetchAPI(url, options, showLoadingIndicator);
}

/**
 * PUT 요청
 * @param {string} url - API 엔드포인트 URL
 * @param {Object} data - 요청 본문 데이터 (객체 형태)
 * @param {boolean} showLoadingIndicator - 로딩 인디케이터 표시 여부
 * @returns {Promise<Object>} 응답 데이터
 */
async function put(url, data = null, showLoadingIndicator = true) {
  const options = {
    method: 'PUT'
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  return fetchAPI(url, options, showLoadingIndicator);
}

/**
 * DELETE 요청
 * @param {string} url - API 엔드포인트 URL
 * @param {Object} data - 요청 본문 데이터 (객체 형태)
 * @param {boolean} showLoadingIndicator - 로딩 인디케이터 표시 여부
 * @returns {Promise<Object>} 응답 데이터
 */
async function del(url, data = null, showLoadingIndicator = true) {
  const options = {
    method: 'DELETE'
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  return fetchAPI(url, options, showLoadingIndicator);
}

// 도메인별 API 함수

/**
 * 주문 상세 정보 조회
 * @param {number} orderId - 주문 ID
 * @returns {Promise<Object>} 주문 상세 정보
 */
async function getOrderDetail(orderId) {
  const result = await get(`/dashboard/orders/${orderId}`);
  
  if (!result.success) {
    throw new Error(result.message || '주문 정보를 불러올 수 없습니다.');
  }
  
  return result.data || result;
}

/**
 * 주문 락 획득
 * @param {number} orderId - 주문 ID
 * @returns {Promise<Object>} 락 획득 결과
 */
async function lockOrder(orderId) {
  return get(`/dashboard/lock/${orderId}`);
}

/**
 * 주문 락 해제
 * @param {number} orderId - 주문 ID
 * @returns {Promise<Object>} 락 해제 결과
 */
async function unlockOrder(orderId) {
  return get(`/dashboard/unlock/${orderId}`);
}

/**
 * 주문 생성
 * @param {Object} orderData - 주문 데이터
 * @returns {Promise<Object>} 생성 결과
 */
async function createOrder(orderData) {
  return post('/dashboard/orders', orderData);
}

/**
 * 주문 수정
 * @param {number} orderId - 주문 ID
 * @param {Object} orderData - 수정할 주문 데이터
 * @returns {Promise<Object>} 수정 결과
 */
async function updateOrder(orderId, orderData) {
  return put(`/dashboard/orders/${orderId}`, orderData);
}

/**
 * 주문 삭제
 * @param {Array<number>} orderIds - 삭제할 주문 ID 배열
 * @returns {Promise<Object>} 삭제 결과
 */
async function deleteOrders(orderIds) {
  return post('/dashboard/delete', { ids: orderIds });
}

/**
 * 주문 상태 변경
 * @param {Array<number>} orderIds - 변경할 주문 ID 배열
 * @param {string} status - 변경할 상태
 * @returns {Promise<Object>} 변경 결과
 */
async function updateOrdersStatus(orderIds, status) {
  return post('/dashboard/status', { ids: orderIds, status: status });
}

/**
 * 기사 배정
 * @param {Array<number>} orderIds - 배정할 주문 ID 배열
 * @param {string} driverName - 기사 이름
 * @param {string} driverContact - 기사 연락처
 * @returns {Promise<Object>} 배정 결과
 */
async function assignDriverToOrders(orderIds, driverName, driverContact) {
  return post('/dashboard/driver', { ids: orderIds, driver_name: driverName, driver_contact: driverContact });
}

/**
 * 사용자 상세 정보 조회
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 사용자 상세 정보
 */
async function getUserDetail(userId) {
  return get(`/users/${userId}`);
}

/**
 * 사용자 생성
 * @param {Object} userData - 사용자 데이터
 * @returns {Promise<Object>} 생성 결과
 */
async function createUser(userData) {
  return post('/users', userData);
}

/**
 * 사용자 정보 수정
 * @param {string} userId - 사용자 ID
 * @param {Object} userData - 수정할 사용자 데이터
 * @returns {Promise<Object>} 수정 결과
 */
async function updateUser(userId, userData) {
  return put(`/users/${userId}`, userData);
}

/**
 * 사용자 비밀번호 초기화
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 초기화 결과
 */
async function resetUserPassword(userId) {
  return post(`/users/${userId}/reset-password`);
}

/**
 * 사용자 상태 변경
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 변경 결과
 */
async function toggleUserStatus(userId) {
  return post(`/users/${userId}/toggle-status`);
}

/**
 * 인수인계 목록 조회
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Object>} 인수인계 목록
 */
async function getHandoverList(params = {}) {
  return get('/handover/list', params);
}

/**
 * 인수인계 상세 조회
 * @param {number} handoverId - 인수인계 ID
 * @returns {Promise<Object>} 인수인계 상세 정보
 */
async function getHandoverDetail(handoverId) {
  return get(`/handover/handovers/${handoverId}`);
}

/**
 * 인수인계 생성
 * @param {Object} handoverData - 인수인계 데이터
 * @returns {Promise<Object>} 생성 결과
 */
async function createHandover(handoverData) {
  return post('/handover/handovers', handoverData);
}

/**
 * 인수인계 수정
 * @param {number} handoverId - 인수인계 ID
 * @param {Object} handoverData - 수정할 인수인계 데이터
 * @returns {Promise<Object>} 수정 결과
 */
async function updateHandover(handoverId, handoverData) {
  return put(`/handover/handovers/${handoverId}`, handoverData);
}

/**
 * 인수인계 삭제
 * @param {number} handoverId - 인수인계 ID
 * @returns {Promise<Object>} 삭제 결과
 */
async function deleteHandover(handoverId) {
  return del(`/handover/handovers/${handoverId}`);
}

/**
 * 시각화 요약 데이터 조회
 * @param {string} period - 기간 (today, week, month)
 * @returns {Promise<Object>} 요약 데이터
 */
async function getVisualizationSummary(period = 'today') {
  return get(`/visualization/summary?period=${period}`);
}

/**
 * 시간대별 데이터 조회
 * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
 * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
 * @returns {Promise<Object>} 시간대별 데이터
 */
async function getTimeBlockData(startDate, endDate) {
  return get(`/visualization/time-blocks?start_date=${startDate}&end_date=${endDate}`);
}

/**
 * 부서별 상태 데이터 조회
 * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
 * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
 * @returns {Promise<Object>} 부서별 상태 데이터
 */
async function getDepartmentStatusData(startDate, endDate) {
  return get(`/visualization/department-status?start_date=${startDate}&end_date=${endDate}`);
}

/**
 * 일별 추세 데이터 조회
 * @param {number} days - 일수
 * @returns {Promise<Object>} 일별 추세 데이터
 */
async function getDailyTrendData(days = 7) {
  return get(`/visualization/daily-trend?days=${days}`);
}

// 공개 API
window.Api = {
  // 기본 HTTP 메서드
  get,
  post,
  put,
  delete: del,
  
  // 대시보드 API
  getOrderDetail,
  lockOrder,
  unlockOrder,
  createOrder,
  updateOrder,
  deleteOrders,
  updateOrdersStatus,
  assignDriverToOrders,
  
  // 사용자 관리 API
  getUserDetail,
  createUser,
  updateUser,
  resetUserPassword,
  toggleUserStatus,
  
  // 인수인계 API
  getHandoverList,
  getHandoverDetail,
  createHandover,
  updateHandover,
  deleteHandover,
  
  // 시각화 API
  getVisualizationSummary,
  getTimeBlockData,
  getDepartmentStatusData,
  getDailyTrendData
};

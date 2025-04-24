/**
 * API 통신 관련 공통 함수
 */

// API 요청 기본 설정
const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  credentials: 'include'
};

/**
 * API 요청 래퍼 함수
 * @param {string} url - API 엔드포인트 URL
 * @param {Object} options - fetch 옵션
 * @returns {Promise<Object>} 응답 데이터
 */
async function fetchAPI(url, options = {}) {
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
    document.body.classList.add('api-loading');
    
    // API 요청 실행
    const response = await fetch(url, fetchOptions);
    
    // JSON 응답 파싱
    const result = await response.json();
    
    // 요청 완료 후 로딩 표시 제거
    document.body.classList.remove('api-loading');
    
    return result;
  } catch (error) {
    // 요청 완료 후 로딩 표시 제거
    document.body.classList.remove('api-loading');
    
    console.error('API 요청 오류:', error);
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
 * @returns {Promise<Object>} 응답 데이터
 */
async function get(url, params = null) {
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
  
  return fetchAPI(url, { method: 'GET' });
}

/**
 * POST 요청
 * @param {string} url - API 엔드포인트 URL
 * @param {Object} data - 요청 본문 데이터 (객체 형태)
 * @returns {Promise<Object>} 응답 데이터
 */
async function post(url, data = null) {
  const options = {
    method: 'POST'
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  return fetchAPI(url, options);
}

/**
 * PUT 요청
 * @param {string} url - API 엔드포인트 URL
 * @param {Object} data - 요청 본문 데이터 (객체 형태)
 * @returns {Promise<Object>} 응답 데이터
 */
async function put(url, data = null) {
  const options = {
    method: 'PUT'
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  return fetchAPI(url, options);
}

/**
 * DELETE 요청
 * @param {string} url - API 엔드포인트 URL
 * @param {Object} data - 요청 본문 데이터 (객체 형태)
 * @returns {Promise<Object>} 응답 데이터
 */
async function del(url, data = null) {
  const options = {
    method: 'DELETE'
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  return fetchAPI(url, options);
}

/**
 * 주문 상세 정보 조회
 * @param {number} orderId - 주문 ID
 * @returns {Promise<Object>} 주문 상세 정보
 */
async function getOrderDetail(orderId) {
  const result = await get(`/dashboard/api/orders/${orderId}`);
  
  if (!result.success) {
    throw new Error(result.message || '주문 정보를 불러올 수 없습니다.');
  }
  
  return result;
}

/**
 * 주문 락 획득
 * @param {number} orderId - 주문 ID
 * @returns {Promise<Object>} 락 획득 결과
 */
async function lockOrder(orderId) {
  return get(`/dashboard/api/lock/${orderId}`);
}

/**
 * 주문 락 해제
 * @param {number} orderId - 주문 ID
 * @returns {Promise<Object>} 락 해제 결과
 */
async function unlockOrder(orderId) {
  return get(`/dashboard/api/lock/${orderId}`);
}

/**
 * 주문 생성
 * @param {Object} orderData - 주문 데이터
 * @returns {Promise<Object>} 생성 결과
 */
async function createOrder(orderData) {
  return post('/dashboard/api/orders', orderData);
}

/**
 * 주문 수정
 * @param {number} orderId - 주문 ID
 * @param {Object} orderData - 수정할 주문 데이터
 * @returns {Promise<Object>} 수정 결과
 */
async function updateOrder(orderId, orderData) {
  return put(`/dashboard/api/orders/${orderId}`, orderData);
}

/**
 * 주문 삭제
 * @param {Array<number>} orderIds - 삭제할 주문 ID 배열
 * @returns {Promise<Object>} 삭제 결과
 */
async function deleteOrders(orderIds) {
  return post('/dashboard/api/delete', { ids: orderIds });
}

/**
 * 주문 상태 변경
 * @param {Array<number>} orderIds - 변경할 주문 ID 배열
 * @param {string} status - 변경할 상태
 * @returns {Promise<Object>} 변경 결과
 */
async function updateOrdersStatus(orderIds, status) {
  return post('/dashboard/api/status', { ids: orderIds, status: status });
}

/**
 * 기사 배정
 * @param {Array<number>} orderIds - 배정할 주문 ID 배열
 * @param {string} driverName - 기사 이름
 * @param {string} driverContact - 기사 연락처
 * @returns {Promise<Object>} 배정 결과
 */
async function assignDriverToOrders(orderIds, driverName, driverContact) {
  return post('/dashboard/api/driver', { ids: orderIds, driver_name: driverName, driver_contact: driverContact });
}

// 공개 API
window.Api = {
  get,
  post,
  put,
  delete: del,
  getOrderDetail,
  lockOrder,
  unlockOrder,
  createOrder,
  updateOrder,
  deleteOrders,
  updateOrdersStatus,
  assignDriverToOrders
};

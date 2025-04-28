/**
 * API 호출 관련 공통 유틸리티
 * 서버 통신을 표준화하고 캐싱, 에러 처리 등을 제공
 */

(function() {
  'use strict';
  
  // API 호출 트래킹 - 중복 요청 방지용
  const pendingRequests = new Map();
  
  // 캐시 설정
  const apiCache = new Map();
  const DEFAULT_CACHE_TIMEOUT = 30000; // 30초 기본 캐시
  
  /**
   * API 호출 래퍼 함수
   * @param {string} method - HTTP 메서드 (GET, POST, PUT, DELETE)
   * @param {string} url - API URL
   * @param {Object} data - 요청 데이터 (GET 요청에서는 무시됨)
   * @param {Object} options - 추가 옵션
   * @returns {Promise<Object>} 응답 데이터
   */
  async function callApi(method, url, data = null, options = {}) {
    const {
      headers = {},
      cache = false,
      cacheKey = url,
      cacheTimeout = DEFAULT_CACHE_TIMEOUT,
      retries = 1,
      retryDelay = 1000,
      showLoading = true,
      useRequestKey = true
    } = options;
    
    // 요청 키 생성 (중복 요청 추적용)
    const requestKey = useRequestKey ? `${method}:${url}` : null;
    
    // 중복 요청 확인
    if (requestKey && pendingRequests.has(requestKey)) {
      console.log(`[API] 중복 요청 방지: ${requestKey}`);
      return pendingRequests.get(requestKey);
    }
    
    // 캐시 확인 (GET 요청에만 적용)
    if (cache && method.toUpperCase() === 'GET') {
      const cachedData = getCachedData(cacheKey);
      if (cachedData && !cachedData.isExpired) {
        console.log(`[API] 캐시 히트: ${cacheKey}`);
        return cachedData.data;
      }
    }
    
    // 로딩 표시
    let loadingShown = false;
    if (showLoading && window.ModalUtils && typeof window.ModalUtils.toggleLoading === 'function') {
      window.ModalUtils.toggleLoading(true);
      loadingShown = true;
    }
    
    // API 호출 작업 생성
    const apiCall = async (retryCount = 0) => {
      try {
        // API 호출 옵션
        const requestOptions = {
          method: method.toUpperCase(),
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...headers
          },
          credentials: 'same-origin'
        };
        
        // 인증 헤더 추가 (Auth 모듈이 있으면)
        if (window.Auth && window.Auth.TokenAuth) {
          const authHeaders = window.Auth.TokenAuth.getAuthHeaders();
          Object.assign(requestOptions.headers, authHeaders);
        }
        
        // GET이 아닌 메서드에 데이터 추가
        if (method.toUpperCase() !== 'GET' && data) {
          requestOptions.body = JSON.stringify(data);
        }
        
        // 디버깅 로그
        console.log(`[API] ${method.toUpperCase()} 요청: ${url}`);
        const startTime = performance.now();
        
        // 실제 API 호출
        const response = await fetch(url, requestOptions);
        const endTime = performance.now();
        console.log(`[API] 응답 시간: ${Math.round(endTime - startTime)}ms`);
        
        // HTTP 에러 처리
        if (!response.ok) {
          let errorMsg;
          
          try {
            // JSON 형식 오류 응답 처리
            const errorBody = await response.json();
            errorMsg = errorBody.message || `HTTP 오류 ${response.status}: ${response.statusText}`;
          } catch (e) {
            // 일반 텍스트 형식 응답
            errorMsg = await response.text() || `HTTP 오류 ${response.status}`;
          }
          
          throw new Error(errorMsg);
        }
        
        // 응답 데이터 파싱
        let responseData;
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          // JSON이 아닌 응답 처리
          const rawData = await response.text();
          responseData = {
            success: true,
            data: rawData,
            contentType: contentType
          };
        }
        
        // 표준화된 응답 체크
        if (typeof responseData === 'object' && responseData !== null) {
          // success 필드가 없으면 자동 추가
          if (responseData.success === undefined) {
            responseData.success = true;
          }
        } else {
          // 원시값 응답 처리 (예: 문자열, 숫자 등)
          responseData = {
            success: true,
            data: responseData
          };
        }
        
        // 캐싱 (GET 요청에만 적용)
        if (cache && method.toUpperCase() === 'GET') {
          setCachedData(cacheKey, responseData, cacheTimeout);
        }
        
        return responseData;
      } catch (error) {
        console.error(`[API] 오류 (시도 ${retryCount + 1}/${retries + 1}):`, error.message);
        
        // 재시도 로직
        if (retryCount < retries) {
          console.log(`[API] ${retryDelay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return apiCall(retryCount + 1);
        }
        
        // 모든 재시도 실패
        throw error;
      }
    };
    
    // 실제 API 호출 수행
    try {
      // 중복 요청 방지를 위한 Promise 추적
      const apiPromise = apiCall();
      if (requestKey) {
        pendingRequests.set(requestKey, apiPromise);
      }
      
      // API 호출 수행
      const result = await apiPromise;
      return result;
    } catch (error) {
      // 에러 응답 형식화
      return {
        success: false,
        message: error.message || '서버 통신 중 오류가 발생했습니다.',
        error: error.toString(),
        timestamp: new Date().toISOString()
      };
    } finally {
      // 중복 요청 트래킹에서 제거
      if (requestKey) {
        pendingRequests.delete(requestKey);
      }
      
      // 로딩 표시 제거
      if (loadingShown && window.ModalUtils && typeof window.ModalUtils.toggleLoading === 'function') {
        window.ModalUtils.toggleLoading(false);
      }
    }
  }
  
  /**
   * 캐시에서 데이터 가져오기
   * @param {string} key - 캐시 키
   * @returns {Object|null} - 캐시된 데이터 또는 null
   */
  function getCachedData(key) {
    const cachedItem = apiCache.get(key);
    
    if (!cachedItem) {
      return null;
    }
    
    // 유효 기간 확인
    const now = Date.now();
    const isExpired = now - cachedItem.timestamp > cachedItem.timeout;
    
    return {
      data: cachedItem.data,
      timestamp: cachedItem.timestamp,
      isExpired
    };
  }
  
  /**
   * 데이터 캐싱
   * @param {string} key - 캐시 키
   * @param {*} data - 캐싱할 데이터
   * @param {number} timeout - 캐시 유효 시간(ms)
   */
  function setCachedData(key, data, timeout = DEFAULT_CACHE_TIMEOUT) {
    apiCache.set(key, {
      data: data,
      timestamp: Date.now(),
      timeout: timeout,
      hits: 0
    });
    
    console.log(`[API] 데이터 캐시 저장: ${key}, 만료: ${timeout}ms`);
  }
  
  /**
   * 캐시 무효화
   * @param {string} keyPattern - 캐시 키 패턴 (일부일치)
   * @returns {number} - 무효화된 캐시 항목 수
   */
  function invalidateCache(keyPattern = '') {
    let count = 0;
    
    for (const key of apiCache.keys()) {
      if (keyPattern === '' || key.includes(keyPattern)) {
        apiCache.delete(key);
        count++;
      }
    }
    
    console.log(`[API] 캐시 무효화: ${count}개 항목`);
    return count;
  }
  
  /**
   * 모든 캐시 비우기
   */
  function clearCache() {
    const count = apiCache.size;
    apiCache.clear();
    console.log(`[API] 모든 캐시 비움: ${count}개 항목`);
    return count;
  }
  
  /**
   * 간편 GET 요청
   * @param {string} url - API URL
   * @param {Object} options - 추가 옵션
   * @returns {Promise<Object>} 응답 데이터
   */
  function get(url, options = {}) {
    return callApi('GET', url, null, options);
  }
  
  /**
   * 간편 POST 요청
   * @param {string} url - API URL
   * @param {Object} data - 요청 데이터
   * @param {Object} options - 추가 옵션
   * @returns {Promise<Object>} 응답 데이터
   */
  function post(url, data, options = {}) {
    return callApi('POST', url, data, options);
  }
  
  /**
   * 간편 PUT 요청
   * @param {string} url - API URL
   * @param {Object} data - 요청 데이터
   * @param {Object} options - 추가 옵션
   * @returns {Promise<Object>} 응답 데이터
   */
  function put(url, data, options = {}) {
    return callApi('PUT', url, data, options);
  }
  
  /**
   * 간편 DELETE 요청
   * @param {string} url - API URL
   * @param {Object} options - 추가 옵션
   * @returns {Promise<Object>} 응답 데이터
   */
  function del(url, options = {}) {
    return callApi('DELETE', url, null, options);
  }
  
  /**
   * URL 파라미터 추가
   * @param {string} url - 기본 URL
   * @param {Object} params - 파라미터 객체
   * @returns {string} 변환된 URL
   */
  function addUrlParams(url, params = {}) {
    if (!params || Object.keys(params).length === 0) return url;
    
    const urlObj = new URL(url, window.location.origin);
    
    // 기존 파라미터 유지하면서 새 파라미터 추가
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.set(key, value);
      }
    });
    
    return urlObj.toString();
  }
  
  // 공개 API
  window.Api = {
    call: callApi,
    get,
    post, 
    put,
    delete: del,
    invalidateCache,
    clearCache,
    addUrlParams
  };
  
  console.log('[API] API 모듈 초기화 완료');
})();
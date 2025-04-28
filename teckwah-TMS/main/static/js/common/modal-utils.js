/**
 * 모달 유틸리티 함수 모음
 * 모달 관련 공통 기능을 제공하는 모듈
 */

(function() {
  'use strict';
  
  // 이미 초기화되었는지 확인 - 중복 초기화 방지
  if (window.ModalUtils || window.ModalManager) {
    console.log('[Modal Utils] 이미 모달 관리자가 초기화되었습니다.');
    return;
  }
  
  // 캐시 설정 (전역 캐시 관리)
  const dataCache = new Map();
  const DEFAULT_CACHE_TIMEOUT = 60000; // 기본 1분 캐시
  
  // 모달 관리 상태
  const modalState = {
    initialized: new Set(),   // 초기화된 모달 ID
    currentModal: null,       // 현재 열린 모달
    instances: {},            // 모달 인스턴스 저장소
  };
  
  /**
   * 모달 표시
   * @param {string|HTMLElement} modal - 모달 ID 또는 모달 요소
   */
  function showModal(modal) {
    // ID인 경우 요소 가져오기
    const modalElement = typeof modal === 'string' ? document.getElementById(modal) : modal;
    
    if (!modalElement) {
      console.error('[Modal Utils] 모달 요소를 찾을 수 없습니다:', modal);
      return;
    }
    
    // 이미 같은 모달이 열려있으면 무시
    if (modalState.currentModal === modalElement) {
      console.log('[Modal Utils] 모달이 이미 열려있습니다:', modalElement.id);
      return;
    }
    
    // 다른 모달이 열려 있다면 닫기
    if (modalState.currentModal) {
      hideModal(modalState.currentModal);
    }
    
    // 현재 모달 설정
    modalState.currentModal = modalElement;
    
    // 모달 표시
    modalElement.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    // 애니메이션 효과
    setTimeout(function() {
      modalElement.classList.add('show');
    }, 10);
    
    // 이벤트 발생
    const event = new CustomEvent('modalShown', { detail: { modal: modalElement.id } });
    document.dispatchEvent(event);
    
    console.log('[Modal Utils] 모달 표시:', modalElement.id);
  }
  
  /**
   * 모달 숨김
   * @param {string|HTMLElement} modal - 모달 ID 또는 모달 요소
   */
  function hideModal(modal) {
    // ID인 경우 요소 가져오기
    const modalElement = typeof modal === 'string' ? document.getElementById(modal) : modal;
    
    if (!modalElement) {
      console.error('[Modal Utils] 모달 요소를 찾을 수 없습니다:', modal);
      return;
    }
    
    // 현재 모달 초기화
    if (modalState.currentModal === modalElement) {
      modalState.currentModal = null;
    }
    
    // 애니메이션 효과
    modalElement.classList.remove('show');
    
    // 약간의 지연 후 완전히 숨김
    setTimeout(function() {
      modalElement.style.display = 'none';
      
      // 다른 모달이 없으면 body에서 modal-open 클래스 제거
      if (!document.querySelector('.modal.show')) {
        document.body.classList.remove('modal-open');
      }
      
      // 이벤트 발생
      const event = new CustomEvent('modalHidden', { detail: { modal: modalElement.id } });
      document.dispatchEvent(event);
      
      console.log('[Modal Utils] 모달 숨김:', modalElement.id);
    }, 300);
  }
  
  /**
   * 모달 초기화 상태 설정
   * @param {string} modalId - 모달 ID
   */
  function setModalInitialized(modalId) {
    modalState.initialized.add(modalId);
    console.log(`[Modal Utils] 모달 초기화 완료: ${modalId}`);
  }
  
  /**
   * 모달 초기화 상태 확인
   * @param {string} modalId - 모달 ID
   * @returns {boolean} - 초기화 여부
   */
  function isModalInitialized(modalId) {
    return modalState.initialized.has(modalId);
  }
  
  /**
   * 모달 인스턴스 등록
   * @param {string} id - 모달 ID
   * @param {Object} instance - 모달 인스턴스
   * @returns {Object} - 등록된 인스턴스
   */
  function registerModal(id, instance) {
    if (modalState.instances[id]) {
      console.warn(`[Modal Utils] ${id} 모달은 이미 등록되어 있습니다.`);
      return modalState.instances[id];
    }
    
    modalState.instances[id] = instance;
    console.log(`[Modal Utils] ${id} 모달 등록 완료`);
    return instance;
  }
  
  /**
   * 모달 인스턴스 가져오기
   * @param {string} id - 모달 ID
   * @returns {Object} - 모달 인스턴스
   */
  function getModalInstance(id) {
    return modalState.instances[id];
  }
  
  /**
   * 데이터 캐싱
   * @param {string} key - 캐시 키
   * @param {*} data - 캐싱할 데이터
   * @param {Object} options - 캐싱 옵션
   * @param {number} options.timeout - 캐시 유효 시간(ms)
   * @param {Object} options.metadata - 추가 메타데이터
   */
  function cacheData(key, data, options = {}) {
    const { timeout = DEFAULT_CACHE_TIMEOUT, metadata = {} } = options;
    
    // 현재 사용자 ID 가져오기 (데이터 충돌 방지)
    const userId = document.body.dataset.userId || 'anonymous';
    
    // 사용자별 캐시 키 생성
    const cacheKey = `${key}_${userId}`;
    
    // 캐시 저장
    dataCache.set(cacheKey, {
      data: data,
      timestamp: Date.now(),
      timeout: timeout,
      metadata: {
        ...metadata,
        userId,
        version: Date.now(), // 버전 정보
      },
      hits: 0,
    });
    
    console.log(`[Modal Utils] 데이터 캐시 저장: ${cacheKey}, 만료: ${timeout}ms`);
    return cacheKey;
  }
  
  /**
   * 캐시에서 데이터 가져오기
   * @param {string} key - 캐시 키
   * @param {Object} options - 옵션
   * @param {boolean} options.useUserId - 사용자 ID를 키에 포함할지 여부
   * @param {boolean} options.ignoreExpired - 만료된 데이터도 가져올지 여부
   * @returns {Object|null} - 캐시된 데이터 또는 null
   */
  function getCachedData(key, options = {}) {
    const { useUserId = true, ignoreExpired = false } = options;
    
    // 사용자별 캐시 키 생성
    let cacheKey = key;
    if (useUserId) {
      const userId = document.body.dataset.userId || 'anonymous';
      cacheKey = `${key}_${userId}`;
    }
    
    // 캐시 데이터 가져오기
    const cachedItem = dataCache.get(cacheKey);
    
    if (!cachedItem) {
      return null;
    }
    
    // 유효 기간 확인
    const now = Date.now();
    const isExpired = now - cachedItem.timestamp > cachedItem.timeout;
    
    if (isExpired && !ignoreExpired) {
      console.log(`[Modal Utils] 캐시 만료됨: ${cacheKey}`);
      return null;
    }
    
    // 캐시 히트 증가
    cachedItem.hits++;
    dataCache.set(cacheKey, cachedItem);
    
    return {
      data: cachedItem.data,
      metadata: cachedItem.metadata,
      timestamp: cachedItem.timestamp,
      isExpired,
    };
  }
  
  /**
   * 캐시 무효화
   * @param {string} key - 캐시 키 (부분 일치 가능)
   * @param {Object} options - 옵션
   * @param {boolean} options.exactMatch - 정확한 키 일치 필요 여부
   * @param {boolean} options.userSpecific - 사용자별 캐시만 무효화 여부
   */
  function invalidateCache(key, options = {}) {
    const { exactMatch = false, userSpecific = true } = options;
    
    // 현재 사용자 ID
    const userId = userSpecific ? (document.body.dataset.userId || 'anonymous') : null;
    let invalidatedCount = 0;
    
    // 모든 캐시 데이터 검사
    for (const cacheKey of dataCache.keys()) {
      const shouldInvalidate = exactMatch 
        ? cacheKey === key || (userSpecific && cacheKey === `${key}_${userId}`)
        : cacheKey.includes(key) && (!userSpecific || cacheKey.includes(`_${userId}`));
      
      if (shouldInvalidate) {
        dataCache.delete(cacheKey);
        invalidatedCount++;
        console.log(`[Modal Utils] 캐시 무효화: ${cacheKey}`);
      }
    }
    
    console.log(`[Modal Utils] 무효화된 캐시 항목: ${invalidatedCount}개`);
    return invalidatedCount;
  }
  
  /**
   * 캐시 상태 확인
   * @returns {Object} - 캐시 상태 정보
   */
  function getCacheStats() {
    const stats = {
      size: dataCache.size,
      items: [],
    };
    
    for (const [key, value] of dataCache.entries()) {
      const isExpired = Date.now() - value.timestamp > value.timeout;
      
      stats.items.push({
        key,
        timestamp: value.timestamp,
        expired: isExpired,
        hits: value.hits,
        userId: value.metadata.userId,
        version: value.metadata.version,
      });
    }
    
    return stats;
  }
  
  /**
   * API 호출 (표준화)
   * @param {string} method - HTTP 메서드
   * @param {string} url - API URL
   * @param {Object} data - 요청 데이터
   * @param {Object} options - 옵션
   * @returns {Promise<Object>} - 응답 데이터
   */
  async function callApi(method, url, data = null, options = {}) {
    const { headers = {}, cache = false, cacheKey = url } = options;
    
    try {
      // 캐시 확인
      if (cache && method.toUpperCase() === 'GET') {
        const cachedResponse = getCachedData(cacheKey);
        if (cachedResponse && !cachedResponse.isExpired) {
          console.log(`[Modal Utils] API 캐시 히트: ${cacheKey}`);
          return cachedResponse.data;
        }
      }
      
      // API 호출 설정
      const requestOptions = {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...headers,
        },
        credentials: 'same-origin',
      };
      
      // GET이 아닌 경우 요청 데이터 추가
      if (method.toUpperCase() !== 'GET' && data) {
        requestOptions.body = JSON.stringify(data);
      }
      
      // API 호출 실행
      console.log(`[Modal Utils] API 호출: ${method.toUpperCase()} ${url}`);
      const startTime = performance.now();
      
      const response = await fetch(url, requestOptions);
      
      // 응답 시간 측정
      const endTime = performance.now();
      console.log(`[Modal Utils] API 응답 시간: ${Math.round(endTime - startTime)}ms`);
      
      // 응답 확인
      if (!response.ok) {
        // HTTP 오류 처리
        let errorMessage;
        
        try {
          // JSON 응답 시도
          const errorData = await response.json();
          errorMessage = errorData.message || `HTTP 오류: ${response.status}`;
        } catch (e) {
          // 일반 텍스트 응답
          errorMessage = await response.text() || `HTTP 오류: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }
      
      // JSON 응답 파싱
      const responseData = await response.json();
      
      // 캐싱 (GET 요청이고 캐시 옵션이 활성화된 경우)
      if (cache && method.toUpperCase() === 'GET') {
        cacheData(cacheKey, responseData);
      }
      
      return responseData;
    } catch (error) {
      console.error(`[Modal Utils] API 오류: ${error.message}`);
      
      // 표준화된 오류 응답
      return {
        success: false,
        message: error.message || '서버 통신 중 오류가 발생했습니다.',
        error: error.toString(),
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * 로딩 표시 토글
   * @param {boolean} isLoading - 로딩 중 여부
   * @param {Object} options - 옵션
   */
  function toggleLoading(isLoading, options = {}) {
    const { containerId = 'global-loading', text = '처리 중...' } = options;
    
    let loadingElement = document.getElementById(containerId);
    
    if (isLoading) {
      if (!loadingElement) {
        // 로딩 요소 생성
        loadingElement = document.createElement('div');
        loadingElement.id = containerId;
        loadingElement.className = 'global-loading';
        loadingElement.innerHTML = `
          <div class="spinner-container">
            <div class="spinner"></div>
            <div class="spinner-text">${text}</div>
          </div>
        `;
        document.body.appendChild(loadingElement);
      }
      
      loadingElement.style.display = 'flex';
      
      // 이벤트 발생
      const event = new CustomEvent('loadingStarted', { detail: { id: containerId } });
      document.dispatchEvent(event);
    } else if (loadingElement) {
      loadingElement.style.display = 'none';
      
      // 이벤트 발생
      const event = new CustomEvent('loadingFinished', { detail: { id: containerId } });
      document.dispatchEvent(event);
    }
  }
  
  /**
   * 알림 표시
   * @param {string} message - 메시지
   * @param {string} type - 알림 타입 (success, warning, error, info)
   */
  function showAlert(message, type = 'info') {
    // Alerts 모듈 사용 (존재하는 경우)
    if (window.Alerts && typeof window.Alerts[type] === 'function') {
      window.Alerts[type](message);
    } else {
      alert(message);
    }
  }
  
  /**
   * 날짜 포맷팅
   * @param {Date|string} date - 날짜 객체 또는 문자열
   * @param {string} format - 포맷 (예: 'YYYY-MM-DD HH:mm:ss')
   * @returns {string} - 포맷된 날짜 문자열
   */
  function formatDate(date, format = 'YYYY-MM-DD HH:mm') {
    if (!date) return '';
    
    // 문자열이면 Date 객체로 변환
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // 유효한 날짜인지 확인
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    // 년, 월, 일, 시, 분, 초
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    
    // 포맷 적용
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }
  
  /**
   * 우편번호 포맷팅 (자릿수 보정)
   * @param {string} postalCode - 우편번호
   * @returns {string} - 포맷된 우편번호
   */
  function formatPostalCode(postalCode) {
    if (!postalCode) return '';
    
    // 숫자만 추출
    const numbers = postalCode.replace(/[^0-9]/g, '');
    
    // 4자리 → 5자리 변환
    if (numbers.length === 4) {
      return '0' + numbers;
    }
    
    return numbers;
  }
  
  /**
   * 스토리지 항목 저장
   * @param {string} key - 키
   * @param {*} value - 값
   * @param {Object} options - 옵션
   */
  function saveStorage(key, value, options = {}) {
    const { useSession = true, prefix = '', useJSON = true } = options;
    
    // 사용할 스토리지 선택
    const storage = useSession ? sessionStorage : localStorage;
    
    // 키 프리픽스 추가
    const storageKey = prefix ? `${prefix}_${key}` : key;
    
    // 값 변환
    const storageValue = useJSON ? JSON.stringify(value) : value;
    
    // 저장
    storage.setItem(storageKey, storageValue);
  }
  
  /**
   * 스토리지 항목 가져오기
   * @param {string} key - 키
   * @param {Object} options - 옵션
   * @returns {*} - 저장된 값
   */
  function getStorage(key, options = {}) {
    const { useSession = true, prefix = '', useJSON = true, defaultValue = null } = options;
    
    // 사용할 스토리지 선택
    const storage = useSession ? sessionStorage : localStorage;
    
    // 키 프리픽스 추가
    const storageKey = prefix ? `${prefix}_${key}` : key;
    
    // 값 가져오기
    const value = storage.getItem(storageKey);
    
    if (value === null) {
      return defaultValue;
    }
    
    // 값 변환
    return useJSON ? JSON.parse(value) : value;
  }
  
  /**
   * 스토리지 항목 삭제
   * @param {string} key - 키
   * @param {Object} options - 옵션
   */
  function removeStorage(key, options = {}) {
    const { useSession = true, prefix = '' } = options;
    
    // 사용할 스토리지 선택
    const storage = useSession ? sessionStorage : localStorage;
    
    // 키 프리픽스 추가
    const storageKey = prefix ? `${prefix}_${key}` : key;
    
    // 삭제
    storage.removeItem(storageKey);
  }
  
  // DOM 로드 시 모달 초기화
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[Modal Utils] DOM 로드 완료, 모달 초기화');
    
    // 모든 모달 요소 가져오기
    const modals = document.querySelectorAll('.modal');
    
    // 각 모달에 공통 닫기 기능 연결
    modals.forEach(modal => {
      const closeButtons = modal.querySelectorAll('.close-btn, [data-dismiss="modal"]');
      
      closeButtons.forEach(button => {
        // 이벤트 리스너가 이미 연결되었는지 확인
        if (!button.dataset.eventAttached) {
          button.addEventListener('click', function() {
            hideModal(modal);
          });
          button.dataset.eventAttached = 'true';
        }
      });
      
      console.log(`[Modal Utils] '${modal.id}' 모달 닫기 버튼 설정 완료`);
    });
  });
  
  // ESC 키로 모달 닫기
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modalState.currentModal) {
      hideModal(modalState.currentModal);
    }
  });
  
  // 공개 API
  const ModalUtils = {
    showModal,
    hideModal,
    callApi,
    toggleLoading,
    showAlert,
    formatDate,
    formatPostalCode,
    cacheData,
    getCachedData,
    invalidateCache,
    getCacheStats,
    saveStorage,
    getStorage,
    removeStorage,
    // 모달 관리 기능 추가
    setInitialized: setModalInitialized,
    isInitialized: isModalInitialized,
    registerModal: registerModal,
    getModalInstance: getModalInstance
  };
  
  // 전역 변수에 등록
  window.ModalUtils = ModalUtils;
  
  // ModalManager와의 호환성 유지
  window.ModalManager = {
    showModal,
    hideModal,
    setInitialized: setModalInitialized,
    isInitialized: isModalInitialized,
    register: registerModal,
    get: getModalInstance,
    saveStorage,
    getStorage,
    removeStorage
  };
  
  console.log('[Modal Utils] 유틸리티 모듈 초기화 완료');
})();
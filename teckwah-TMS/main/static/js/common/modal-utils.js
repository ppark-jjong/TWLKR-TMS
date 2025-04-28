/**
 * 모달 유틸리티 모듈
 * 모달 표시 및 숨김, 데이터 캐싱 등의 공통 기능을 제공합니다.
 * @module ModalUtils
 */
(function() {
  'use strict';

  // 내부 상태 관리
  const _state = {
    initializedModals: new Set(),  // 초기화된 모달 ID 추적
    activeModal: null,             // 현재 활성화된 모달 ID
    cache: new Map(),              // 데이터 캐시 저장소
    isLoading: false               // 전역 로딩 상태
  };

  // 모듈 기본 설정
  const _config = {
    modalAnimationDuration: 300,   // 모달 애니메이션 지속 시간 (ms)
    cacheExpiration: 5 * 60 * 1000, // 캐시 만료 시간 (ms) - 기본 5분
    debug: true                    // 디버그 모드 활성화 여부
  };

  /**
   * 모달 초기화 상태 설정
   * @param {string} modalId - 모달 ID
   * @returns {boolean} - 성공 여부
   */
  function setInitialized(modalId) {
    if (!modalId) return false;
    _state.initializedModals.add(modalId);
    return true;
  }

  /**
   * 모달이 초기화되었는지 확인
   * @param {string} modalId - 모달 ID
   * @returns {boolean} - 초기화 여부
   */
  function isInitialized(modalId) {
    return _state.initializedModals.has(modalId);
  }

  /**
   * 모달 표시
   * @param {string} modalId - 모달 ID
   * @param {Object} options - 옵션
   * @param {boolean} options.backdrop - 배경 클릭 시 닫기 여부
   * @param {boolean} options.keyboard - ESC 키 누를 시 닫기 여부
   */
  function showModal(modalId, options = {}) {
    const { backdrop = true, keyboard = true } = options;
    const modal = document.getElementById(modalId);
    
    if (!modal) {
      console.error(`[ModalUtils] 모달을 찾을 수 없습니다: ${modalId}`);
      return;
    }
    
    // 기존 활성 모달 처리
    if (_state.activeModal && _state.activeModal !== modalId) {
      const activeModal = document.getElementById(_state.activeModal);
      if (activeModal) {
        activeModal.style.display = 'none';
        activeModal.classList.remove('show');
      }
    }
    
    // 현재 모달 활성화
    _state.activeModal = modalId;
    
    // 모달 표시
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    // 애니메이션 효과
    setTimeout(function() {
      modal.classList.add('show');
    }, 10);
    
    // 배경 클릭 이벤트 처리
    if (backdrop) {
      modal.addEventListener('click', function(event) {
        if (event.target === modal) {
          hideModal(modalId);
        }
      });
    }
    
    // 키보드 이벤트 처리
    if (keyboard) {
      document.addEventListener('keydown', function escKeyHandler(event) {
        if (event.key === 'Escape') {
          hideModal(modalId);
          document.removeEventListener('keydown', escKeyHandler);
        }
      });
    }
    
    // 모달 표시 이벤트 발생
    const showEvent = new CustomEvent('modal:shown', { 
      detail: { modalId, timestamp: new Date().toISOString() } 
    });
    document.dispatchEvent(showEvent);
    
    return true;
  }

  /**
   * 모달 숨김
   * @param {string} modalId - 모달 ID
   */
  function hideModal(modalId) {
    const modal = document.getElementById(modalId || _state.activeModal);
    
    if (!modal) {
      console.error(`[ModalUtils] 모달을 찾을 수 없습니다: ${modalId}`);
      return;
    }
    
    // 애니메이션 효과
    modal.classList.remove('show');
    
    // 약간의 지연 후 완전히 숨김
    setTimeout(function() {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
      
      // 활성 모달 상태 초기화
      if (_state.activeModal === modalId) {
        _state.activeModal = null;
      }
      
      // 모달 숨김 이벤트 발생
      const hideEvent = new CustomEvent('modal:hidden', { 
        detail: { modalId, timestamp: new Date().toISOString() } 
      });
      document.dispatchEvent(hideEvent);
    }, _config.modalAnimationDuration);
    
    return true;
  }

  /**
   * API 호출 함수
   * @param {string} method - HTTP 메서드
   * @param {string} url - API URL
   * @param {Object} data - 요청 데이터
   * @param {Object} options - 옵션
   * @param {boolean} options.cache - 캐시 사용 여부
   * @param {string} options.cacheKey - 캐시 키
   * @returns {Promise<Object>} - 응답 데이터
   */
  async function callApi(method, url, data, options = {}) {
    const { cache = false, cacheKey = url } = options;
    
    // 캐시 사용 시 캐시 확인
    if (cache && method === 'GET') {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    try {
      const requestOptions = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      };
      
      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        requestOptions.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        if (response.status === 401) {
          // 인증 오류 처리
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
          return { success: false, message: '세션이 만료되었습니다. 다시 로그인해주세요.' };
        }
        
        throw new Error(`HTTP 오류: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // GET 요청 결과 캐싱
      if (cache && method === 'GET') {
        cacheData(cacheKey, responseData);
      }
      
      return responseData;
    } catch (error) {
      console.error(`[ModalUtils] API ${method} ${url} 오류:`, error);
      return {
        success: false,
        message: '서버 통신 중 오류가 발생했습니다: ' + error.message
      };
    }
  }

  /**
   * 데이터 캐싱
   * @param {string} key - 캐시 키
   * @param {*} data - 캐시할 데이터
   * @param {number} expirationMs - 만료 시간 (ms)
   */
  function cacheData(key, data, expirationMs = _config.cacheExpiration) {
    _state.cache.set(key, {
      data: data,
      timestamp: Date.now(),
      expiration: Date.now() + expirationMs
    });
  }

  /**
   * 캐시에서 데이터 가져오기
   * @param {string} key - 캐시 키
   * @returns {*} - 캐시된 데이터 또는 null
   */
  function getCachedData(key) {
    if (!_state.cache.has(key)) {
      return null;
    }
    
    const cache = _state.cache.get(key);
    
    // 캐시 만료 확인
    if (Date.now() > cache.expiration) {
      _state.cache.delete(key);
      return null;
    }
    
    return cache.data;
  }

  /**
   * 캐시 무효화
   * @param {string} key - 캐시 키
   * @returns {boolean} - 성공 여부
   */
  function invalidateCache(key) {
    if (key) {
      return _state.cache.delete(key);
    } else {
      _state.cache.clear();
      return true;
    }
  }

  /**
   * 저장소에 데이터 저장
   * @param {string} key - 저장 키
   * @param {*} value - 저장할 데이터
   * @param {Object} options - 옵션
   * @param {boolean} options.useSession - 세션 스토리지 사용 여부
   */
  function saveStorage(key, value, options = {}) {
    const { useSession = false } = options;
    const storage = useSession ? sessionStorage : localStorage;
    
    try {
      if (typeof value === 'object') {
        storage.setItem(key, JSON.stringify(value));
      } else {
        storage.setItem(key, value);
      }
      return true;
    } catch (error) {
      console.error(`[ModalUtils] 저장소 저장 중 오류:`, error);
      return false;
    }
  }

  /**
   * 저장소에서 데이터 가져오기
   * @param {string} key - 저장 키
   * @param {Object} options - 옵션
   * @param {boolean} options.useSession - 세션 스토리지 사용 여부
   * @param {boolean} options.parse - JSON 파싱 여부
   * @returns {*} - 저장된 데이터
   */
  function getStorage(key, options = {}) {
    const { useSession = false, parse = false } = options;
    const storage = useSession ? sessionStorage : localStorage;
    
    try {
      const value = storage.getItem(key);
      
      if (value === null) {
        return null;
      }
      
      if (parse) {
        return JSON.parse(value);
      }
      
      return value;
    } catch (error) {
      console.error(`[ModalUtils] 저장소 조회 중 오류:`, error);
      return null;
    }
  }

  /**
   * 저장소에서 데이터 삭제
   * @param {string} key - 저장 키
   * @param {Object} options - 옵션
   * @param {boolean} options.useSession - 세션 스토리지 사용 여부
   */
  function removeStorage(key, options = {}) {
    const { useSession = false } = options;
    const storage = useSession ? sessionStorage : localStorage;
    
    try {
      storage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[ModalUtils] 저장소 삭제 중 오류:`, error);
      return false;
    }
  }

  /**
   * 로딩 표시 토글
   * @param {boolean} isLoading - 로딩 중 여부
   */
  function toggleLoading(isLoading) {
    _state.isLoading = isLoading;
    
    const loadingOverlay = document.querySelector('.loading-overlay');
    
    if (loadingOverlay) {
      if (isLoading) {
        loadingOverlay.style.display = 'flex';
      } else {
        loadingOverlay.style.display = 'none';
      }
    }
  }

  /**
   * 알림 표시
   * @param {string} message - 메시지
   * @param {string} type - 알림 타입 (success, warning, error, info)
   */
  function showAlert(message, type = 'info') {
    if (window.Alerts && typeof window.Alerts[type] === 'function') {
      window.Alerts[type](message);
    } else {
      alert(message);
    }
  }

  /**
   * 로그 출력
   * @param {string} message - 메시지
   * @param {string} level - 로그 레벨
   * @param {*} data - 추가 데이터
   */
  function log(message, level = 'info', data) {
    if (!_config.debug) return;
    
    const prefix = '[ModalUtils]';
    
    if (window.Logger && typeof window.Logger[level] === 'function') {
      window.Logger[level](`${prefix} ${message}`, data);
    } else {
      console[level](`${prefix} ${message}`, data);
    }
  }

  // 전역 객체 정의
  if (typeof window !== 'undefined') {
    // 공개 API
    window.ModalUtils = {
      // 모달 관리
      setInitialized: setInitialized,
      isInitialized: isInitialized,
      showModal: showModal,
      hideModal: hideModal,
      
      // API 및 데이터 처리
      callApi: callApi,
      cacheData: cacheData,
      getCachedData: getCachedData,
      invalidateCache: invalidateCache,
      
      // 저장소 관리
      saveStorage: saveStorage,
      getStorage: getStorage,
      removeStorage: removeStorage,
      
      // UI 헬퍼
      toggleLoading: toggleLoading,
      showAlert: showAlert,
      log: log
    };
    
    // 디버그 로그
    console.log('[ModalUtils] 모듈 및 API 전역으로 노출됨');
  } else {
    console.error('[ModalUtils] window 객체를 찾을 수 없음');
  }
  
  // 모듈 로드 로그
  console.log('[ModalUtils] 모듈 로드 완료');
})();

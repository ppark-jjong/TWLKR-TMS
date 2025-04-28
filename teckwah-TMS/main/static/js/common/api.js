/**
 * API 통신 모듈
 * 백엔드 서버와의 HTTP 통신을 담당합니다.
 */

const Api = {
  /**
   * 공통 설정
   */
  config: {
    baseUrl: '', // 기본 URL (비워두면 현재 도메인 사용)
    defaultHeaders: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    timeout: 30000 // ms
  },
  
  /**
   * API 공통 요청 함수
   * @param {string} url - API 엔드포인트
   * @param {Object} options - 요청 옵션
   * @returns {Promise<any>} 응답 데이터
   */
  request: async function(url, options = {}) {
    const { method = 'GET', data, headers = {}, showLoading = true } = options;
    
    // 로딩 표시
    if (showLoading) {
      this._showLoading();
    }
    
    try {
      // 완전한 URL 생성
      const fullUrl = this._buildUrl(url);
      
      // 요청 옵션 구성
      const fetchOptions = {
        method,
        headers: {
          ...this.config.defaultHeaders,
          ...headers
        },
        credentials: 'same-origin' // 쿠키 포함
      };
      
      // GET 이외의 메소드에서 데이터 추가
      if (method !== 'GET' && data) {
        fetchOptions.body = JSON.stringify(data);
      }
      
      // fetch 요청 생성 및 타임아웃 설정
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      fetchOptions.signal = controller.signal;
      
      // API 요청 실행
      const response = await fetch(fullUrl, fetchOptions);
      clearTimeout(timeoutId);
      
      // JSON 응답 파싱
      const responseData = await response.json();
      
      // 응답 확인
      if (!response.ok) {
        throw {
          status: response.status,
          data: responseData,
          message: responseData.message || '서버 오류가 발생했습니다.'
        };
      }
      
      return responseData;
    } catch (error) {
      // 오류 처리
      console.error('API 요청 실패:', error);
      
      // 사용자 알림 (모듈 의존성 주의)
      if (window.Notify) {
        window.Notify.error(error.message || '서버 연결에 실패했습니다.');
      }
      
      throw error;
    } finally {
      // 로딩 숨김
      if (showLoading) {
        this._hideLoading();
      }
    }
  },
  
  /**
   * GET 요청
   * @param {string} url - API 엔드포인트
   * @param {Object} options - 요청 옵션
   * @returns {Promise<any>} 응답 데이터
   */
  get: function(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  },
  
  /**
   * POST 요청
   * @param {string} url - API 엔드포인트
   * @param {Object} data - 요청 데이터
   * @param {Object} options - 요청 옵션
   * @returns {Promise<any>} 응답 데이터
   */
  post: function(url, data, options = {}) {
    return this.request(url, { ...options, method: 'POST', data });
  },
  
  /**
   * PUT 요청
   * @param {string} url - API 엔드포인트
   * @param {Object} data - 요청 데이터
   * @param {Object} options - 요청 옵션
   * @returns {Promise<any>} 응답 데이터
   */
  put: function(url, data, options = {}) {
    return this.request(url, { ...options, method: 'PUT', data });
  },
  
  /**
   * DELETE 요청
   * @param {string} url - API 엔드포인트
   * @param {Object} options - 요청 옵션
   * @returns {Promise<any>} 응답 데이터
   */
  delete: function(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  },
  
  /**
   * 완전한 URL 구성
   * @private
   * @param {string} url - API 엔드포인트
   * @returns {string} 완전한 URL
   */
  _buildUrl: function(url) {
    // 이미 완전한 URL인 경우
    if (url.startsWith('http')) {
      return url;
    }
    
    // API 엔드포인트에 baseUrl 적용
    if (this.config.baseUrl) {
      return url.startsWith('/') 
        ? `${this.config.baseUrl}${url}`
        : `${this.config.baseUrl}/${url}`;
    }
    
    // 기본 도메인 사용
    return url;
  },
  
  /**
   * 로딩 표시
   * @private
   */
  _showLoading: function() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
  },
  
  /**
   * 로딩 숨김
   * @private
   */
  _hideLoading: function() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }
};

// 전역 접근을 위해 window 객체에 등록
window.Api = Api;

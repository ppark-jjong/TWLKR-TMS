/**
 * 공통 유틸리티 함수
 * 모든 페이지에서 사용되는 기본 기능들을 제공합니다.
 */

// 전역 네임스페이스 오염 방지
const TMS = {
  /**
   * 알림 표시 기능
   * @param {string} type - 알림 유형 (success, info, warning, error)
   * @param {string} message - 알림 메시지
   * @param {number} duration - 표시 시간(ms), 기본값 5초
   */
  notify: function(type, message, duration = 5000) {
    const container = document.querySelector('.alert-container');
    if (!container) return;
    
    // 알림 요소 생성
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      <div class="alert-content">${message}</div>
      <button class="close-btn">&times;</button>
    `;
    
    // 컨테이너에 추가
    container.appendChild(alert);
    
    // 애니메이션 적용
    setTimeout(() => alert.classList.add('alert-show'), 10);
    
    // 닫기 버튼 이벤트
    const closeBtn = alert.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => this.closeAlert(alert));
    
    // 자동 닫기 타이머
    if (type !== 'error') {
      setTimeout(() => this.closeAlert(alert), duration);
    }
  },
  
  /**
   * 알림 닫기
   * @param {HTMLElement} alert - 알림 요소
   */
  closeAlert: function(alert) {
    alert.classList.remove('alert-show');
    alert.classList.add('alert-hide');
    
    // 애니메이션 후 제거
    setTimeout(() => {
      if (alert.parentNode) {
        alert.parentNode.removeChild(alert);
      }
    }, 300);
  },
  
  /**
   * 날짜 포맷팅 (YYYY-MM-DD)
   * @param {Date|string} date - 날짜 객체 또는 문자열
   * @return {string} 포맷된 날짜 문자열
   */
  formatDate: function(date) {
    if (!date) return '-';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  },
  
  /**
   * 시간 포맷팅 (HH:MM)
   * @param {Date|string} date - 날짜 객체 또는 문자열
   * @return {string} 포맷된 시간 문자열
   */
  formatTime: function(date) {
    if (!date) return '-';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  },
  
  /**
   * API 요청 함수
   */
  api: {
    /**
     * 로딩 표시/숨김
     */
    _showLoading: function() {
      const loadingOverlay = document.querySelector('.loading-overlay');
      if (loadingOverlay) loadingOverlay.style.display = 'flex';
    },
    
    _hideLoading: function() {
      const loadingOverlay = document.querySelector('.loading-overlay');
      if (loadingOverlay) loadingOverlay.style.display = 'none';
    },
    
    /**
     * API 오류 처리
     * @param {Error} error - 오류 객체
     */
    _handleError: function(error) {
      console.error('API 요청 오류:', error);
      
      // 세션 만료 확인
      if (error.status === 401) {
        TMS.notify('error', '세션이 만료되었습니다. 다시 로그인해주세요.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      
      // 일반 오류 메시지
      const message = error.message || '서버 연결에 실패했습니다.';
      TMS.notify('error', message);
    },
    
    /**
     * GET 요청
     * @param {string} url - API 엔드포인트
     * @param {boolean} showLoading - 로딩 표시 여부
     * @return {Promise<any>} 응답 데이터
     */
    get: async function(url, showLoading = true) {
      if (showLoading) this._showLoading();
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw {
            status: response.status,
            message: data.message || '요청 처리 중 오류가 발생했습니다.'
          };
        }
        
        return data;
      } catch (error) {
        this._handleError(error);
        throw error;
      } finally {
        if (showLoading) this._hideLoading();
      }
    },
    
    /**
     * POST 요청
     * @param {string} url - API 엔드포인트
     * @param {Object} data - 요청 데이터
     * @param {boolean} showLoading - 로딩 표시 여부
     * @return {Promise<any>} 응답 데이터
     */
    post: async function(url, data, showLoading = true) {
      if (showLoading) this._showLoading();
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'same-origin',
          body: JSON.stringify(data)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw {
            status: response.status,
            message: responseData.message || '요청 처리 중 오류가 발생했습니다.'
          };
        }
        
        return responseData;
      } catch (error) {
        this._handleError(error);
        throw error;
      } finally {
        if (showLoading) this._hideLoading();
      }
    },
    
    /**
     * PUT 요청
     * @param {string} url - API 엔드포인트
     * @param {Object} data - 요청 데이터
     * @param {boolean} showLoading - 로딩 표시 여부
     * @return {Promise<any>} 응답 데이터
     */
    put: async function(url, data, showLoading = true) {
      if (showLoading) this._showLoading();
      
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'same-origin',
          body: JSON.stringify(data)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw {
            status: response.status,
            message: responseData.message || '요청 처리 중 오류가 발생했습니다.'
          };
        }
        
        return responseData;
      } catch (error) {
        this._handleError(error);
        throw error;
      } finally {
        if (showLoading) this._hideLoading();
      }
    },
    
    /**
     * DELETE 요청
     * @param {string} url - API 엔드포인트
     * @param {boolean} showLoading - 로딩 표시 여부
     * @return {Promise<any>} 응답 데이터
     */
    delete: async function(url, showLoading = true) {
      if (showLoading) this._showLoading();
      
      try {
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw {
            status: response.status,
            message: data.message || '요청 처리 중 오류가 발생했습니다.'
          };
        }
        
        return data;
      } catch (error) {
        this._handleError(error);
        throw error;
      } finally {
        if (showLoading) this._hideLoading();
      }
    }
  },
  
  /**
   * 모달 관련 함수
   */
  modal: {
    /**
     * 모달 열기
     * @param {string} id - 모달 ID
     */
    open: function(id) {
      const modal = document.getElementById(id);
      if (!modal) return;
      
      // 모달 표시
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('show'), 10);
      
      // body 스크롤 방지
      document.body.classList.add('modal-open');
    },
    
    /**
     * 모달 닫기
     * @param {string} id - 모달 ID
     */
    close: function(id) {
      const modal = document.getElementById(id);
      if (!modal) return;
      
      // 모달 숨김
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
      }, 300);
    }
  },
  
  /**
   * 우편번호 처리 (4자리 -> 5자리)
   * @param {string} code - 우편번호
   * @return {string} 5자리 우편번호
   */
  formatPostalCode: function(code) {
    if (!code) return '';
    
    // 숫자만 추출
    const numericCode = code.replace(/\D/g, '');
    
    // 4자리 -> 5자리 변환 (앞에 0 추가)
    if (numericCode.length === 4) {
      return '0' + numericCode;
    }
    
    return numericCode;
  },
  
  /**
   * 공통 UI 초기화
   */
  initUI: function() {
    // 사이드바 토글 초기화
    this.initSidebar();
    
    // 로그아웃 버튼 초기화
    this.initLogoutButton();
    
    // 모달 닫기 버튼 이벤트
    this.initModalCloseButtons();
    
    // 반응형 화면 처리
    this.initResponsive();
  },
  
  /**
   * 사이드바 초기화
   */
  initSidebar: function() {
    const app = document.getElementById('app');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    
    if (sidebarToggleBtn && app) {
      sidebarToggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        app.classList.toggle('sidebar-collapsed');
      });
    }
  },
  
  /**
   * 로그아웃 버튼 초기화
   */
  initLogoutButton: function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        if (window.confirm('로그아웃 하시겠습니까?')) {
          window.location.href = '/logout';
        }
      });
    }
  },
  
  /**
   * 모달 닫기 버튼 초기화
   */
  initModalCloseButtons: function() {
    // 모달 닫기 버튼 이벤트
    document.addEventListener('click', function(e) {
      if (e.target.matches('.modal-close, .close-btn, [data-dismiss="modal"]')) {
        const modal = e.target.closest('.modal');
        if (modal) {
          TMS.modal.close(modal.id);
        }
      }
      
      // 모달 배경 클릭 시 닫기
      if (e.target.matches('.modal')) {
        TMS.modal.close(e.target.id);
      }
    });
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const visibleModal = document.querySelector('.modal.show');
        if (visibleModal) {
          TMS.modal.close(visibleModal.id);
        }
      }
    });
  },
  
  /**
   * 반응형 화면 초기화
   */
  initResponsive: function() {
    const app = document.getElementById('app');
    
    // 모바일 화면에서 사이드바 자동 축소
    function checkMobileView() {
      if (window.innerWidth < 768 && app) {
        app.classList.add('sidebar-collapsed');
      }
    }
    
    // 초기 모바일 체크
    checkMobileView();
    
    // 화면 크기 변경 감지
    window.addEventListener('resize', checkMobileView);
  }
};

// 페이지 로드 시 공통 UI 초기화
document.addEventListener('DOMContentLoaded', function() {
  TMS.initUI();
});

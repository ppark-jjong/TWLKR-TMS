/**
 * 모달 컴포넌트
 * HTML 모달 다이얼로그 제어 기능을 제공합니다.
 */

const Modal = {
  /**
   * 현재 활성화된 모달
   */
  activeModal: null,
  
  /**
   * 설정
   */
  config: {
    animation: true,
    backdrop: true,
    keyboard: true,
    focus: true
  },
  
  /**
   * 초기화
   */
  init: function() {
    // 모달 닫기 버튼 이벤트 설정
    document.addEventListener('click', (e) => {
      if (e.target.matches('.modal-close, .close-btn, [data-dismiss="modal"]')) {
        const modalEl = e.target.closest('.modal');
        if (modalEl) {
          this.hide(modalEl);
        }
      }
    });
    
    // 배경 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (this.config.backdrop && e.target.matches('.modal') && this.activeModal) {
        this.hide(this.activeModal);
      }
    });
    
    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (this.config.keyboard && e.key === 'Escape' && this.activeModal) {
        this.hide(this.activeModal);
      }
    });
  },
  
  /**
   * 모달 표시
   * @param {HTMLElement|string} modal - 모달 요소 또는 셀렉터
   * @param {Object} options - 옵션
   */
  show: function(modal, options = {}) {
    // 모달 요소 가져오기
    const modalEl = typeof modal === 'string' ? document.querySelector(modal) : modal;
    if (!modalEl) {
      console.error('모달을 찾을 수 없습니다:', modal);
      return;
    }
    
    // 이미 활성화된 모달이 있으면 닫기
    if (this.activeModal && this.activeModal !== modalEl) {
      this.hide(this.activeModal);
    }
    
    // Body 스크롤 방지
    document.body.classList.add('modal-open');
    
    // 모달 표시
    modalEl.style.display = 'flex';
    
    // 애니메이션 적용
    if (this.config.animation) {
      // 모달 dialog 요소 가져오기
      const dialogEl = modalEl.querySelector('.modal-dialog') || modalEl.querySelector('.modal-content');
      
      setTimeout(() => {
        modalEl.classList.add('show');
        if (dialogEl) {
          dialogEl.style.opacity = '1';
          dialogEl.style.transform = 'translateY(0)';
        }
      }, 10);
    }
    
    // 활성 모달 설정
    this.activeModal = modalEl;
    
    // 모달 표시 후 이벤트 발생
    this._triggerEvent(modalEl, 'modal:shown');
  },
  
  /**
   * 모달 숨기기
   * @param {HTMLElement|string} modal - 모달 요소 또는 셀렉터
   */
  hide: function(modal) {
    // 모달 요소 가져오기
    const modalEl = typeof modal === 'string' ? document.querySelector(modal) : modal;
    if (!modalEl) {
      console.error('모달을 찾을 수 없습니다:', modal);
      return;
    }
    
    // 애니메이션 적용
    if (this.config.animation) {
      // 모달 dialog 요소 가져오기
      const dialogEl = modalEl.querySelector('.modal-dialog') || modalEl.querySelector('.modal-content');
      
      modalEl.classList.remove('show');
      if (dialogEl) {
        dialogEl.style.opacity = '0';
        dialogEl.style.transform = 'translateY(-20px)';
      }
      
      // 애니메이션 완료 후 숨김
      setTimeout(() => {
        modalEl.style.display = 'none';
        
        // 마지막 모달이 닫히면 body 스크롤 활성화
        const openModals = document.querySelectorAll('.modal[style*="display: flex"]');
        if (openModals.length === 0) {
          document.body.classList.remove('modal-open');
        }
        
        // 활성 모달 초기화
        if (this.activeModal === modalEl) {
          this.activeModal = null;
        }
        
        // 모달 숨김 후 이벤트 발생
        this._triggerEvent(modalEl, 'modal:hidden');
      }, 300);
    } else {
      // 애니메이션 없이 즉시 숨김
      modalEl.style.display = 'none';
      
      // 마지막 모달이 닫히면 body 스크롤 활성화
      const openModals = document.querySelectorAll('.modal[style*="display: flex"]');
      if (openModals.length === 0) {
        document.body.classList.remove('modal-open');
      }
      
      // 활성 모달 초기화
      if (this.activeModal === modalEl) {
        this.activeModal = null;
      }
      
      // 모달 숨김 후 이벤트 발생
      this._triggerEvent(modalEl, 'modal:hidden');
    }
  },
  
  /**
   * 모달 토글
   * @param {HTMLElement|string} modal - 모달 요소 또는 셀렉터
   */
  toggle: function(modal) {
    // 모달 요소 가져오기
    const modalEl = typeof modal === 'string' ? document.querySelector(modal) : modal;
    if (!modalEl) {
      console.error('모달을 찾을 수 없습니다:', modal);
      return;
    }
    
    // 표시 상태에 따라 토글
    if (modalEl.style.display === 'flex') {
      this.hide(modalEl);
    } else {
      this.show(modalEl);
    }
  },
  
  /**
   * 이벤트 트리거
   * @private
   * @param {HTMLElement} element - 대상 요소
   * @param {string} eventName - 이벤트 이름
   */
  _triggerEvent: function(element, eventName) {
    const event = new CustomEvent(eventName, {
      bubbles: true,
      cancelable: true,
      detail: { modal: element }
    });
    
    element.dispatchEvent(event);
  }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  Modal.init();
});

// 전역 접근을 위해 window 객체에 등록
window.Modal = Modal;

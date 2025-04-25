/**
 * 모달 관리 모듈
 * 모달 창 표시, 숨김 및 상호작용 처리
 */
window.Modal = {
  /**
   * 초기화 - 모달 닫기 기능 등을 설정합니다.
   */
  init: function() {
    // 모달 외부 클릭 시 닫기
    document.addEventListener('click', function(event) {
      const modals = document.querySelectorAll('.modal');
      
      modals.forEach(modal => {
        if (modal.classList.contains('active') && 
            event.target === modal && 
            !modal.classList.contains('no-close-on-outside')) {
          Modal.hide(modal);
        }
      });
    });
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal && !activeModal.classList.contains('no-esc-close')) {
          Modal.hide(activeModal);
        }
      }
    });
    
    // 닫기 버튼 이벤트 위임
    document.addEventListener('click', function(event) {
      const closeBtn = event.target.closest('.close-btn, [data-dismiss="modal"]');
      if (closeBtn) {
        const modal = closeBtn.closest('.modal');
        if (modal) {
          Modal.hide(modal);
        }
      }
    });
  },
  
  /**
   * 모달을 표시합니다.
   * @param {string|Element} modal - 모달 선택자 또는 모달 요소
   * @param {Object} options - 추가 옵션
   */
  show: function(modal, options = {}) {
    const modalElement = typeof modal === 'string' ? document.querySelector(modal) : modal;
    
    if (!modalElement) {
      console.error('모달을 찾을 수 없습니다:', modal);
      return;
    }
    
    // 옵션 설정
    if (options.closeOnOutsideClick === false) {
      modalElement.classList.add('no-close-on-outside');
    } else {
      modalElement.classList.remove('no-close-on-outside');
    }
    
    if (options.closeOnEsc === false) {
      modalElement.classList.add('no-esc-close');
    } else {
      modalElement.classList.remove('no-esc-close');
    }
    
    // 콜백 실행
    if (typeof options.onBeforeShow === 'function') {
      options.onBeforeShow(modalElement);
    }
    
    // 모달 표시
    modalElement.style.display = 'flex';
    setTimeout(() => {
      modalElement.classList.add('active');
      
      // 콜백 실행
      if (typeof options.onAfterShow === 'function') {
        options.onAfterShow(modalElement);
      }
    }, 10);
  },
  
  /**
   * 모달을 숨깁니다.
   * @param {string|Element} modal - 모달 선택자 또는 모달 요소
   * @param {Object} options - 추가 옵션
   */
  hide: function(modal, options = {}) {
    const modalElement = typeof modal === 'string' ? document.querySelector(modal) : modal;
    
    if (!modalElement) {
      console.error('모달을 찾을 수 없습니다:', modal);
      return;
    }
    
    // 콜백 실행
    if (typeof options.onBeforeHide === 'function') {
      const shouldProceed = options.onBeforeHide(modalElement);
      if (shouldProceed === false) {
        return; // 콜백이 false를 반환하면 모달 숨김 취소
      }
    }
    
    // 모달 숨김
    modalElement.classList.remove('active');
    setTimeout(() => {
      modalElement.style.display = 'none';
      
      // 콜백 실행
      if (typeof options.onAfterHide === 'function') {
        options.onAfterHide(modalElement);
      }
    }, 300);
  },
  
  /**
   * 모달 내용을 업데이트합니다.
   * @param {string|Element} modal - 모달 선택자 또는 모달 요소
   * @param {string} bodyContent - 모달 본문 HTML 내용
   * @param {string} title - 모달 제목 (선택 사항)
   */
  update: function(modal, bodyContent, title) {
    const modalElement = typeof modal === 'string' ? document.querySelector(modal) : modal;
    
    if (!modalElement) {
      console.error('모달을 찾을 수 없습니다:', modal);
      return;
    }
    
    // 모달 본문 업데이트
    const modalBody = modalElement.querySelector('.modal-body');
    if (modalBody && bodyContent) {
      modalBody.innerHTML = bodyContent;
    }
    
    // 모달 제목 업데이트
    if (title) {
      const modalTitle = modalElement.querySelector('.modal-title');
      if (modalTitle) {
        modalTitle.textContent = title;
      }
    }
  },
  
  /**
   * 모달 폼을 초기화합니다.
   * @param {string|Element} modal - 모달 선택자 또는 모달 요소
   */
  resetForm: function(modal) {
    const modalElement = typeof modal === 'string' ? document.querySelector(modal) : modal;
    
    if (!modalElement) {
      console.error('모달을 찾을 수 없습니다:', modal);
      return;
    }
    
    const form = modalElement.querySelector('form');
    if (form) {
      form.reset();
      
      // 유효성 검증 클래스 제거
      const invalidInputs = form.querySelectorAll('.is-invalid');
      invalidInputs.forEach(input => {
        input.classList.remove('is-invalid');
      });
      
      // 오류 메시지 제거
      const errorMessages = form.querySelectorAll('.invalid-feedback');
      errorMessages.forEach(message => {
        message.remove();
      });
    }
  },
  
  /**
   * 모달 폼을 채웁니다.
   * @param {string|Element} modal - 모달 선택자 또는 모달 요소
   * @param {Object} data - 폼 데이터
   */
  fillForm: function(modal, data) {
    const modalElement = typeof modal === 'string' ? document.querySelector(modal) : modal;
    
    if (!modalElement || !data) {
      console.error('모달이나 데이터가 유효하지 않습니다.');
      return;
    }
    
    const form = modalElement.querySelector('form');
    if (!form) {
      console.error('모달 내 폼을 찾을 수 없습니다.');
      return;
    }
    
    // 폼 요소를 데이터로 채우기
    Object.entries(data).forEach(([key, value]) => {
      const input = form.elements[key];
      
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = !!value;
        } else if (input.type === 'radio') {
          const radio = form.querySelector(`input[name="${key}"][value="${value}"]`);
          if (radio) {
            radio.checked = true;
          }
        } else if (input.tagName === 'SELECT') {
          const option = input.querySelector(`option[value="${value}"]`);
          if (option) {
            option.selected = true;
          }
        } else {
          input.value = value !== null && value !== undefined ? value : '';
        }
      }
    });
  },
  
  /**
   * 폼의 유효성을 검사합니다.
   * @param {HTMLFormElement} form - 폼 요소
   * @returns {boolean} - 유효성 여부
   */
  validateForm: function(form) {
    if (!form || !(form instanceof HTMLFormElement)) {
      console.error('유효한 폼이 아닙니다.');
      return false;
    }
    
    let isValid = true;
    
    // 기존 유효성 검증 상태 제거
    form.querySelectorAll('.is-invalid').forEach(input => {
      input.classList.remove('is-invalid');
    });
    
    form.querySelectorAll('.invalid-feedback').forEach(feedback => {
      feedback.remove();
    });
    
    // required 속성 확인
    form.querySelectorAll('[required]').forEach(input => {
      if (input.disabled || input.hidden) return;
      
      let fieldValue = input.value.trim();
      let isFieldValid = true;
      let errorMessage = '';
      
      // 값 존재 여부 검사
      if (!fieldValue) {
        isFieldValid = false;
        errorMessage = '이 필드는 필수입니다.';
      }
      // 패턴 검사
      else if (input.pattern && !new RegExp(input.pattern).test(fieldValue)) {
        isFieldValid = false;
        errorMessage = input.title || '올바른 형식이 아닙니다.';
      }
      // 유형별 검사
      else if (input.type === 'email' && !/\S+@\S+\.\S+/.test(fieldValue)) {
        isFieldValid = false;
        errorMessage = '유효한 이메일 주소를 입력하세요.';
      }
      
      // 유효하지 않은 필드 표시
      if (!isFieldValid) {
        isValid = false;
        input.classList.add('is-invalid');
        
        // 오류 메시지 추가
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = errorMessage;
        
        if (input.parentNode) {
          input.parentNode.appendChild(feedback);
        }
      }
    });
    
    return isValid;
  }
};

// 페이지 로드 시 모달 모듈 초기화
document.addEventListener('DOMContentLoaded', function() {
  Modal.init();
});

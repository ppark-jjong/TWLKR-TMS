/**
 * 모달 관련 공통 기능
 */

/**
 * 모달 창 열기
 * @param {HTMLElement|string} modal - 모달 요소 또는 CSS 선택자
 */
function openModal(modal) {
  // 문자열(선택자)인 경우 요소 찾기
  if (typeof modal === 'string') {
    modal = document.querySelector(modal);
  }
  
  if (!modal) return;
  
  // 모달 표시
  modal.style.display = 'block';
  
  // 스크롤 방지
  document.body.style.overflow = 'hidden';
  
  // 포커스 설정 (첫 번째 입력 필드 또는 모달 자체)
  const firstInput = modal.querySelector('input, select, textarea, button:not([type="close"])');
  if (firstInput) {
    firstInput.focus();
  } else {
    modal.focus();
  }
  
  // 모달 열림 이벤트 발생
  const event = new CustomEvent('modalOpened', { detail: { modal } });
  document.dispatchEvent(event);
}

/**
 * 모달 창 닫기
 * @param {HTMLElement|string} modal - 모달 요소 또는 CSS 선택자
 */
function closeModal(modal) {
  // 문자열(선택자)인 경우 요소 찾기
  if (typeof modal === 'string') {
    modal = document.querySelector(modal);
  }
  
  if (!modal) return;
  
  // 모달 숨기기
  modal.style.display = 'none';
  
  // 스크롤 복원
  document.body.style.overflow = '';
  
  // 모달 닫힘 이벤트 발생
  const event = new CustomEvent('modalClosed', { detail: { modal } });
  document.dispatchEvent(event);
}

/**
 * 모달에 spinner 표시
 * @param {HTMLElement|string} modal - 모달 요소 또는 CSS 선택자
 * @param {boolean} show - 표시 여부
 */
function toggleModalSpinner(modal, show = true) {
  // 문자열(선택자)인 경우 요소 찾기
  if (typeof modal === 'string') {
    modal = document.querySelector(modal);
  }
  
  if (!modal) return;
  
  // 모달 내부의 spinner 요소 찾기
  const spinner = modal.querySelector('.loading-spinner');
  if (!spinner) return;
  
  // spinner 표시/숨김
  spinner.style.display = show ? 'flex' : 'none';
  
  // 입력 필드 비활성화/활성화
  const inputs = modal.querySelectorAll('input, select, textarea, button:not(.close-btn)');
  inputs.forEach(input => {
    input.disabled = show;
  });
}

/**
 * 알림 모달 생성 및 표시
 * @param {string} message - 표시할 메시지
 * @param {string} type - 알림 타입 ('info', 'success', 'warning', 'error')
 * @param {number} duration - 자동 닫힘 시간 (밀리초, 0이면 자동 닫힘 없음)
 */
function showAlert(message, type = 'info', duration = 3000) {
  // 기존 알림 모달 제거
  const existingAlert = document.querySelector('#alertModal');
  if (existingAlert) {
    existingAlert.remove();
  }
  
  // 타입별 아이콘 및 색상 설정
  const icons = {
    info: '<i class="fas fa-info-circle"></i>',
    success: '<i class="fas fa-check-circle"></i>',
    warning: '<i class="fas fa-exclamation-triangle"></i>',
    error: '<i class="fas fa-times-circle"></i>'
  };
  
  const colors = {
    info: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#f5222d'
  };
  
  // 알림 모달 요소 생성
  const alertModal = document.createElement('div');
  alertModal.id = 'alertModal';
  alertModal.className = 'alert-modal';
  alertModal.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    padding: 16px 24px;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 2000;
    display: flex;
    align-items: center;
    min-width: 300px;
    max-width: 80%;
    border-left: 4px solid ${colors[type] || colors.info};
  `;
  
  // 알림 내용 설정
  alertModal.innerHTML = `
    <div class="alert-icon" style="margin-right: 12px; color: ${colors[type] || colors.info};">
      ${icons[type] || icons.info}
    </div>
    <div class="alert-message" style="flex: 1;">
      ${message}
    </div>
    <div class="alert-close" style="margin-left: 12px; cursor: pointer;">
      <i class="fas fa-times"></i>
    </div>
  `;
  
  // 알림 모달 추가
  document.body.appendChild(alertModal);
  
  // 닫기 버튼 클릭 이벤트
  const closeBtn = alertModal.querySelector('.alert-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      alertModal.remove();
    });
  }
  
  // 자동 닫힘 설정
  if (duration > 0) {
    setTimeout(() => {
      if (alertModal.parentNode) {
        alertModal.remove();
      }
    }, duration);
  }
  
  return alertModal;
}

/**
 * 확인 모달 생성 및 표시
 * @param {string} message - 표시할 메시지
 * @param {Function} onConfirm - 확인 버튼 클릭 시 실행할 콜백 함수
 * @param {Function} onCancel - 취소 버튼 클릭 시 실행할 콜백 함수
 * @param {Object} options - 추가 옵션 (title, confirmText, cancelText)
 */
function showConfirm(message, onConfirm, onCancel = null, options = {}) {
  // 기존 확인 모달 제거
  const existingConfirm = document.querySelector('#confirmModal');
  if (existingConfirm) {
    existingConfirm.remove();
  }
  
  // 옵션 기본값 설정
  const title = options.title || '확인';
  const confirmText = options.confirmText || '확인';
  const cancelText = options.cancelText || '취소';
  const type = options.type || 'info';
  
  // 타입별 스타일 설정
  const buttonStyle = type === 'danger' ? 'danger-btn' : 'primary-btn';
  
  // 확인 모달 요소 생성
  const confirmModal = document.createElement('div');
  confirmModal.id = 'confirmModal';
  confirmModal.className = 'modal';
  confirmModal.style.cssText = `
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 2000;
    overflow-y: auto;
  `;
  
  // 확인 모달 내용 설정
  confirmModal.innerHTML = `
    <div class="modal-dialog modal-sm" style="margin: 60px auto; max-width: 400px; width: calc(100% - 32px);">
      <div class="modal-content" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
        <div class="modal-header" style="padding: 16px 24px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
          <h3 class="modal-title" style="margin: 0; font-size: 18px; font-weight: 600;">${title}</h3>
          <button type="button" class="close-btn" style="background: none; border: none; font-size: 18px; cursor: pointer;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body" style="padding: 24px;">
          <p>${message}</p>
        </div>
        <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid #f0f0f0; text-align: right; display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="cancel-btn secondary-btn" style="padding: 8px 16px; border-radius: 4px; cursor: pointer; background-color: white; color: #666; border: 1px solid #d9d9d9;">${cancelText}</button>
          <button type="button" class="confirm-btn ${buttonStyle}" style="padding: 8px 16px; border-radius: 4px; cursor: pointer;">${confirmText}</button>
        </div>
      </div>
    </div>
  `;
  
  // 확인 모달 추가
  document.body.appendChild(confirmModal);
  
  // 버튼 클릭 이벤트
  const closeBtn = confirmModal.querySelector('.close-btn');
  const cancelBtn = confirmModal.querySelector('.cancel-btn');
  const confirmBtn = confirmModal.querySelector('.confirm-btn');
  
  // 모달 닫기 함수
  const closeConfirmModal = () => {
    confirmModal.remove();
    document.body.style.overflow = '';
  };
  
  // 닫기 버튼 클릭 이벤트
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeConfirmModal();
      if (onCancel) onCancel();
    });
  }
  
  // 취소 버튼 클릭 이벤트
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      closeConfirmModal();
      if (onCancel) onCancel();
    });
  }
  
  // 확인 버튼 클릭 이벤트
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      closeConfirmModal();
      if (onConfirm) onConfirm();
    });
  }
  
  // 모달 외부 클릭 이벤트 (옵션)
  if (options.closeOnClickOutside) {
    confirmModal.addEventListener('click', (event) => {
      if (event.target === confirmModal) {
        closeConfirmModal();
        if (onCancel) onCancel();
      }
    });
  }
  
  // 스크롤 방지
  document.body.style.overflow = 'hidden';
  
  // 확인 버튼에 포커스
  confirmBtn.focus();
  
  return confirmModal;
}

// 공개 API
window.Modal = {
  open: openModal,
  close: closeModal,
  toggleSpinner: toggleModalSpinner,
  alert: showAlert,
  confirm: showConfirm
};

// 문서 로드 완료 시 모달 관련 이벤트 리스너 초기화
document.addEventListener('DOMContentLoaded', function() {
  // 모든 모달 닫기 버튼에 이벤트 등록
  document.querySelectorAll('.close-btn, [data-dismiss="modal"]').forEach(button => {
    const modalId = button.getAttribute('data-target') || 
                   button.closest('.modal')?.id;
    
    if (modalId) {
      button.addEventListener('click', function() {
        closeModal(`#${modalId}`);
      });
    }
  });
  
  // ESC 키 누르면 열린 모달 닫기
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal[style*="display: block"]');
      if (openModals.length > 0) {
        closeModal(openModals[openModals.length - 1]);
      }
    }
  });
});

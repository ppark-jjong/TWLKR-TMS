/**
 * 모달 관리 모듈 (개선된 버전)
 * 모달 창 표시, 숨김 및 이벤트 처리를 담당합니다.
 */
const ModalManager = (function() {
  // 모달 초기화 여부
  let initialized = false;
  
  // 현재 활성화된 모달 추적
  let activeModals = [];
  
  // 사이드바 참조
  let sidebar = null;
  
  /**
   * 모달 초기화
   */
  function initModals() {
    if (initialized) return;
    
    sidebar = document.getElementById('sidebar');
    
    // 모달 닫기 버튼에 이벤트 리스너 추가
    document.querySelectorAll('[data-modal]').forEach(button => {
      // 이벤트 중복 방지를 위해 기존 이벤트 리스너 제거
      button.removeEventListener('click', closeModalHandler);
      button.addEventListener('click', closeModalHandler);
    });
    
    // 모달 오버레이에 이벤트 리스너 추가
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      // 이벤트 중복 방지를 위해 기존 이벤트 리스너 제거
      overlay.removeEventListener('click', overlayClickHandler);
      overlay.addEventListener('click', overlayClickHandler);
    });
    
    // 모달 컨텐츠에 클릭 이벤트 전파 방지 추가
    document.querySelectorAll('.modal-content').forEach(content => {
      // 이벤트 중복 방지를 위해 기존 이벤트 리스너 제거
      content.removeEventListener('click', stopPropagation);
      content.addEventListener('click', stopPropagation);
    });
    
    // ESC 키로 모달 닫기 기능 추가
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && activeModals.length > 0) {
        closeModal(activeModals[activeModals.length - 1]);
      }
    });
    
    // 초기화 완료
    initialized = true;
    console.log('모달 매니저 초기화 완료');
  }
  
  /**
   * 이벤트 전파 중지 처리 함수
   */
  function stopPropagation(e) {
    e.stopPropagation();
  }
  
  /**
   * 닫기 버튼 클릭 핸들러
   */
  function closeModalHandler(e) {
    const modalId = e.currentTarget.getAttribute('data-modal');
    closeModal(modalId);
  }
  
  /**
   * 오버레이 클릭 핸들러
   */
  function overlayClickHandler(e) {
    if (e.target.classList.contains('modal-overlay')) {
      const modal = e.target.closest('.modal');
      if (modal && modal.id) {
        closeModal(modal.id);
      }
    }
  }
  
  /**
   * 모달 열기
   * @param {string} modalId 열 모달의 ID
   */
  function openModal(modalId) {
    // 초기화되지 않았으면 초기화
    if (!initialized) {
      initModals();
    }
    
    // 모달 찾기
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`모달 찾을 수 없음: ${modalId}`);
      return;
    }
    
    // 이미 열려있는 모달인지 확인 (중복 실행 방지)
    if (activeModals.includes(modalId)) {
      return;
    }
    
    // 동시에 여러 모달이 열리는 문제 방지를 위해 모든 모달 닫기
    closeAllModals();
    
    // 모달 표시
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    
    // 사이드바에 반투명 오버레이 효과 적용
    if (sidebar) {
      sidebar.classList.add('modal-active');
    }
    
    // 활성 모달 추가
    activeModals.push(modalId);
    
    // 폼 필드 초기화 (선택적)
    resetFormFields(modal);
    
    // 커스텀 이벤트 발생
    document.dispatchEvent(new CustomEvent('modal:opened', { detail: { modalId } }));
    
    console.log(`모달 열림: ${modalId}`);
  }
  
  /**
   * 모달 내 폼 필드 초기화 (옵션)
   * @param {HTMLElement} modal 초기화할 모달 요소
   */
  function resetFormFields(modal) {
    // 자동 초기화가 필요하지 않은 모달은 제외
    const noResetModals = ['orderDetailModal', 'editOrderModal', 'assignDriverModal'];
    if (noResetModals.includes(modal.id)) {
      return;
    }
    
    // 입력 필드 초기화
    modal.querySelectorAll('input:not([type="hidden"]):not([readonly]), textarea').forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });
    
    // 선택 상자 초기화 (첫 번째 옵션으로)
    modal.querySelectorAll('select').forEach(select => {
      if (select.options.length > 0) {
        select.selectedIndex = 0;
      }
    });
  }
  
  /**
   * 모달 닫기
   * @param {string} modalId 닫을 모달의 ID
   */
  function closeModal(modalId) {
    // 모달 찾기
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`모달 찾을 수 없음: ${modalId}`);
      return;
    }
    
    // 모달 숨기기
    modal.classList.remove('active');
    
    // 활성 모달 목록에서 제거
    activeModals = activeModals.filter(id => id !== modalId);
    
    // 모든 모달이 닫혔으면 body 클래스 제거
    if (activeModals.length === 0) {
      document.body.classList.remove('modal-open');
      
      // 사이드바에서 반투명 오버레이 효과 제거
      if (sidebar) {
        sidebar.classList.remove('modal-active');
      }
    }
    
    // 커스텀 이벤트 발생
    document.dispatchEvent(new CustomEvent('modal:closed', { detail: { modalId } }));
    
    console.log(`모달 닫힘: ${modalId}`);
  }
  
  /**
   * 모든 모달 닫기
   */
  function closeAllModals() {
    const modalsToClose = [...activeModals];
    
    modalsToClose.forEach(modalId => {
      closeModal(modalId);
    });
    
    // 모든 모달 직접 초기화
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('active');
    });
    
    // 활성 모달 배열 초기화
    activeModals = [];
    
    // body 클래스 제거
    document.body.classList.remove('modal-open');
    
    // 사이드바에서 반투명 오버레이 효과 제거
    if (sidebar) {
      sidebar.classList.remove('modal-active');
    }
  }
  
  /**
   * 현재 활성화된 모달 확인
   * @returns {Array} 활성화된 모달 ID 배열
   */
  function getActiveModals() {
    return [...activeModals];
  }
  
  // 공개 API
  return {
    initModals,
    openModal,
    closeModal,
    closeAllModals,
    getActiveModals
  };
})();

// 전역 객체로 내보내기
window.ModalManager = ModalManager;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  ModalManager.initModals();
  
  // 사이드바 모달 효과 적용
  const style = document.createElement('style');
  style.textContent = `
    /* 모달 오버레이 효과 및 애니메이션 */
    .modal-overlay {
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    
    .modal.active .modal-overlay {
      opacity: 1;
    }
    
    .modal-content {
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.3s ease;
    }
    
    .modal.active .modal-content {
      transform: translateY(0);
      opacity: 1;
    }
    
    /* 사이드바 오버레이 효과 */
    .sidebar.modal-active {
      opacity: 0.7;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    
    /* 모달 열릴 때 스크롤 방지 */
    body.modal-open {
      overflow: hidden;
    }
  `;
  document.head.appendChild(style);
});

/**
 * 간단한 모달 관리 모듈
 * 프로토타입용 필수 기능만 제공
 */

// 현재 활성화된 모달 ID
let activeModal = null;

// 모달 초기화
function initModals() {
  // 모든 모달 숨기기
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
  
  // 닫기 버튼에 이벤트 추가
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });
  
  // 모달 오버레이 클릭 시 닫기
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      // 오버레이 영역 클릭 시에만 닫기 (모달 내부 클릭은 무시)
      if (e.target === overlay) {
        const modal = overlay.closest('.modal');
        if (modal) closeModal(modal.id);
      }
    });
  });
  
  // ESC 키로 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeModal) {
      closeModal(activeModal);
    }
  });
  
  console.log('모달 초기화 완료');
}

// 모달 열기
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`모달을 찾을 수 없음: ${modalId}`);
    return;
  }
  
  // 이미 열린 모달 닫기
  if (activeModal) {
    document.getElementById(activeModal).style.display = 'none';
  }
  
  // 선택한 모달 표시
  modal.style.display = 'block';
  document.body.classList.add('modal-open');
  
  // 활성 모달 ID 저장
  activeModal = modalId;
  
  console.log(`모달 열림: ${modalId}`);
}

// 모달 닫기
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`모달을 찾을 수 없음: ${modalId}`);
    return;
  }
  
  modal.style.display = 'none';
  document.body.classList.remove('modal-open');
  
  // 활성 모달 초기화
  if (activeModal === modalId) {
    activeModal = null;
  }
  
  console.log(`모달 닫힘: ${modalId}`);
}

// 모달 내용 설정
function setModalContent(modalId, title, content) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  const titleEl = modal.querySelector('.modal-title');
  const contentEl = modal.querySelector('.modal-content');
  
  if (titleEl) titleEl.textContent = title;
  if (contentEl) contentEl.innerHTML = content;
}

/**
 * 메시지 팝업 시스템
 * 사용자에게 알림 메시지를 표시하는 기능
 */

// 메시지 타이머 변수
let messageTimer = null;

// 메시지 시스템 초기화
function initMessages() {
  // HTML에 메시지 요소가 없으면 생성
  if (!document.getElementById('messagePopup')) {
    const messageEl = document.createElement('div');
    messageEl.id = 'messagePopup';
    messageEl.className = 'message-popup';
    messageEl.innerHTML = `
      <div class="message-content">
        <i class="message-icon"></i>
        <span class="message-text"></span>
      </div>
    `;
    document.body.appendChild(messageEl);
  }
}

// 메시지 표시 함수
function showMessage(message, type = 'info', duration = 3000) {
  const messageEl = document.getElementById('messagePopup');
  if (!messageEl) {
    console.error('메시지 요소를 찾을 수 없음');
    return;
  }
  
  // 메시지 타입에 따른 클래스 설정
  messageEl.className = 'message-popup';
  messageEl.classList.add(`message-${type}`);
  
  // 메시지 내용 설정
  const textEl = messageEl.querySelector('.message-text');
  if (textEl) textEl.textContent = message;
  
  // 아이콘 설정
  const iconEl = messageEl.querySelector('.message-icon');
  if (iconEl) {
    iconEl.className = 'message-icon';
    
    switch(type) {
      case 'success': iconEl.classList.add('fa-check-circle'); break;
      case 'error': iconEl.classList.add('fa-times-circle'); break;
      case 'warning': iconEl.classList.add('fa-exclamation-triangle'); break;
      default: iconEl.classList.add('fa-info-circle');
    }
  }
  
  // 메시지 표시
  messageEl.classList.add('active');
  
  // 기존 타이머 제거
  if (messageTimer) clearTimeout(messageTimer);
  
  // 새 타이머 설정
  messageTimer = setTimeout(() => {
    messageEl.classList.remove('active');
  }, duration);
}

// 편의 함수들
function showSuccess(message) { showMessage(message, 'success'); }
function showError(message) { showMessage(message, 'error'); }
function showWarning(message) { showMessage(message, 'warning'); }
function showInfo(message) { showMessage(message, 'info'); }

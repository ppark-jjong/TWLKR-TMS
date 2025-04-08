/**
 * 메시지 관리 모듈
 */
const MessageManager = (function() {
  // 메시지 타이머
  let messageTimer = null;
  
  /**
   * 메시지 표시
   * @param {string} message 표시할 메시지
   * @param {string} type 메시지 타입 (success, error, warning, info)
   * @param {number} duration 표시 시간 (ms)
   */
  function showMessage(message, type = 'info', duration = 3000) {
    const messageEl = document.getElementById('messagePopup');
    if (!messageEl) return;
    
    const messageText = messageEl.querySelector('.message-text');
    const messageIcon = messageEl.querySelector('.message-icon');
    
    // 타입에 따른 아이콘과 클래스 설정
    let iconClass = 'fa-info-circle';
    messageEl.className = 'message-popup';
    
    if (type === 'success') {
      iconClass = 'fa-check-circle';
      messageEl.classList.add('message-success');
    } else if (type === 'error') {
      iconClass = 'fa-times-circle';
      messageEl.classList.add('message-error');
    } else if (type === 'warning') {
      iconClass = 'fa-exclamation-triangle';
      messageEl.classList.add('message-warning');
    } else {
      messageEl.classList.add('message-info');
    }
    
    // 아이콘 및 메시지 설정
    messageIcon.className = `fa-solid ${iconClass} message-icon`;
    messageText.textContent = message;
    
    // 메시지 표시
    messageEl.classList.add('active');
    
    // 타이머 설정
    if (messageTimer) {
      clearTimeout(messageTimer);
    }
    
    messageTimer = setTimeout(() => {
      messageEl.classList.remove('active');
    }, duration);
  }
  
  /**
   * 성공 메시지
   * @param {string} message 표시할 메시지
   * @param {number} duration 표시 시간 (ms)
   */
  function success(message, duration = 3000) {
    showMessage(message, 'success', duration);
  }
  
  /**
   * 에러 메시지
   * @param {string} message 표시할 메시지
   * @param {number} duration 표시 시간 (ms)
   */
  function error(message, duration = 3000) {
    showMessage(message, 'error', duration);
  }
  
  /**
   * 경고 메시지
   * @param {string} message 표시할 메시지
   * @param {number} duration 표시 시간 (ms)
   */
  function warning(message, duration = 3000) {
    showMessage(message, 'warning', duration);
  }
  
  /**
   * 정보 메시지
   * @param {string} message 표시할 메시지
   * @param {number} duration 표시 시간 (ms)
   */
  function info(message, duration = 3000) {
    showMessage(message, 'info', duration);
  }
  
  /**
   * 메시지 팝업 초기화
   */
  function init() {
    const messagePopup = document.getElementById('messagePopup');
    if (!messagePopup) return;
    
    // 팝업 클릭 시 숨기기
    messagePopup.addEventListener('click', function() {
      messagePopup.classList.remove('active');
      if (messageTimer) {
        clearTimeout(messageTimer);
        messageTimer = null;
      }
    });
    
    console.log('메시지 매니저 초기화 완료');
  }
  
  // 공개 API
  return {
    init,
    showMessage,
    success,
    error,
    warning,
    info
  };
})();

// 전역 객체로 내보내기
window.MessageManager = MessageManager;

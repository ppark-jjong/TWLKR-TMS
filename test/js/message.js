/**
 * 메시지 알림 모듈
 * Ant Design 스타일 메시지 알림 제공
 */

// 기본 메시지 타입 별 아이콘 매핑
const MESSAGE_ICONS = {
  success: '<i class="fas fa-check-circle"></i>',
  error: '<i class="fas fa-times-circle"></i>',
  warning: '<i class="fas fa-exclamation-circle"></i>',
  info: '<i class="fas fa-info-circle"></i>'
};

// 기본 메시지 표시 시간 (ms)
const DEFAULT_DURATION = 3000;

// 현재 활성화된 메시지 타이머
let messageTimer = null;

/**
 * 메시지 알림 표시
 * @param {string} text - 표시할 메시지 내용
 * @param {string} type - 메시지 타입 (success, error, warning, info)
 * @param {number} duration - 표시 시간 (ms)
 */
function showMessage(text, type = 'info', duration = DEFAULT_DURATION) {
  const messagePopup = document.getElementById('messagePopup');
  if (!messagePopup) return;
  
  // 이전 타이머 제거
  if (messageTimer) {
    clearTimeout(messageTimer);
    messageTimer = null;
  }
  
  // 메시지 타입 클래스 설정
  messagePopup.className = 'ant-message';
  messagePopup.classList.add(`ant-message-${type}`);
  
  // 메시지 아이콘 설정
  const iconElement = messagePopup.querySelector('.anticon');
  if (iconElement) {
    iconElement.innerHTML = MESSAGE_ICONS[type] || MESSAGE_ICONS.info;
  }
  
  // 메시지 텍스트 설정
  const textElement = messagePopup.querySelector('.ant-message-text');
  if (textElement) {
    textElement.textContent = text;
  }
  
  // 메시지 표시
  messagePopup.classList.add('active');
  
  // 표시 후 일정 시간 후 숨김
  messageTimer = setTimeout(() => {
    messagePopup.classList.remove('active');
    messageTimer = null;
  }, duration);
}

/**
 * 성공 메시지 표시
 * @param {string} text - 표시할 메시지 내용
 * @param {number} duration - 표시 시간 (ms)
 */
function showSuccess(text, duration = DEFAULT_DURATION) {
  showMessage(text, 'success', duration);
}

/**
 * 오류 메시지 표시
 * @param {string} text - 표시할 메시지 내용
 * @param {number} duration - 표시 시간 (ms)
 */
function showError(text, duration = DEFAULT_DURATION) {
  showMessage(text, 'error', duration);
}

/**
 * 경고 메시지 표시
 * @param {string} text - 표시할 메시지 내용
 * @param {number} duration - 표시 시간 (ms)
 */
function showWarning(text, duration = DEFAULT_DURATION) {
  showMessage(text, 'warning', duration);
}

/**
 * 정보 메시지 표시
 * @param {string} text - 표시할 메시지 내용
 * @param {number} duration - 표시 시간 (ms)
 */
function showInfo(text, duration = DEFAULT_DURATION) {
  showMessage(text, 'info', duration);
}

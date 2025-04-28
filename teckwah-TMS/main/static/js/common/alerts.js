/**
 * 알림 처리 모듈
 * 사용자에게 메시지를 표시하는 기능 제공
 */

(function() {
  'use strict';
  
  // 알림 컨테이너 요소
  const DEFAULT_CONTAINER_ID = 'alertContainer';
  
  // 알림 표시 시간 (ms)
  const DEFAULT_DURATION = 5000;
  
  // 알림 스택
  const alerts = [];
  
  // 최대 알림 개수
  const MAX_ALERTS = 3;
  
  /**
   * 알림 생성 함수
   * @param {string} message - 표시할 메시지
   * @param {string} type - 알림 타입 (success, warning, error, info)
   * @param {Object} options - 추가 옵션
   */
  function createAlert(message, type = 'info', options = {}) {
    const {
      duration = DEFAULT_DURATION,
      containerId = DEFAULT_CONTAINER_ID,
      autoClose = true,
      closable = true,
      onClose = null,
      position = 'top-right'
    } = options;
    
    // 컨테이너 가져오기
    let container = document.getElementById(containerId);
    
    // 컨테이너가 없으면 생성
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = `alert-container ${position}`;
      document.body.appendChild(container);
    }
    
    // 아이콘 설정
    let icon;
    switch (type) {
      case 'success':
        icon = 'fa-check-circle';
        break;
      case 'warning':
        icon = 'fa-exclamation-triangle';
        break;
      case 'error':
        icon = 'fa-times-circle';
        break;
      case 'info':
      default:
        icon = 'fa-info-circle';
        break;
    }
    
    // 알림 요소 생성
    const alertId = 'alert-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const alertElement = document.createElement('div');
    alertElement.id = alertId;
    alertElement.className = `alert alert-${type}`;
    alertElement.innerHTML = `
      <div class="alert-icon">
        <i class="fas ${icon}"></i>
      </div>
      <div class="alert-content">
        <div class="alert-message">${message}</div>
      </div>
      ${closable ? '<button class="alert-close"><i class="fas fa-times"></i></button>' : ''}
      ${autoClose ? '<div class="alert-progress"></div>' : ''}
    `;
    
    // 알림 스택에 추가
    const alertData = {
      id: alertId,
      element: alertElement,
      timer: null,
      closable,
      onClose
    };
    
    alerts.push(alertData);
    
    // 최대 알림 개수 제한
    if (alerts.length > MAX_ALERTS) {
      const oldestAlert = alerts.shift();
      closeAlert(oldestAlert.id);
    }
    
    // 닫기 버튼 이벤트
    if (closable) {
      const closeBtn = alertElement.querySelector('.alert-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          closeAlert(alertId);
        });
      }
    }
    
    // 자동 닫기 타이머
    if (autoClose) {
      // 프로그레스바 애니메이션 설정
      const progressBar = alertElement.querySelector('.alert-progress');
      if (progressBar) {
        progressBar.style.animationDuration = (duration / 1000) + 's';
      }
      
      alertData.timer = setTimeout(function() {
        closeAlert(alertId);
      }, duration);
    }
    
    // 컨테이너에 추가
    container.appendChild(alertElement);
    
    // 표시 애니메이션
    setTimeout(() => {
      alertElement.classList.add('show');
    }, 10);
    
    return alertId;
  }
  
  /**
   * 알림 닫기
   * @param {string} alertId - 알림 ID
   */
  function closeAlert(alertId) {
    const alertIndex = alerts.findIndex(alert => alert.id === alertId);
    
    if (alertIndex === -1) return;
    
    const alert = alerts[alertIndex];
    
    // 타이머 제거
    if (alert.timer) {
      clearTimeout(alert.timer);
    }
    
    // 닫기 애니메이션
    alert.element.classList.remove('show');
    
    // 일정 시간 후 완전히 제거
    setTimeout(() => {
      if (alert.element.parentNode) {
        alert.element.parentNode.removeChild(alert.element);
      }
      
      // 배열에서 제거
      alerts.splice(alertIndex, 1);
      
      // 콜백 호출
      if (typeof alert.onClose === 'function') {
        alert.onClose();
      }
    }, 300);
  }
  
  /**
   * 모든 알림 닫기
   */
  function closeAllAlerts() {
    const alertIds = [...alerts].map(alert => alert.id);
    alertIds.forEach(closeAlert);
  }
  
  /**
   * 성공 알림
   * @param {string} message - 표시할 메시지
   * @param {Object} options - 추가 옵션
   */
  function showSuccess(message, options = {}) {
    return createAlert(message, 'success', options);
  }
  
  /**
   * 경고 알림
   * @param {string} message - 표시할 메시지
   * @param {Object} options - 추가 옵션
   */
  function showWarning(message, options = {}) {
    return createAlert(message, 'warning', options);
  }
  
  /**
   * 오류 알림
   * @param {string} message - 표시할 메시지
   * @param {Object} options - 추가 옵션
   */
  function showError(message, options = {}) {
    return createAlert(message, 'error', options);
  }
  
  /**
   * 정보 알림
   * @param {string} message - 표시할 메시지
   * @param {Object} options - 추가 옵션
   */
  function showInfo(message, options = {}) {
    return createAlert(message, 'info', options);
  }
  
  // 공개 API
  window.Alerts = {
    show: createAlert,
    success: showSuccess,
    warning: showWarning,
    error: showError,
    info: showInfo,
    close: closeAlert,
    closeAll: closeAllAlerts
  };
  
  console.log('[Alerts] 알림 모듈 초기화 완료');
})();
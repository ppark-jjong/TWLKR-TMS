/**
 * 알림 모듈
 * 사용자에게 알림 메시지를 표시하는 기능을 제공합니다.
 */

const Notify = {
  /**
   * 설정
   */
  config: {
    container: '.alert-container', // 알림 컨테이너 셀렉터
    duration: 5000, // 기본 표시 시간 (ms)
    position: 'top-right', // 위치 (미구현)
    maxCount: 5 // 최대 알림 개수
  },
  
  /**
   * 초기화
   */
  init: function() {
    this.container = document.querySelector(this.config.container);
    
    // 컨테이너가 없으면 자동 생성
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'alert-container';
      document.body.appendChild(this.container);
    }
  },
  
  /**
   * 성공 알림
   * @param {string} message - 알림 메시지
   * @param {Object} options - 옵션
   */
  success: function(message, options = {}) {
    this.show(message, { ...options, type: 'success' });
  },
  
  /**
   * 정보 알림
   * @param {string} message - 알림 메시지
   * @param {Object} options - 옵션
   */
  info: function(message, options = {}) {
    this.show(message, { ...options, type: 'info' });
  },
  
  /**
   * 경고 알림
   * @param {string} message - 알림 메시지
   * @param {Object} options - 옵션
   */
  warning: function(message, options = {}) {
    this.show(message, { ...options, type: 'warning' });
  },
  
  /**
   * 오류 알림
   * @param {string} message - 알림 메시지
   * @param {Object} options - 옵션
   */
  error: function(message, options = {}) {
    this.show(message, { ...options, type: 'error' });
  },
  
  /**
   * 알림 표시
   * @param {string} message - 알림 메시지
   * @param {Object} options - 옵션
   */
  show: function(message, options = {}) {
    // 컨테이너 확인
    if (!this.container) {
      this.init();
    }
    
    // 옵션 설정
    const { 
      type = 'info',
      duration = this.config.duration,
      closable = true
    } = options;
    
    // 최대 알림 개수 관리
    const alerts = this.container.querySelectorAll('.alert');
    if (alerts.length >= this.config.maxCount) {
      // 가장 오래된 알림 제거
      this.container.removeChild(alerts[0]);
    }
    
    // 알림 요소 생성
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    // 내용 구성
    alert.innerHTML = `
      <div class="alert-content">${message}</div>
      ${closable ? '<button class="close-btn">&times;</button>' : ''}
    `;
    
    // 컨테이너에 추가
    this.container.appendChild(alert);
    
    // 애니메이션 적용
    setTimeout(() => {
      alert.classList.add('alert-show');
    }, 10);
    
    // 자동 닫기 타이머 설정
    const timerId = setTimeout(() => {
      this.close(alert);
    }, duration);
    
    // 닫기 버튼 이벤트 설정
    if (closable) {
      const closeBtn = alert.querySelector('.close-btn');
      closeBtn.addEventListener('click', () => {
        clearTimeout(timerId);
        this.close(alert);
      });
    }
  },
  
  /**
   * 알림 닫기
   * @param {HTMLElement} alert - 알림 요소
   */
  close: function(alert) {
    alert.classList.remove('alert-show');
    alert.classList.add('alert-hide');
    
    // 애니메이션 종료 후 제거
    setTimeout(() => {
      if (alert.parentNode) {
        alert.parentNode.removeChild(alert);
      }
    }, 300);
  }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  Notify.init();
});

// 전역 접근을 위해 window 객체에 등록
window.Notify = Notify;

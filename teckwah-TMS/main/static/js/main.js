/**
 * 메인 JavaScript 파일
 * 공통 모듈과 페이지 초기화 로직 포함
 */

/**
 * 메인 애플리케이션 네임스페이스
 */
const App = {
  /**
   * 초기화 함수
   */
  init() {
    console.log('애플리케이션 초기화...');
    this.setupGlobalEventHandlers();
    this.detectCurrentPage();
  },

  /**
   * 전역 이벤트 핸들러 설정
   */
  setupGlobalEventHandlers() {
    // 모바일 화면에서 사이드바 토글 처리
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    if (sidebarToggleBtn) {
      sidebarToggleBtn.addEventListener('click', function() {
        document.getElementById('app').classList.toggle('sidebar-collapsed');
      });
    }
    
    // ESC 키로 열린 모달 닫기
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal[style*="display: block"]');
        if (openModals.length > 0) {
          openModals[openModals.length - 1].style.display = 'none';
          document.body.style.overflow = '';
        }
      }
    });
    
    // 서버 에러 처리
    document.addEventListener('server-error', function(event) {
      const { message, status } = event.detail;
      console.error(`[${status}] ${message}`);
      
      // 에러 알림 표시
      if (window.Modal && window.Modal.alert) {
        window.Modal.alert(message || '서버 오류가 발생했습니다', 'error');
      } else {
        alert(message || '서버 오류가 발생했습니다');
      }
    });
    
    // 세션 만료 처리
    document.addEventListener('session-expired', function() {
      window.location.href = '/login?expired=true';
    });
  },
  
  /**
   * 현재 페이지 감지 및 해당 초기화 함수 호출
   */
  detectCurrentPage() {
    const path = window.location.pathname;
    
    // 대시보드 페이지
    if (path === '/' || path === '/dashboard') {
      this.initializeDashboardPage();
    }
    // 인수인계 페이지
    else if (path === '/handover') {
      this.initializeHandoverPage();
    }
    // 시각화 페이지
    else if (path === '/visualization') {
      this.initializeVisualizationPage();
    }
    // 사용자 관리 페이지
    else if (path === '/users') {
      this.initializeUsersPage();
    }
    // 로그인 페이지
    else if (path === '/login') {
      this.initializeLoginPage();
    }
  },
  
  /**
   * 대시보드 페이지 초기화
   */
  initializeDashboardPage() {
    console.log('대시보드 페이지 초기화');
    
    // Dashboard 네임스페이스가 존재하면 초기화
    if (window.Dashboard && typeof window.Dashboard.init === 'function') {
      window.Dashboard.init();
    }
  },
  
  /**
   * 인수인계 페이지 초기화
   */
  initializeHandoverPage() {
    console.log('인수인계 페이지 초기화');
    
    // Handover 네임스페이스가 존재하면 초기화
    if (window.Handover && typeof window.Handover.init === 'function') {
      window.Handover.init();
    }
  },
  
  /**
   * 시각화 페이지 초기화
   */
  initializeVisualizationPage() {
    console.log('시각화 페이지 초기화');
    
    // Visualization 네임스페이스가 존재하면 초기화
    if (window.Visualization && typeof window.Visualization.init === 'function') {
      window.Visualization.init();
    }
  },
  
  /**
   * 사용자 관리 페이지 초기화
   */
  initializeUsersPage() {
    console.log('사용자 관리 페이지 초기화');
    
    // Users 네임스페이스가 존재하면 초기화
    if (window.Users && typeof window.Users.init === 'function') {
      window.Users.init();
    }
  },
  
  /**
   * 로그인 페이지 초기화
   */
  initializeLoginPage() {
    console.log('로그인 페이지 초기화');
    
    // Login 네임스페이스가 존재하면 초기화
    if (window.Login && typeof window.Login.init === 'function') {
      window.Login.init();
    }
    
    // 세션 만료 처리
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === 'true') {
      // 메시지가 정의되어 있으면 표시
      if (window.Modal && window.Modal.alert) {
        window.Modal.alert('세션이 만료되었습니다. 다시 로그인해주세요.', 'warning');
      }
    }
  }
};

// 문서 로드 완료 시 앱 초기화
document.addEventListener('DOMContentLoaded', function() {
  App.init();
});

// 글로벌 스코프에 앱 노출
window.App = App;

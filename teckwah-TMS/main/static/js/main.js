/**
 * 메인 자바스크립트 파일
 * 페이지 초기화 및 공통 기능을 처리합니다.
 */

// 앱 네임스페이스
const App = {
  /**
   * 설정
   */
  config: {
    debug: true, // 디버그 모드
    apiBasePath: '/api' // API 기본 경로
  },
  
  /**
   * 초기화
   */
  init: function() {
    // 디버그 모드 메시지
    if (this.config.debug) {
      console.log('[App] 초기화 시작');
    }
    
    // 공통 UI 초기화
    this.initCommonUI();
    
    // API 초기 설정
    if (window.Api) {
      Api.config.baseUrl = this.config.apiBasePath;
    }
    
    // 페이지별 초기화
    this.initPageHandlers();
    
    // 디버그 모드 메시지
    if (this.config.debug) {
      console.log('[App] 초기화 완료');
    }
  },
  
  /**
   * 공통 UI 초기화
   */
  initCommonUI: function() {
    // 사이드바 토글 초기화
    this.initSidebar();
    
    // 로그아웃 버튼 초기화
    this.initLogoutButton();
    
    // 모바일 대응 초기화
    this.initResponsive();
  },
  
  /**
   * 사이드바 초기화
   */
  initSidebar: function() {
    const app = document.getElementById('app');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    
    if (sidebarToggleBtn) {
      sidebarToggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (app) {
          app.classList.toggle('sidebar-collapsed');
          
          // 상태 저장
          localStorage.setItem('sidebar-collapsed', app.classList.contains('sidebar-collapsed'));
        }
      });
      
      // 이전 상태 복원
      const sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
      if (sidebarCollapsed) {
        app.classList.add('sidebar-collapsed');
      }
    }
  },
  
  /**
   * 로그아웃 버튼 초기화
   */
  initLogoutButton: function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        if (window.confirm('로그아웃 하시겠습니까?')) {
          window.location.href = '/logout';
        }
      });
    }
  },
  
  /**
   * 반응형 초기화
   */
  initResponsive: function() {
    const app = document.getElementById('app');
    
    // 모바일 화면에서 사이드바 자동 축소
    function checkMobileView() {
      if (window.innerWidth < 768 && app) {
        app.classList.add('sidebar-collapsed');
      }
    }
    
    // 초기 모바일 체크
    checkMobileView();
    
    // 화면 크기 변경 감지
    window.addEventListener('resize', checkMobileView);
  },
  
  /**
   * 페이지별 초기화
   */
  initPageHandlers: function() {
    // 현재 경로 가져오기
    const path = window.location.pathname;
    
    // 페이지별 핸들러 호출
    switch (path) {
      case '/dashboard':
        if (window.DashboardApp && typeof window.DashboardApp.init === 'function') {
          window.DashboardApp.init();
        }
        break;
        
      case '/handover':
        if (window.HandoverApp && typeof window.HandoverApp.init === 'function') {
          window.HandoverApp.init();
        }
        break;
        
      case '/users':
        if (window.UsersApp && typeof window.UsersApp.init === 'function') {
          window.UsersApp.init();
        }
        break;
        
      case '/login':
        // 로그인 페이지 초기화
        break;
        
      default:
        // 기타 페이지
        break;
    }
  }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  App.init();
});

// 전역 접근을 위해 window 객체에 등록
window.App = App;

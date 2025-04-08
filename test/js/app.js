/**
 * 공통 애플리케이션 코드
 * 모든 페이지에서 공유되는 기능을 제공합니다.
 */

// TMS 애플리케이션 네임스페이스
const TMS = {
  /**
   * 애플리케이션 초기화 함수
   */
  init: async function () {
    console.log('TMS 애플리케이션 초기화 중...');

    // 디버그 링크 추가
    this.addDebugLink();

    // 공통 UI 요소 초기화
    this.initCommonUI();

    // 데이터 로드
    try {
      await DataManager.loadData();
      console.log('데이터 로드 완료');
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      MessageManager.error('데이터 로드 중 오류가 발생했습니다.');
    }

    // 현재 페이지 식별 및 초기화
    this.initCurrentPage();

    console.log('TMS 애플리케이션 초기화 완료');
  },
  
  /**
   * 디버그 링크 추가 (개발용)
   */
  addDebugLink: function() {
    // 사이드바에 디버그 메뉴 추가
    const menu = document.querySelector('.menu ul');
    if (menu) {
      const debugLi = document.createElement('li');
      debugLi.className = 'menu-item';
      
      // 현재 페이지가 modal-test.html인 경우 active 클래스 추가
      if (window.location.pathname.includes('modal-test.html')) {
        debugLi.classList.add('active');
      }
      
      debugLi.innerHTML = `
        <a href="modal-test.html">
          <i class="fa-solid fa-bug"></i>
          <span>모달 테스트</span>
        </a>
      `;
      menu.appendChild(debugLi);
    }
  },

  /**
   * 공통 UI 요소 초기화
   */
  initCommonUI: function () {
    // 로그아웃 버튼 이벤트
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      // 기존 이벤트 리스너 제거 (중복 방지)
      logoutBtn.removeEventListener('click', this.handleLogout);
      // 새 이벤트 리스너 추가
      logoutBtn.addEventListener('click', this.handleLogout);
    }

    // 사용자 정보 업데이트
    const userDisplayName = document.getElementById('userDisplayName');
    const userDisplayRole = document.getElementById('userDisplayRole');
    
    const userData = DataManager.getUserData();
    if (userDisplayName) {
      userDisplayName.textContent = userData.userName;
    }

    if (userDisplayRole) {
      userDisplayRole.textContent = userData.userRole;
    }

    // 메시지 팝업 초기화
    MessageManager.init();
    
    // 모달 초기화 - 기존 초기화 상태 리셋 후 다시 초기화
    ModalManager.resetInitialization();
    ModalManager.initModals();
  },
  
  /**
   * 로그아웃 처리 함수
   */
  handleLogout: function() {
    if (confirm('로그아웃 하시겠습니까?')) {
      MessageManager.success('로그아웃되었습니다.');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  },

  /**
   * 현재 페이지 식별 및 초기화
   */
  initCurrentPage: function () {
    const pathname = window.location.pathname;

    if (pathname.includes('handover.html')) {
      console.log('현재 페이지: 인수인계');
      // 인수인계 페이지 모듈이 있으면 초기화
      if (window.HandoverPage) {
        window.HandoverPage.init();
      }
    } else if (pathname.includes('visualization.html')) {
      console.log('현재 페이지: 시각화');
      // 시각화 페이지 모듈이 있으면 초기화
      if (window.VisualizationPage) {
        window.VisualizationPage.init();
      }
    } else {
      console.log('현재 페이지: 대시보드');
      // 대시보드 페이지 모듈이 있으면 초기화
      if (window.DashboardPage) {
        window.DashboardPage.init();
      }
    }
  }
};

// DOM이 로드되면 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', function () {
  TMS.init();
});

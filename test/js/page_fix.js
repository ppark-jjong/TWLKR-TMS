/**
 * 페이지 전환 문제 해결을 위한 즉시 실행 함수
 */
(function() {
  // 사이드바 메뉴 클릭 이벤트를 다시 설정
  function setupFixedMenuHandlers() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
      // 기존 이벤트 리스너 제거 (가능한 경우)
      const clone = item.cloneNode(true);
      item.parentNode.replaceChild(clone, item);
      
      // 새 이벤트 리스너 추가
      clone.addEventListener('click', function(e) {
        e.preventDefault();
        const pageName = this.getAttribute('data-page');
        
        if (pageName) {
          console.log(`[페이지 전환 수정] 메뉴 클릭: ${pageName}`);
          
          // 모든 메뉴 항목 비활성화
          document.querySelectorAll('.menu-item').forEach(menuItem => {
            menuItem.classList.remove('active');
          });
          
          // 현재 메뉴 활성화
          this.classList.add('active');
          
          // 페이지 직접 전환
          directPageSwitch(pageName);
        }
      });
    });
    
    console.log('[페이지 전환 수정] 메뉴 이벤트 핸들러 재설정 완료');
  }
  
  // 직접 페이지 전환 함수
  function directPageSwitch(pageName) {
    // 페이지 전환 메시지
    console.log(`[페이지 전환 수정] 직접 페이지 전환: ${pageName}`);
    
    // 메시지 표시
    if (window.messageUtils) {
      window.messageUtils.info(`${pageName} 페이지 로드 중...`);
    }
    
    // 모든 페이지 숨기기
    const pages = ['dashboardPage', 'visualizationPage', 'handoverPage'];
    pages.forEach(pageId => {
      const page = document.getElementById(pageId);
      if (page) {
        page.style.display = 'none';
      }
    });
    
    // 선택한 페이지 표시
    const targetPage = document.getElementById(`${pageName}Page`);
    if (targetPage) {
      // 직접 스타일을 수정하여 강제로 표시
      targetPage.style.display = 'block';
      targetPage.style.visibility = 'visible';
      targetPage.style.opacity = '1';
      
      // 초기화 함수 호출 (사용 가능한 경우)
      setTimeout(() => {
        try {
          // 페이지 초기화
          if (pageName === 'visualization' && window.visualizationPage && typeof window.visualizationPage.init === 'function') {
            window.visualizationPage.init();
          } else if (pageName === 'handover' && window.handoverPage && typeof window.handoverPage.init === 'function') {
            window.handoverPage.init();
          } else if (pageName === 'dashboard' && window.dashboardPage && typeof window.dashboardPage.refreshData === 'function') {
            window.dashboardPage.refreshData();
          }
          
          // 완료 메시지
          if (window.messageUtils) {
            window.messageUtils.success(`${pageName} 페이지 로드 완료`);
          }
        } catch (error) {
          console.error(`[페이지 전환 수정] 페이지 초기화 오류:`, error);
          if (window.messageUtils) {
            window.messageUtils.error(`페이지 초기화 중 오류가 발생했습니다.`);
          }
        }
      }, 100);
    } else {
      console.error(`[페이지 전환 수정] 페이지 요소를 찾을 수 없음: ${pageName}Page`);
      if (window.messageUtils) {
        window.messageUtils.error(`페이지를 찾을 수 없습니다: ${pageName}`);
      }
    }
  }
  
  // DOM이 로드되면 실행
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[페이지 전환 수정] DOM 로드됨');
    
    // 지연 실행으로 다른 스크립트가 모두 로드된 후 실행
    setTimeout(() => {
      setupFixedMenuHandlers();
      
      // 디버깅 정보 표시
      console.log('[페이지 전환 수정] 페이지 요소 상태:');
      const pages = ['dashboardPage', 'visualizationPage', 'handoverPage'];
      pages.forEach(pageId => {
        const el = document.getElementById(pageId);
        if (el) {
          console.log(`- ${pageId}: display=${getComputedStyle(el).display}, children=${el.children.length}`);
        } else {
          console.error(`- ${pageId}: 요소를 찾을 수 없음`);
        }
      });
    }, 500);
  });
})();

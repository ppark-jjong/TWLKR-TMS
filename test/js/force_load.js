/**
 * 페이지 로드 후 강제 초기화를 위한 스크립트
 */
(function() {
  window.addEventListener('load', function() {
    console.log('[강제 로드] 페이지 로드 완료 후 초기화 시작');
    
    // 로고 이미지 로드 확인 및 조정
    const logoImg = document.querySelector('.logo');
    if (logoImg) {
      logoImg.onload = function() {
        console.log('[강제 로드] 로고 이미지 로드 완료');
      };
      logoImg.onerror = function() {
        console.error('[강제 로드] 로고 이미지 로드 실패');
        // 로고 로드 실패 시 기본 텍스트로 대체
        logoImg.style.display = 'none';
        const logoContainer = document.querySelector('.logo-container');
        if (logoContainer) {
          logoContainer.style.marginTop = '20px';
        }
      };
    }
    
    // 현재 활성화된 페이지 확인
    const activePage = document.querySelector('.menu-item.active');
    if (activePage) {
      const pageName = activePage.getAttribute('data-page');
      if (pageName) {
        console.log(`[강제 로드] 현재 활성 페이지: ${pageName}`);
        
        // 해당 페이지 요소 확인
        const pageElement = document.getElementById(`${pageName}Page`);
        if (pageElement) {
          // 페이지 강제 표시
          pageElement.style.display = 'block';
          pageElement.style.visibility = 'visible';
          pageElement.style.opacity = '1';
          
          console.log(`[강제 로드] ${pageName} 페이지 강제 표시`);
          
          // 페이지 내부 요소 확인
          const mainCard = pageElement.querySelector('.main-card');
          if (mainCard) {
            mainCard.style.display = 'block';
            console.log(`[강제 로드] ${pageName} 페이지 내 main-card 확인됨`);
          } else {
            console.warn(`[강제 로드] ${pageName} 페이지 내 main-card 요소 없음`);
          }
        } else {
          console.error(`[강제 로드] ${pageName}Page 요소를 찾을 수 없음`);
        }
      }
    }
    
    // 다른 페이지들은 확실히 숨김
    const pages = ['dashboardPage', 'visualizationPage', 'handoverPage'];
    const activePageId = activePage ? activePage.getAttribute('data-page') + 'Page' : null;
    
    pages.forEach(pageId => {
      if (pageId !== activePageId) {
        const page = document.getElementById(pageId);
        if (page) {
          page.style.display = 'none';
          console.log(`[강제 로드] ${pageId} 숨김 처리`);
        }
      }
    });
    
    console.log('[강제 로드] 초기화 완료');
  });
})();

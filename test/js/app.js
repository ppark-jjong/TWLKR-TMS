/**
 * 메인 애플리케이션 진입점
 */

// 현재 활성화된 페이지
let currentPage = 'dashboard';

// 초기화 함수
async function initializeApp() {
  try {
    console.log('앱 초기화 중...');
    
    // 모달 초기화
    if (typeof modalUtils !== 'undefined') {
      modalUtils.initModals();
    } else {
      console.error('modalUtils 모듈이 정의되지 않았습니다.');
    }
    
    // 메뉴 이벤트 핸들러 등록
    setupMenuHandlers();
    
    // 페이지 요소 확인
    if (!checkPageElements()) {
      throw new Error('필수 페이지 요소를 찾을 수 없습니다.');
    }
    
    // 데이터 매니저 초기화 확인
    if (typeof dataManager === 'undefined' || !dataManager) {
      console.error('dataManager 객체가 정의되지 않았습니다.');
      if (typeof DataManager !== 'undefined') {
        window.dataManager = new DataManager();
      }
    }
    
    // 대시보드 페이지 초기화 (기본 페이지)
    if (typeof dashboardPage !== 'undefined' && dashboardPage) {
      await dashboardPage.init();
    } else {
      console.error('dashboardPage 인스턴스가 정의되지 않았습니다.');
    }
    
    // 시각화 페이지와 인수인계 페이지 인스턴스 확인 및 생성
    // 동기적으로 처리하여 확실히 초기화되도록 함
    await initializeVisualizationPage();
    await initializeHandoverPage();
    
    console.log('앱 초기화 완료');
    
  } catch (error) {
    console.error('앱 초기화 오류:', error);
    alert('애플리케이션을 초기화하는 중 오류가 발생했습니다: ' + error.message);
  }
}

// 시각화 페이지 초기화
async function initializeVisualizationPage() {
  try {
    console.log('시각화 페이지 초기화 시작...');
    
    if (typeof VisualizationPage !== 'undefined') {
      // 인스턴스가 없으면 생성
      if (typeof visualizationPage === 'undefined' || !visualizationPage) {
        console.log('visualizationPage 인스턴스 생성 중...');
        window.visualizationPage = new VisualizationPage();
        
        // 기본 초기화 수행
        if (typeof visualizationPage.init === 'function') {
          await visualizationPage.init();
        }
      }
      
      console.log('시각화 페이지 초기화 성공');
    } else {
      console.error('VisualizationPage 클래스가 정의되지 않았습니다.');
      messageUtils.error('시각화 페이지를 초기화할 수 없습니다.');
    }
  } catch (error) {
    console.error('시각화 페이지 초기화 오류:', error);
    messageUtils.error('시각화 페이지 초기화 중 오류가 발생했습니다.');
  }
}

// 인수인계 페이지 초기화
async function initializeHandoverPage() {
  try {
    console.log('인수인계 페이지 초기화 시작...');
    
    if (typeof HandoverPage !== 'undefined') {
      // 인스턴스가 없으면 생성
      if (typeof handoverPage === 'undefined' || !handoverPage) {
        console.log('handoverPage 인스턴스 생성 중...');
        window.handoverPage = new HandoverPage();
        
        // 기본 초기화 수행
        if (typeof handoverPage.init === 'function') {
          await handoverPage.init();
        }
      }
      
      console.log('인수인계 페이지 초기화 성공');
    } else {
      console.error('HandoverPage 클래스가 정의되지 않았습니다.');
      messageUtils.error('인수인계 페이지를 초기화할 수 없습니다.');
    }
  } catch (error) {
    console.error('인수인계 페이지 초기화 오류:', error);
    messageUtils.error('인수인계 페이지 초기화 중 오류가 발생했습니다.');
  }
}

// 페이지 요소 확인
function checkPageElements() {
  const pageIds = ['dashboardPage', 'visualizationPage', 'handoverPage'];
  let allFound = true;
  
  pageIds.forEach(pageId => {
    const pageElement = document.getElementById(pageId);
    if (!pageElement) {
      console.error(`${pageId} 요소를 찾을 수 없습니다.`);
      allFound = false;
    } else {
      console.log(`${pageId} 요소 확인됨.`);
      
      // 페이지 요소가 제대로 보여지는지 확인 (display 스타일 확인)
      const computedStyle = window.getComputedStyle(pageElement);
      if (computedStyle.display === 'none' && pageId === 'dashboardPage') {
        console.log(`${pageId} 요소가 보이지 않는 상태입니다. 보이게 변경합니다.`);
        // 대시보드는 기본 페이지이므로 표시
        pageElement.style.display = 'block';
      } else if (pageId !== 'dashboardPage') {
        // 대시보드 외 페이지는 기본적으로 숨김
        pageElement.style.display = 'none';
      }
    }
  });
  
  return allFound;
}

// 메뉴 핸들러 설정
function setupMenuHandlers() {
  const menuItems = document.querySelectorAll('.menu-item');
  
  menuItems.forEach(item => {
    item.addEventListener('click', async function(e) {
      e.preventDefault(); // 기본 동작 방지
      const pageName = this.getAttribute('data-page');
      
      if (pageName && pageName !== currentPage) {
        console.log(`메뉴 클릭: ${pageName}`);
        
        // 중복 클릭 방지 (이미 처리 중인 경우)
        if (this.classList.contains('loading')) {
          console.log('이미 페이지 로드 중입니다.');
          return;
        }
        
        // 로딩 상태 표시
        this.classList.add('loading');
        
        try {
          // 페이지 전환 (비동기 함수 호출)
          await loadPage(pageName);
        } catch (error) {
          console.error(`${pageName} 페이지 로드 실패:`, error);
        } finally {
          // 로딩 상태 제거
          this.classList.remove('loading');
        }
      }
    });
  });
  
  // 로그아웃 버튼
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (confirm('로그아웃 하시겠습니까?')) {
        messageUtils.info('로그아웃되었습니다.');
        
        // 실제 로그아웃 처리는 프로토타입에서 생략
        setTimeout(() => {
          // 여기서는 페이지 새로고침으로 대체
          window.location.reload();
        }, 1500);
      }
    });
  }
}

// 페이지 로드 함수
async function loadPage(pageName) {
  try {
    console.log(`페이지 전환 시작: ${currentPage} -> ${pageName}`);
    
    // 디버깅 상태 확인
    if (typeof window.debugPages === 'function') {
      console.log('페이지 전환 전 상태:');
      window.debugPages();
    }
    
    // 로딩 상태 표시
    messageUtils.info(`${pageName} 페이지 로딩 중...`);
    
    // 모든 페이지 요소를 먼저 숨김
    const allPages = ['dashboardPage', 'visualizationPage', 'handoverPage'];
    allPages.forEach(pageId => {
      const pageElement = document.getElementById(pageId);
      if (pageElement) {
        pageElement.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
      }
    });
    
    // 특별히 현재 페이지 숨기기 (강제 적용)
    const currentPageElement = document.getElementById(`${currentPage}Page`);
    if (currentPageElement) {
      currentPageElement.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
      console.log(`${currentPage}Page 요소를 숨겼습니다. 스타일: ${currentPageElement.style.cssText}`);
    } else {
      console.warn(`${currentPage}Page 요소를 찾을 수 없습니다.`);
    }
    
    // 메뉴 항목 상태 업데이트
    document.querySelectorAll('.menu-item').forEach(menuItem => {
      const itemPage = menuItem.getAttribute('data-page');
      if (itemPage === pageName) {
        menuItem.classList.add('active');
      } else {
        menuItem.classList.remove('active');
      }
    });
    
    // 새 페이지 요소 확인
    let newPageElement = document.getElementById(`${pageName}Page`);
    if (!newPageElement) {
      console.error(`${pageName}Page 요소를 찾을 수 없습니다.`);
      messageUtils.error(`페이지를 찾을 수 없습니다: ${pageName}`);
      return; // 페이지 요소가 없으면 중단
    }
    
    // 현재 페이지 업데이트
    const previousPage = currentPage;
    currentPage = pageName;
    
    // 페이지별 초기화 수행 (비동기)
    try {
      await initCurrentPage();
      
      // DOM 재구성 - 강력한 방법
      // 기존 페이지 요소를 제거하고 다시 추가
      const contentContainer = document.querySelector('.content-container');
      if (contentContainer) {
        // 새 페이지 요소 복제
        const pageClone = newPageElement.cloneNode(true);
        
        // 기존 페이지 제거
        newPageElement.remove();
        
        // 복제한 페이지 추가
        contentContainer.appendChild(pageClone);
        
        // 새 페이지 요소 참조 업데이트
        newPageElement = document.getElementById(`${pageName}Page`);
        
        if (!newPageElement) {
          console.error("페이지 DOM 재구성 실패");
          // 원본 페이지 요소를 직접 추가 시도
          contentContainer.appendChild(pageClone);
          newPageElement = pageClone;
        }
      }
      
      // 초기화 성공 후 표시 (스타일을 강제로 적용)
      if (newPageElement) {
        // 인라인 스타일로 강제 적용
        newPageElement.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 10 !important;';
        
        // HTML 클래스 추가
        newPageElement.classList.add('active-page');
        
        // 페이지 내부의 메인 카드 요소도 확인
        const mainCards = newPageElement.querySelectorAll('.main-card');
        console.log(`${pageName}Page 내 메인 카드 수: ${mainCards.length}`);
        
        if (mainCards.length > 0) {
          console.log('메인 카드 표시 설정 중...');
          mainCards.forEach(card => {
            card.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
          });
        }
        
        // 계산된 스타일 확인 및 로깅
        const computedStyle = window.getComputedStyle(newPageElement);
        console.log(`${pageName}Page 요소 계산된 스타일: display=${computedStyle.display}, visibility=${computedStyle.visibility}, opacity=${computedStyle.opacity}`);
      }
      
      // 성공 메시지
      messageUtils.success(`${pageName} 페이지가 로드되었습니다.`);
      console.log(`페이지 전환 완료: ${pageName}`);
    } catch (initError) {
      // 초기화 실패 시
      console.error(`${pageName} 페이지 초기화 실패:`, initError);
      messageUtils.error(`${pageName} 페이지를 로드하는 중 오류가 발생했습니다.`);
      
      // 이전 페이지로 되돌림
      currentPage = previousPage;
      if (currentPageElement) {
        currentPageElement.style.display = 'block';
      }
      
      // 메뉴 상태 복원
      document.querySelectorAll('.menu-item').forEach(menuItem => {
        const itemPage = menuItem.getAttribute('data-page');
        if (itemPage === previousPage) {
          menuItem.classList.add('active');
        } else {
          menuItem.classList.remove('active');
        }
      });
    }
  } catch (error) {
    console.error('페이지 전환 오류:', error);
    messageUtils.error('페이지 전환 중 오류가 발생했습니다: ' + error.message);
  }
}

// 현재 페이지 초기화
async function initCurrentPage() {
  try {
    console.log(`${currentPage} 페이지 초기화 시작...`);
    
    // 페이지 요소 확인 및 내용 검사
    const pageElement = document.getElementById(`${currentPage}Page`);
    if (pageElement) {
      console.log(`${currentPage}Page HTML 내용 확인: ${pageElement.children.length}개 하위 요소 있음`);
      if (pageElement.children.length === 0) {
        console.error(`${currentPage}Page 내용이 비어 있습니다!`);
      }
    }
    
    if (currentPage === 'dashboard') {
      // 대시보드 페이지 초기화
      if (typeof dashboardPage !== 'undefined' && dashboardPage) {
        await dashboardPage.refreshData();
      } else {
        throw new Error('dashboardPage 인스턴스가 정의되지 않았습니다.');
      }
    } else if (currentPage === 'visualization') {
      // 시각화 페이지 초기화
      if (typeof visualizationPage !== 'undefined' && visualizationPage) {
        await visualizationPage.init();
      } else {
        // 없으면 생성 시도
        await initializeVisualizationPage();
        
        if (typeof visualizationPage === 'undefined' || !visualizationPage) {
          throw new Error('visualizationPage 인스턴스를 생성할 수 없습니다.');
        }
      }
    } else if (currentPage === 'handover') {
      // 인수인계 페이지 초기화
      if (typeof handoverPage !== 'undefined' && handoverPage) {
        await handoverPage.init();
      } else {
        // 없으면 생성 시도
        await initializeHandoverPage();
        
        if (typeof handoverPage === 'undefined' || !handoverPage) {
          throw new Error('handoverPage 인스턴스를 생성할 수 없습니다.');
        }
      }
    }
    
    console.log(`${currentPage} 페이지 초기화 완료`);
  } catch (error) {
    console.error(`${currentPage} 페이지 초기화 오류:`, error);
    messageUtils.error(`페이지 초기화 중 오류가 발생했습니다: ${error.message}`);
    throw error; // 에러를 상위로 전파하여 페이지 로드 실패 처리
  }
}

// DOM 로드 후 앱 초기화
document.addEventListener('DOMContentLoaded', function() {
  try {
    console.log('DOM 로드됨: 앱 초기화 준비 중');
    
    // 모든 스크립트 로드 확인을 위한 함수
    const checkScriptsLoaded = async (retries = 5, interval = 300) => {
      for (let i = 0; i < retries; i++) {
        // 필요한 모든 클래스/객체가 로드되었는지 확인
        if (typeof DataManager !== 'undefined' && 
            typeof VisualizationPage !== 'undefined' && 
            typeof HandoverPage !== 'undefined') {
          console.log('모든 필수 스크립트가 로드되었습니다.');
          return true;
        }
        
        // 아직 로드되지 않았다면 대기
        console.log(`스크립트 로드 대기 중... (${i+1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      
      // 필요한 스크립트 로드 상태 확인
      const missing = [];
      if (typeof DataManager === 'undefined') missing.push('DataManager');
      if (typeof VisualizationPage === 'undefined') missing.push('VisualizationPage');
      if (typeof HandoverPage === 'undefined') missing.push('HandoverPage');
      
      throw new Error(`필수 스크립트가 로드되지 않았습니다: ${missing.join(', ')}`);
    };
    
    // 앱 초기화 실행 함수
    const runApp = async () => {
      try {
        // 스크립트 로드 확인
        await checkScriptsLoaded();
        
        // 앱 초기화
        await initializeApp();
        
      } catch (innerError) {
        console.error('앱 초기화 오류:', innerError);
        if (typeof messageUtils !== 'undefined') {
          messageUtils.error('애플리케이션을 초기화하는 중 오류가 발생했습니다.');
        }
        alert('애플리케이션을 초기화하는 중 오류가 발생했습니다: ' + innerError.message);
      }
    };
    
    // 앱 실행
    runApp();
    
  } catch (error) {
    console.error('앱 로드 오류:', error);
    alert('애플리케이션을 로드하는 중 오류가 발생했습니다: ' + error.message);
  }
});

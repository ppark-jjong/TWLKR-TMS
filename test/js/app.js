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
    modalUtils.initModals();
    
    // 메뉴 이벤트 핸들러 등록
    setupMenuHandlers();
    
    // 현재 시간 표시 및 갱신
    updateCurrentTime();
    
    // 기본적으로 대시보드 페이지 로드
    loadPage('dashboard');
    
    console.log('앱 초기화 완료');
    
  } catch (error) {
    console.error('앱 초기화 오류:', error);
    messageUtils.error('애플리케이션을 초기화하는 중 오류가 발생했습니다.');
  }
}

// 메뉴 핸들러 설정
function setupMenuHandlers() {
  const menuItems = document.querySelectorAll('.menu-item');
  
  menuItems.forEach(item => {
    item.addEventListener('click', function() {
      const pageName = this.getAttribute('data-page');
      
      if (pageName && pageName !== currentPage) {
        loadPage(pageName);
      }
    });
  });
  
  // 로그아웃 버튼
  document.getElementById('logoutBtn').addEventListener('click', function() {
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

// 페이지 로드 함수
function loadPage(pageName) {
  // 이전 페이지 숨기기
  document.getElementById(`${currentPage}Page`).style.display = 'none';
  
  // 메뉴 활성화 상태 변경
  document.querySelector(`.menu-item[data-page="${currentPage}"]`).classList.remove('active');
  document.querySelector(`.menu-item[data-page="${pageName}"]`).classList.add('active');
  
  // 새 페이지 표시
  document.getElementById(`${pageName}Page`).style.display = 'block';
  
  // 현재 페이지 갱신
  currentPage = pageName;
  
  // 페이지별 초기화
  initCurrentPage();
}

// 현재 페이지 초기화
function initCurrentPage() {
  if (currentPage === 'dashboard') {
    dashboardPage.init();
  } else if (currentPage === 'visualization') {
    visualizationPage.init();
  } else if (currentPage === 'handover') {
    handoverPage.init();
  }
}

// 현재 시간 표시 및 갱신 함수 (페이지 헤더 제거로 인해 비활성화)
function updateCurrentTime() {
  // 페이지 헤더 제거로 인해 시간 표시 기능을 사용하지 않음
}

// 로고 이미지 오류 시 플레이스홀더 생성
function handleLogoError() {
  // 로고 이미지가 로드되지 않았을 때 대체 이미지 처리
  const logoImg = document.querySelector('.logo');
  
  if (logoImg) {
    logoImg.onerror = function() {
      console.log('로고 이미지를 불러올 수 없습니다. 대체 텍스트를 표시합니다.');
      
      const logoPlaceholder = document.createElement('div');
      logoPlaceholder.style.width = '40px';
      logoPlaceholder.style.height = '40px';
      logoPlaceholder.style.backgroundColor = '#1890ff';
      logoPlaceholder.style.color = 'white';
      logoPlaceholder.style.display = 'flex';
      logoPlaceholder.style.alignItems = 'center';
      logoPlaceholder.style.justifyContent = 'center';
      logoPlaceholder.style.fontSize = '16px';
      logoPlaceholder.style.fontWeight = 'bold';
      logoPlaceholder.style.borderRadius = '4px';
      logoPlaceholder.textContent = 'TW';
      
      const logoContainer = document.querySelector('.logo-container');
      logoContainer.replaceChild(logoPlaceholder, logoImg);
    };
  }
}

// DOM 로드 후 앱 초기화 - 약간의 지연 추가하여 모든 스크립트가 로드되도록 함
document.addEventListener('DOMContentLoaded', function() {
  try {
    // 로고 이미지 오류 처리 설정
    handleLogoError();
    
    // 약간의 지연 후 앱 초기화 (모든 객체가 정의되도록)
    setTimeout(async function() {
      try {
        // 모든 필요한 객체가 로드되었는지 확인
        if (typeof dataManager === 'undefined') {
          console.error('dataManager 객체가 정의되지 않았습니다.');
          
          // 오류가 발생한 경우 DataManager 클래스가 있는지 확인하고 인스턴스 생성 시도
          if (typeof DataManager !== 'undefined') {
            window.dataManager = new DataManager();
            console.log('dataManager 객체를 자동으로 생성했습니다.');
          } else {
            throw new Error('DataManager 클래스가 로드되지 않았습니다.');
          }
        }
        
        // 앱 초기화
        await initializeApp();
      } catch (innerError) {
        console.error('앱 초기화 오류:', innerError);
        alert('애플리케이션을 초기화하는 중 오류가 발생했습니다: ' + innerError.message);
      }
    }, 300); // 지연 시간을 300ms로 늘림
    
  } catch (error) {
    console.error('앱 로드 오류:', error);
    alert('애플리케이션을 로드하는 중 오류가 발생했습니다.');
  }
});

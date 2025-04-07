/**
 * 간소화된 페이지 관리 스크립트
 */

// 메시지 유틸리티
const messageUtils = {
  showMessage(message, type = 'info', duration = 3000) {
    const messageEl = document.getElementById('messagePopup');
    if (!messageEl) return;
    
    const messageText = messageEl.querySelector('.message-text');
    const messageIcon = messageEl.querySelector('.message-icon');
    
    // 타입에 따른 아이콘과 클래스 설정
    let iconClass = 'fa-info-circle';
    messageEl.className = 'message-popup';
    
    if (type === 'success') {
      iconClass = 'fa-check-circle';
      messageEl.classList.add('message-success');
    } else if (type === 'error') {
      iconClass = 'fa-times-circle';
      messageEl.classList.add('message-error');
    } else if (type === 'warning') {
      iconClass = 'fa-exclamation-triangle';
      messageEl.classList.add('message-warning');
    } else {
      messageEl.classList.add('message-info');
    }
    
    // 아이콘 및 메시지 설정
    messageIcon.className = `fa-solid ${iconClass} message-icon`;
    messageText.textContent = message;
    
    // 메시지 표시
    messageEl.classList.add('active');
    
    // 타이머 설정
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
    }
    
    this.messageTimer = setTimeout(() => {
      messageEl.classList.remove('active');
    }, duration);
  },
  
  success(message, duration = 3000) {
    this.showMessage(message, 'success', duration);
  },
  
  error(message, duration = 3000) {
    this.showMessage(message, 'error', duration);
  },
  
  warning(message, duration = 3000) {
    this.showMessage(message, 'warning', duration);
  },
  
  info(message, duration = 3000) {
    this.showMessage(message, 'info', duration);
  }
};

// 현재 활성화된 페이지
let currentPage = 'dashboard';
let pageContent = {};

// 페이지 로드 함수
async function loadPage(pageName) {
  try {
    console.log(`페이지 로드: ${pageName}`);
    
    // 페이지가 이미 캐시되어 있으면 캐시에서 가져옴
    if (pageContent[pageName]) {
      displayPage(pageName, pageContent[pageName]);
      return;
    }
    
    // 로딩 표시
    messageUtils.info(`${pageName} 페이지 로딩 중...`);
    
    // 페이지 HTML 로드
    const response = await fetch(`${pageName}.html`);
    if (!response.ok) {
      throw new Error(`페이지를 로드할 수 없습니다 (${response.status})`);
    }
    
    const html = await response.text();
    
    // 캐시에 저장
    pageContent[pageName] = html;
    
    // 페이지 표시
    displayPage(pageName, html);
    
    // 완료 메시지
    messageUtils.success(`${pageName} 페이지가 로드되었습니다.`);
    
  } catch (error) {
    console.error('페이지 로드 오류:', error);
    messageUtils.error(`페이지를 로드하는 중 오류가 발생했습니다: ${error.message}`);
  }
}

// 페이지 표시 함수
function displayPage(pageName, html) {
  // 컨텐츠 컨테이너 가져오기
  const contentContainer = document.getElementById('content-container');
  if (!contentContainer) {
    console.error('content-container 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 이전 페이지에서 활성화된 메뉴 항목 비활성화
  const prevMenuItem = document.querySelector(`.menu-item[data-page="${currentPage}"]`);
  if (prevMenuItem) {
    prevMenuItem.classList.remove('active');
  }
  
  // 새 페이지의 메뉴 항목 활성화
  const newMenuItem = document.querySelector(`.menu-item[data-page="${pageName}"]`);
  if (newMenuItem) {
    newMenuItem.classList.add('active');
  }
  
  // 페이지 내용 설정
  contentContainer.innerHTML = html;
  
  // 현재 페이지 업데이트
  currentPage = pageName;
  
  // 스크립트 태그 실행
  const scripts = contentContainer.querySelectorAll('script');
  scripts.forEach(oldScript => {
    const newScript = document.createElement('script');
    
    // 속성 복사
    Array.from(oldScript.attributes).forEach(attr => {
      newScript.setAttribute(attr.name, attr.value);
    });
    
    // 스크립트 내용 복사
    newScript.textContent = oldScript.textContent;
    
    // 이전 스크립트 제거 및 새 스크립트 추가
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}

// 메뉴 핸들러 설정
function setupMenuHandlers() {
  const menuItems = document.querySelectorAll('.menu-item');
  
  menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const pageName = this.getAttribute('data-page');
      
      if (pageName && pageName !== currentPage) {
        loadPage(pageName);
      }
    });
  });
  
  // 로그아웃 버튼 이벤트
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (confirm('로그아웃 하시겠습니까?')) {
        messageUtils.info('로그아웃되었습니다.');
        
        // 실제 로그아웃 처리는 여기서 구현 (지금은 새로고침으로 대체)
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    });
  }
}

// 페이지 스타일 정의
function addStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* 메시지 팝업 스타일 */
    .message-popup {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: white;
      border-radius: 4px;
      padding: 12px 16px;
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      z-index: 1000;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
    }
    
    .message-popup.active {
      opacity: 1;
      transform: translateY(0);
    }
    
    .message-icon {
      margin-right: 8px;
      font-size: 1.1rem;
    }
    
    .message-success .message-icon {
      color: #52c41a;
    }
    
    .message-error .message-icon {
      color: #f5222d;
    }
    
    .message-warning .message-icon {
      color: #faad14;
    }
    
    .message-info .message-icon {
      color: #1890ff;
    }
    
    /* 카드 스타일 개선 */
    .main-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      margin-bottom: 20px;
    }
    
    /* 인수인계 카드 컨테이너 */
    .handover-card-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      padding: 20px;
    }
    
    /* 차트 컨테이너 */
    .chart-container {
      padding: 20px;
      height: 400px;
      margin: 20px;
    }
  `;
  
  document.head.appendChild(styleEl);
}

// 초기화 함수
async function init() {
  // 메뉴 핸들러 설정
  setupMenuHandlers();
  
  // 스타일 추가
  addStyles();
  
  // 기본 페이지 로드
  await loadPage('dashboard');
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);

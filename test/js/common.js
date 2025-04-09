/**
 * 공통 유틸리티 함수
 * 프로토타입에 필요한 최소한의 기능만 제공
 */

// 날짜 포맷 함수
function formatDate(date) {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error('날짜 포맷 오류:', e);
    return '-';
  }
}

// 시간 포함 날짜 포맷 함수
function formatDateTime(date) {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (e) {
    console.error('날짜 시간 포맷 오류:', e);
    return '-';
  }
}

// 상태 텍스트 변환
function getStatusText(status) {
  const statusMap = {
    'PENDING': '대기',
    'IN_PROGRESS': '진행',
    'COMPLETE': '완료',
    'ISSUE': '이슈',
    'CANCEL': '취소'
  };
  return statusMap[status] || status;
}

// 상태에 따른 배경 색상 클래스
function getStatusClass(status) {
  const classMap = {
    'PENDING': 'status-pending',
    'IN_PROGRESS': 'status-progress',
    'COMPLETE': 'status-complete',
    'ISSUE': 'status-issue',
    'CANCEL': 'status-cancel'
  };
  return classMap[status] || '';
}

// 테이블 행 클릭 이벤트 설정
function setupTableRowEvents(tableId, clickCallback) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  // 이미 설정된 이벤트가 있을 수 있으므로 먼저 제거
  table.removeEventListener('click', tableClickHandler);
  
  // 클릭 핸들러 함수
  function tableClickHandler(e) {
    const row = e.target.closest('tr');
    if (row && row.getAttribute('data-id')) {
      const id = row.getAttribute('data-id');
      if (id && clickCallback) clickCallback(id);
    }
  }
  
  // 새 이벤트 설정
  table.addEventListener('click', tableClickHandler);
}

// 앱 초기화 - 각 HTML 페이지 하단에서 호출
function initApp() {
  console.log('앱 초기화');
  
  // 로그아웃 버튼 이벤트 설정
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('로그아웃 하시겠습니까?')) {
        // 1.5초 후 페이지 새로고침 (사용자 경험 향상)
        showMessage('로그아웃되었습니다.', 'success');
        setTimeout(() => {
          location.reload();
        }, 1500);
      }
    });
  }
  
  // 메시지 시스템 초기화
  initMessages();
  
  // 모달 초기화
  initModals();
}

// 페이지 타이틀 설정
function setPageTitle(title) {
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) {
    pageTitle.textContent = title;
  }
  document.title = `TMS - ${title}`;
}

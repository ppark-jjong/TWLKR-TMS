/**
 * 공통 유틸리티 함수
 */

// 페이지 타이틀 설정
function setPageTitle(title) {
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = title;
  document.title = `TMS - ${title}`;
}

// 날짜 포맷 (YYYY-MM-DD)
function formatDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error('날짜 포맷 오류:', e);
    return '';
  }
}

// 날짜 시간 포맷 (YYYY-MM-DD HH:MM)
function formatDateTime(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (e) {
    console.error('날짜 시간 포맷 오류:', e);
    return '';
  }
}

// 상태 텍스트 변환
function getStatusText(status) {
  switch (status) {
    case 'PENDING': return '대기';
    case 'IN_PROGRESS': return '진행';
    case 'COMPLETE': return '완료';
    case 'ISSUE': return '이슈';
    case 'CANCEL': return '취소';
    default: return status || '';
  }
}

// 상태 클래스 변환
function getStatusClass(status) {
  switch (status) {
    case 'PENDING': return 'status-pending';
    case 'IN_PROGRESS': return 'status-progress';
    case 'COMPLETE': return 'status-complete';
    case 'ISSUE': return 'status-issue';
    case 'CANCEL': return 'status-cancel';
    default: return '';
  }
}

// 창고 텍스트 변환
function getWarehouseText(warehouse) {
  switch (warehouse) {
    case 'SEOUL': return '서울';
    case 'BUSAN': return '부산';
    case 'GWANGJU': return '광주';
    case 'DAEJEON': return '대전';
    default: return warehouse || '';
  }
}

// 로그아웃 처리
function setupLogout() {
  const logoutBtns = document.querySelectorAll('#logoutBtn');
  
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('로그아웃 하시겠습니까?')) {
        // 로그아웃 처리 (프로토타입에서는 메시지만 표시)
        showMessage('로그아웃 되었습니다', 'info');
        
        // 2초 후 메인 페이지로 이동
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
      }
    });
  });
}

// 로그인 사용자 정보 표시
function displayUserInfo() {
  const userData = getUserData();
  
  const userNameEl = document.getElementById('userDisplayName');
  const userRoleEl = document.getElementById('userDisplayRole');
  
  if (userNameEl) userNameEl.textContent = userData.userName;
  if (userRoleEl) userRoleEl.textContent = userData.userRole;
}

// 페이지 로드 시 공통 기능 초기화
document.addEventListener('DOMContentLoaded', () => {
  // 로그아웃 이벤트 설정
  setupLogout();
  
  // 사용자 정보 표시
  displayUserInfo();
});

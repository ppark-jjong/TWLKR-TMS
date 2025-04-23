/**
 * 대시보드 페이지 초기화
 */

/**
 * 대시보드 페이지 초기화
 */
function initializeDashboard() {
  console.log('대시보드 페이지 초기화 시작...');
  
  try {
    // 날짜 선택기 초기화
    DashboardFilter.initializeDatePickers();
    console.log('날짜 선택기 초기화 완료');
    
    // 테이블 컬럼 선택기 초기화
    DashboardTable.initializeColumnSelector();
    console.log('테이블 컬럼 선택기 초기화 완료');
    
    // 이벤트 리스너 등록
    registerEventListeners();
    console.log('이벤트 리스너 등록 완료');
    
    // 페이지네이션 초기화
    initializePagination();
    console.log('페이지네이션 초기화 완료');
    
    // URL 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const hasDateParams = urlParams.has('startDate') || urlParams.has('endDate');
    
    // 날짜 파라미터가 없으면 오늘 날짜로 자동 조회
    if (!hasDateParams && !urlParams.has('orderNo')) {
      console.log('날짜 파라미터 없음, 오늘 날짜로 자동 조회 실행');
      DashboardFilter.submitFilterForm();
    }
    
    console.log('대시보드 페이지 초기화 완료');
  } catch (error) {
    console.error('대시보드 초기화 중 오류 발생:', error);
  }
}

/**
 * 페이지네이션 초기화
 */
function initializePagination() {
  try {
    const pageNumberContainer = document.getElementById('pageNumberContainer');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    if (pageNumberContainer) {
      // 현재 페이지 번호와 총 페이지 수 (URL 파라미터에서 가져옴)
      const urlParams = new URLSearchParams(window.location.search);
      const currentPage = parseInt(urlParams.get('page') || '1');
      
      // 페이지네이션 정보에서 데이터 가져오기
      const paginationInfo = document.querySelector('.pagination-info');
      let totalPages = parseInt(paginationInfo?.dataset.totalPages || '1');
      let total = parseInt(paginationInfo?.dataset.total || '0');
      
      console.log('Pagination data:', {
        currentPage,
        totalPages,
        total,
        pageSize: parseInt(urlParams.get('limit') || '10')
      });
      
      // 페이지네이션 초기화 (Pagination 객체가 사용 가능한 경우)
      if (typeof Pagination !== 'undefined') {
        Pagination.init('pagination', currentPage, totalPages, Pagination.handleUrlPagination, {
          total: total,
          pageSize: parseInt(urlParams.get('limit') || '10')
        });
        console.log('Pagination 라이브러리를 통한 페이지네이션 초기화 성공');
      } else {
        // 기본 페이지네이션 처리 (Pagination 객체가 없는 경우)
        setupBasicPagination(currentPage, totalPages);
        console.log('기본 페이지네이션 초기화 성공');
      }
    }
  } catch (error) {
    console.error('페이지네이션 초기화 중 오류 발생:', error);
  }
}

/**
 * 기본 페이지네이션 설정
 */
function setupBasicPagination(currentPage, totalPages) {
  const pageNumberContainer = document.getElementById('pageNumberContainer');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  
  if (!pageNumberContainer) return;
  
  // 이전 페이지 버튼
  if (prevPageBtn) {
    prevPageBtn.disabled = currentPage <= 1;
    prevPageBtn.onclick = function() {
      if (currentPage > 1) {
        navigateToPage(currentPage - 1);
      }
    };
  }
  
  // 다음 페이지 버튼
  if (nextPageBtn) {
    nextPageBtn.disabled = currentPage >= totalPages;
    nextPageBtn.onclick = function() {
      if (currentPage < totalPages) {
        navigateToPage(currentPage + 1);
      }
    };
  }
  
  // 페이지 번호 생성
  pageNumberContainer.innerHTML = '';
  
  // 표시할 페이지 번호 범위 계산 (최대 5개)
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  // 시작 페이지 재조정 (끝 페이지가 최대치보다 작은 경우)
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  
  // 첫 페이지 버튼 (첫 페이지가 표시 범위에 없는 경우)
  if (startPage > 1) {
    const firstPageBtn = document.createElement('button');
    firstPageBtn.type = 'button';
    firstPageBtn.className = 'page-number-btn';
    firstPageBtn.textContent = '1';
    firstPageBtn.onclick = function() {
      navigateToPage(1);
    };
    pageNumberContainer.appendChild(firstPageBtn);
    
    // 생략 표시
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-ellipsis';
      ellipsis.textContent = '...';
      pageNumberContainer.appendChild(ellipsis);
    }
  }
  
  // 페이지 번호 버튼 생성
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.type = 'button';
    pageBtn.className = 'page-number-btn' + (i === currentPage ? ' active' : '');
    pageBtn.textContent = i;
    pageBtn.onclick = function() {
      navigateToPage(i);
    };
    pageNumberContainer.appendChild(pageBtn);
  }
  
  // 마지막 페이지 버튼 (마지막 페이지가 표시 범위에 없는 경우)
  if (endPage < totalPages) {
    // 생략 표시
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-ellipsis';
      ellipsis.textContent = '...';
      pageNumberContainer.appendChild(ellipsis);
    }
    
    const lastPageBtn = document.createElement('button');
    lastPageBtn.type = 'button';
    lastPageBtn.className = 'page-number-btn';
    lastPageBtn.textContent = totalPages;
    lastPageBtn.onclick = function() {
      navigateToPage(totalPages);
    };
    pageNumberContainer.appendChild(lastPageBtn);
  }
}

/**
 * 특정 페이지로 이동
 */
function navigateToPage(page) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', page);
  window.location.href = url.toString();
}

/**
 * 이벤트 리스너 등록
 */
function registerEventListeners() {
  try {
    console.log('이벤트 리스너 등록 시작...');
    
    // 필터 이벤트
    DashboardFilter.registerFilterEvents();
    console.log('필터 이벤트 등록 완료');
    
    // 테이블 이벤트
    DashboardTable.registerTableEvents();
    console.log('테이블 이벤트 등록 완료');
    
    // 모달 이벤트
    DashboardModals.initializeModalEvents();
    console.log('모달 이벤트 등록 완료');
    
    // 액션 버튼 이벤트
    DashboardActions.initializeActionButtons();
    console.log('액션 버튼 이벤트 등록 완료');
    
    // 페이지 크기 변경 이벤트 확인 및 추가
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
      // 기존 이벤트 리스너 제거 (중복 방지)
      pageSizeSelect.removeEventListener('change', handlePageSizeChange);
      // 새 이벤트 리스너 추가
      pageSizeSelect.addEventListener('change', handlePageSizeChange);
      console.log('페이지 크기 변경 이벤트 등록 완료');
      
      // 현재 URL에서 페이지 크기 파라미터가 있으면 선택
      const urlParams = new URLSearchParams(window.location.search);
      const currentPageSize = urlParams.get('limit');
      if (currentPageSize) {
        pageSizeSelect.value = currentPageSize;
        console.log('현재 페이지 크기 설정:', currentPageSize);
      }
    }
    
    console.log('이벤트 리스너 등록 완료');
  } catch (error) {
    console.error('이벤트 리스너 등록 중 오류 발생:', error);
  }
}

/**
 * 페이지 크기 변경 핸들러
 */
function handlePageSizeChange() {
  try {
    console.log('페이지 크기 변경됨:', this.value);
    const url = new URL(window.location.href);
    url.searchParams.set('limit', this.value);
    url.searchParams.set('page', '1'); // 페이지 번호 리셋
    window.location.href = url.toString();
  } catch (error) {
    console.error('페이지 크기 변경 처리 중 오류 발생:', error);
  }
}

// 문서 로드 완료 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded 이벤트 발생');
  initializeDashboard();
});

// 전역 namespace에 등록
window.Dashboard = {
  init: initializeDashboard,
  navigateToPage: navigateToPage,
  handlePageSizeChange: handlePageSizeChange
};

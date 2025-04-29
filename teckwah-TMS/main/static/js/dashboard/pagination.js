/**
 * 대시보드 페이지네이션 모듈
 * 테이블 페이지네이션을 담당합니다.
 */

// 네임스페이스에 모듈 추가
Dashboard.pagination = {
  /**
   * 초기화
   */
  init: function() {
    console.log('[Dashboard.pagination] 초기화');
    
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageNumberContainer = document.getElementById('pageNumberContainer');
    
    if (!prevPageBtn || !nextPageBtn || !pageNumberContainer) return;
    
    // 이전 페이지 버튼
    prevPageBtn.addEventListener('click', () => {
      if (Dashboard.state.currentPage > 1) {
        Dashboard.state.currentPage--;
        Dashboard.applyFilters();
        this.update();
      }
    });
    
    // 다음 페이지 버튼
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(Dashboard.state.totalItems / Dashboard.state.pageSize);
      if (Dashboard.state.currentPage < totalPages) {
        Dashboard.state.currentPage++;
        Dashboard.applyFilters();
        this.update();
      }
    });
    
    // 페이지 크기 선택 이벤트
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', () => {
        Dashboard.state.pageSize = parseInt(pageSizeSelect.value, 10);
        Dashboard.state.currentPage = 1;
        Dashboard.applyFilters();
        this.update();
      });
    }
    
    // URL에서 페이지 정보 가져오기
    this.getFromUrl();
    
    // 초기 상태 업데이트
    this.update();
  },
  
  /**
   * 페이지네이션 업데이트
   */
  update: function() {
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageNumberContainer = document.getElementById('pageNumberContainer');
    const paginationInfo = document.querySelector('.pagination-info');
    
    if (!prevPageBtn || !nextPageBtn || !pageNumberContainer || !paginationInfo) return;
    
    // 총 페이지 수 계산
    const totalPages = Math.ceil(Dashboard.state.totalItems / Dashboard.state.pageSize);
    
    // 이전/다음 버튼 비활성화 상태 설정
    prevPageBtn.disabled = Dashboard.state.currentPage <= 1;
    nextPageBtn.disabled = Dashboard.state.currentPage >= totalPages;
    
    // 페이지 번호 버튼 생성 - innerHTML 사용 (최적화)
    let pageButtonsHtml = '';
    
    // 표시할 페이지 범위 계산
    let startPage = Math.max(1, Dashboard.state.currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    startPage = Math.max(1, endPage - 4);
    
    for (let i = startPage; i <= endPage; i++) {
      const isCurrentPage = i === Dashboard.state.currentPage;
      pageButtonsHtml += `
        <button class="pagination-btn ${isCurrentPage ? 'current' : ''}" 
                data-page="${i}">${i}</button>
      `;
    }
    
    pageNumberContainer.innerHTML = pageButtonsHtml;
    
    // 페이지 버튼 클릭 이벤트를 다시 연결
    this.attachPageButtonEvents();
    
    // 페이지네이션 정보 업데이트
    const startItem = Dashboard.state.totalItems > 0 ? 
      (Dashboard.state.currentPage - 1) * Dashboard.state.pageSize + 1 : 0;
    const endItem = Math.min(Dashboard.state.currentPage * Dashboard.state.pageSize, Dashboard.state.totalItems);
    
    paginationInfo.textContent = `총 ${Dashboard.state.totalItems}개 항목 중 ${startItem}-${endItem} 표시`;
    
    // URL 업데이트
    this.updateUrl();
  },
  
  /**
   * 페이지 버튼 이벤트 연결
   */
  attachPageButtonEvents: function() {
    const pageNumberContainer = document.getElementById('pageNumberContainer');
    if (!pageNumberContainer) return;
    
    // 기존 이벤트 리스너 제거 (클론 후 교체)
    const newContainer = pageNumberContainer.cloneNode(true);
    pageNumberContainer.parentNode.replaceChild(newContainer, pageNumberContainer);
    
    // 새 이벤트 리스너 추가 (이벤트 위임)
    newContainer.addEventListener('click', (e) => {
      const pageBtn = e.target.closest('.pagination-btn');
      if (pageBtn) {
        const page = parseInt(pageBtn.getAttribute('data-page'), 10);
        if (page && page !== Dashboard.state.currentPage) {
          Dashboard.state.currentPage = page;
          Dashboard.applyFilters();
          this.update();
        }
      }
    });
  },
  
  /**
   * URL에서 페이지 정보 가져오기
   */
  getFromUrl: function() {
    const pageParam = Utils.getUrlParam('page');
    const pageSizeParam = Utils.getUrlParam('page_size');
    
    if (pageParam) {
      Dashboard.state.currentPage = parseInt(pageParam, 10);
    }
    
    if (pageSizeParam) {
      Dashboard.state.pageSize = parseInt(pageSizeParam, 10);
      
      // 페이지 크기 선택 상자 업데이트
      const pageSizeSelect = document.getElementById('pageSizeSelect');
      if (pageSizeSelect) {
        pageSizeSelect.value = Dashboard.state.pageSize;
      }
    }
  },
  
  /**
   * URL 업데이트
   */
  updateUrl: function() {
    const url = new URL(window.location.href);
    
    url.searchParams.set('page', Dashboard.state.currentPage);
    url.searchParams.set('page_size', Dashboard.state.pageSize);
    
    window.history.replaceState({}, '', url);
  }
};

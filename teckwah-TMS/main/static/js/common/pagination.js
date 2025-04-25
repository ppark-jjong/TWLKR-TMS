/**
 * 페이지네이션 관리 모듈
 * CSR 기반 페이지네이션 처리
 */
window.Pagination = {
  /**
   * 현재 페이지네이션 상태
   */
  state: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
    visiblePageCount: 5 // 한 번에 표시할 페이지 버튼 수
  },
  
  /**
   * 콜백 함수들
   */
  callbacks: {
    onPageChange: null, // 페이지 변경 시 호출될 콜백
    onPageSizeChange: null // 페이지 크기 변경 시 호출될 콜백
  },
  
  /**
   * 페이지네이션을 초기화합니다.
   * @param {Object} options - 초기화 옵션
   * @param {number} options.currentPage - 현재 페이지
   * @param {number} options.pageSize - 페이지 크기
   * @param {number} options.totalItems - 전체 항목 수
   * @param {Function} options.onPageChange - 페이지 변경 콜백
   * @param {Function} options.onPageSizeChange - 페이지 크기 변경 콜백
   */
  init: function(options = {}) {
    // 상태 초기화
    this.state.currentPage = options.currentPage || parseInt(Utils.getUrlParam('page', '1'));
    this.state.pageSize = options.pageSize || parseInt(Utils.getFromStorage('pageSize', '10'));
    this.state.totalItems = options.totalItems || 0;
    
    // 콜백 설정
    this.callbacks.onPageChange = options.onPageChange || null;
    this.callbacks.onPageSizeChange = options.onPageSizeChange || null;
    
    // 총 페이지 수 계산
    this.updateTotalPages();
    
    // 이벤트 리스너 설정
    this.setupEventListeners();
    
    // UI 업데이트
    this.renderPagination();
    this.updatePageInfo();
  },
  
  /**
   * 이벤트 리스너를 설정합니다.
   */
  setupEventListeners: function() {
    // 이전 페이지 버튼
    const prevPageBtn = document.getElementById('prevPageBtn');
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (this.state.currentPage > 1) {
          this.goToPage(this.state.currentPage - 1);
        }
      });
    }
    
    // 다음 페이지 버튼
    const nextPageBtn = document.getElementById('nextPageBtn');
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        if (this.state.currentPage < this.state.totalPages) {
          this.goToPage(this.state.currentPage + 1);
        }
      });
    }
    
    // 페이지 크기 선택
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
      // 저장된 페이지 크기로 초기화
      pageSizeSelect.value = this.state.pageSize.toString();
      
      pageSizeSelect.addEventListener('change', () => {
        const newPageSize = parseInt(pageSizeSelect.value);
        this.changePageSize(newPageSize);
      });
    }
    
    // 페이지 번호 클릭 이벤트 위임
    const pageNumberContainer = document.getElementById('pageNumberContainer');
    if (pageNumberContainer) {
      pageNumberContainer.addEventListener('click', (event) => {
        const pageButton = event.target.closest('.page-number');
        if (pageButton) {
          const page = parseInt(pageButton.dataset.page);
          if (!isNaN(page)) {
            this.goToPage(page);
          }
        }
      });
    }
  },
  
  /**
   * 특정 페이지로 이동합니다.
   * @param {number} page - 이동할 페이지 번호
   */
  goToPage: function(page) {
    if (page < 1 || page > this.state.totalPages || page === this.state.currentPage) {
      return;
    }
    
    this.state.currentPage = page;
    
    // URL 매개변수 업데이트
    Utils.updateUrlParams({ page: page });
    
    // UI 업데이트
    this.renderPagination();
    this.updatePageInfo();
    
    // 콜백 호출
    if (typeof this.callbacks.onPageChange === 'function') {
      this.callbacks.onPageChange(page, this.state.pageSize);
    }
  },
  
  /**
   * 페이지 크기를 변경합니다.
   * @param {number} pageSize - 새 페이지 크기
   */
  changePageSize: function(pageSize) {
    if (pageSize === this.state.pageSize) {
      return;
    }
    
    // 페이지 크기 변경에 따른 현재 페이지 위치 조정
    const currentFirstItem = (this.state.currentPage - 1) * this.state.pageSize + 1;
    const newPage = Math.max(1, Math.ceil(currentFirstItem / pageSize));
    
    this.state.pageSize = pageSize;
    this.state.currentPage = newPage;
    
    // 총 페이지 수 다시 계산
    this.updateTotalPages();
    
    // URL 매개변수 및 로컬 스토리지 업데이트
    Utils.updateUrlParams({ page: newPage });
    Utils.saveToStorage('pageSize', pageSize);
    
    // UI 업데이트
    this.renderPagination();
    this.updatePageInfo();
    
    // 콜백 호출
    if (typeof this.callbacks.onPageSizeChange === 'function') {
      this.callbacks.onPageSizeChange(pageSize);
    }
  },
  
  /**
   * 새 데이터로 페이지네이션을 업데이트합니다.
   * @param {number} totalItems - 전체 항목 수
   * @param {number} currentPage - 현재 페이지 (선택 사항)
   */
  update: function(totalItems, currentPage = null) {
    this.state.totalItems = totalItems;
    
    if (currentPage !== null) {
      this.state.currentPage = currentPage;
    }
    
    // 총 페이지 수 다시 계산
    this.updateTotalPages();
    
    // UI 업데이트
    this.renderPagination();
    this.updatePageInfo();
  },
  
  /**
   * 총 페이지 수를 계산합니다.
   */
  updateTotalPages: function() {
    this.state.totalPages = Math.max(1, Math.ceil(this.state.totalItems / this.state.pageSize));
    
    // 현재 페이지가 총 페이지 수를 초과하면 조정
    if (this.state.currentPage > this.state.totalPages) {
      this.state.currentPage = this.state.totalPages;
    }
  },
  
  /**
   * 페이지 번호 버튼을 렌더링합니다.
   */
  renderPagination: function() {
    const pageNumberContainer = document.getElementById('pageNumberContainer');
    if (!pageNumberContainer) return;
    
    // 컨테이너 초기화
    pageNumberContainer.innerHTML = '';
    
    // 표시할 페이지 범위 계산
    const visiblePageCount = this.state.visiblePageCount;
    let startPage = Math.max(1, this.state.currentPage - Math.floor(visiblePageCount / 2));
    let endPage = Math.min(this.state.totalPages, startPage + visiblePageCount - 1);
    
    // 시작 페이지 조정
    if (endPage - startPage + 1 < visiblePageCount) {
      startPage = Math.max(1, endPage - visiblePageCount + 1);
    }
    
    // 첫 페이지 버튼 (1이 표시되지 않은 경우)
    if (startPage > 1) {
      const firstPageBtn = document.createElement('button');
      firstPageBtn.type = 'button';
      firstPageBtn.className = 'page-number';
      firstPageBtn.dataset.page = '1';
      firstPageBtn.textContent = '1';
      pageNumberContainer.appendChild(firstPageBtn);
      
      // 처음 페이지와 시작 페이지 사이에 간격이 클 경우 '...' 추가
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-ellipsis';
        ellipsis.innerHTML = '&hellip;';
        pageNumberContainer.appendChild(ellipsis);
      }
    }
    
    // 페이지 번호 버튼 생성
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.type = 'button';
      pageBtn.className = 'page-number';
      if (i === this.state.currentPage) {
        pageBtn.classList.add('active');
      }
      pageBtn.dataset.page = i.toString();
      pageBtn.textContent = i.toString();
      pageNumberContainer.appendChild(pageBtn);
    }
    
    // 마지막 페이지 버튼 (마지막 페이지가 표시되지 않은 경우)
    if (endPage < this.state.totalPages) {
      // 마지막 페이지와 엔드 페이지 사이에 간격이 클 경우 '...' 추가
      if (endPage < this.state.totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-ellipsis';
        ellipsis.innerHTML = '&hellip;';
        pageNumberContainer.appendChild(ellipsis);
      }
      
      const lastPageBtn = document.createElement('button');
      lastPageBtn.type = 'button';
      lastPageBtn.className = 'page-number';
      lastPageBtn.dataset.page = this.state.totalPages.toString();
      lastPageBtn.textContent = this.state.totalPages.toString();
      pageNumberContainer.appendChild(lastPageBtn);
    }
    
    // 이전/다음 버튼 활성화 상태 업데이트
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    if (prevPageBtn) {
      prevPageBtn.disabled = this.state.currentPage <= 1;
    }
    
    if (nextPageBtn) {
      nextPageBtn.disabled = this.state.currentPage >= this.state.totalPages;
    }
  },
  
  /**
   * 페이지 정보를 업데이트합니다.
   */
  updatePageInfo: function() {
    const paginationInfo = document.querySelector('.pagination-info');
    if (!paginationInfo) return;
    
    // 데이터가 없는 경우
    if (this.state.totalItems === 0) {
      paginationInfo.textContent = '데이터가 없습니다';
      return;
    }
    
    // 현재 페이지의 시작 항목 인덱스
    const startIndex = (this.state.currentPage - 1) * this.state.pageSize + 1;
    
    // 현재 페이지의 마지막 항목 인덱스
    const endIndex = Math.min(startIndex + this.state.pageSize - 1, this.state.totalItems);
    
    // 페이지 정보 업데이트
    paginationInfo.textContent = `총 ${this.state.totalItems}개 항목 중 ${startIndex}-${endIndex} 표시`;
    
    // 데이터 속성 업데이트
    paginationInfo.dataset.total = this.state.totalItems;
    paginationInfo.dataset.totalPages = this.state.totalPages;
  },
  
  /**
   * 현재 페이지네이션 상태를 반환합니다.
   * @returns {Object} - 페이지네이션 상태
   */
  getState: function() {
    return { ...this.state };
  }
};

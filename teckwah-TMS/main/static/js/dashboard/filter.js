/**
 * 대시보드 필터 모듈
 * 테이블 데이터 필터링 및 검색 기능 제공
 */
window.DashboardFilter = {
  /**
   * 필터 상태
   */
  state: {
    status: '',
    department: '',
    warehouse: '',
    searchTerm: '',
    startDate: null,
    endDate: null,
    filteredRows: [], // 필터링된 행 캐시
    originalRows: [] // 원본 행 캐시
  },
  
  /**
   * 필터 모듈을 초기화합니다.
   */
  init: function() {
    this.cacheTableRows();
    this.setupEventListeners();
    this.initFromUrl();
  },
  
  /**
   * 테이블 행을 캐싱합니다.
   */
  cacheTableRows: function() {
    const rows = document.querySelectorAll('#orderTable tbody tr[data-id]');
    this.state.originalRows = Array.from(rows);
    this.state.filteredRows = [...this.state.originalRows];
  },
  
  /**
   * 이벤트 리스너를 설정합니다.
   */
  setupEventListeners: function() {
    // 상태 필터
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.state.status = statusFilter.value;
        this.applyFilters();
      });
    }
    
    // 부서 필터
    const departmentFilter = document.getElementById('departmentFilter');
    if (departmentFilter) {
      departmentFilter.addEventListener('change', () => {
        this.state.department = departmentFilter.value;
        this.applyFilters();
      });
    }
    
    // 창고 필터
    const warehouseFilter = document.getElementById('warehouseFilter');
    if (warehouseFilter) {
      warehouseFilter.addEventListener('change', () => {
        this.state.warehouse = warehouseFilter.value;
        this.applyFilters();
      });
    }
    
    // 날짜 필터
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const searchBtn = document.getElementById('searchBtn');
    
    if (startDate && endDate && searchBtn) {
      searchBtn.addEventListener('click', () => {
        // 날짜 필터는 서버 사이드 렌더링으로 처리되므로
        // 페이지를 다시 로드합니다.
        const startValue = startDate.value;
        const endValue = endDate.value;
        
        if (startValue && endValue) {
          window.location.href = `/dashboard?startDate=${startValue}&endDate=${endValue}`;
        } else if (startValue) {
          window.location.href = `/dashboard?startDate=${startValue}`;
        } else if (endValue) {
          window.location.href = `/dashboard?endDate=${endValue}`;
        }
      });
    }
    
    // 오늘 버튼
    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        window.location.href = '/dashboard';
      });
    }
    
    // 주문번호 검색
    const orderNoSearch = document.getElementById('orderNoSearch');
    const orderSearchBtn = document.getElementById('orderSearchBtn');
    
    if (orderNoSearch && orderSearchBtn) {
      // 엔터 키 이벤트
      orderNoSearch.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          this.searchByOrderNo();
        }
      });
      
      // 검색 버튼 클릭
      orderSearchBtn.addEventListener('click', () => {
        this.searchByOrderNo();
      });
    }
    
    // 필터 초기화 버튼
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }
  },
  
  /**
   * URL 매개변수에서 필터 상태를 초기화합니다.
   */
  initFromUrl: function() {
    const url = new URL(window.location.href);
    
    // 상태 필터 초기화
    const status = url.searchParams.get('status');
    if (status) {
      this.state.status = status;
      const statusFilter = document.getElementById('statusFilter');
      if (statusFilter) statusFilter.value = status;
    }
    
    // 부서 필터 초기화
    const department = url.searchParams.get('department');
    if (department) {
      this.state.department = department;
      const departmentFilter = document.getElementById('departmentFilter');
      if (departmentFilter) departmentFilter.value = department;
    }
    
    // 창고 필터 초기화
    const warehouse = url.searchParams.get('warehouse');
    if (warehouse) {
      this.state.warehouse = warehouse;
      const warehouseFilter = document.getElementById('warehouseFilter');
      if (warehouseFilter) warehouseFilter.value = warehouse;
    }
    
    // 날짜 필터 초기화
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    if (startDate) {
      this.state.startDate = startDate;
      const startDateInput = document.getElementById('startDate');
      if (startDateInput) startDateInput.value = startDate;
    }
    
    if (endDate) {
      this.state.endDate = endDate;
      const endDateInput = document.getElementById('endDate');
      if (endDateInput) endDateInput.value = endDate;
    }
    
    // 주문번호 검색 초기화
    const orderNo = url.searchParams.get('orderNo');
    if (orderNo) {
      this.state.searchTerm = orderNo;
      const orderNoSearch = document.getElementById('orderNoSearch');
      if (orderNoSearch) orderNoSearch.value = orderNo;
    }
    
    // 초기 필터 적용
    if (status || department || warehouse) {
      this.applyFilters();
    }
  },
  
  /**
   * 주문번호로 검색합니다.
   */
  searchByOrderNo: function() {
    const orderNoSearch = document.getElementById('orderNoSearch');
    if (!orderNoSearch) return;
    
    const orderNo = orderNoSearch.value.trim();
    
    if (orderNo) {
      // 주문번호 검색은 서버 사이드 렌더링으로 처리
      window.location.href = `/dashboard?orderNo=${encodeURIComponent(orderNo)}`;
    } else {
      // 검색어가 비어있으면 다른 필터만 적용
      window.location.href = `/dashboard`;
    }
  },
  
  /**
   * 클라이언트 측 필터를 적용합니다.
   */
  applyFilters: function() {
    // 테이블이 없으면 무시
    const table = document.getElementById('orderTable');
    if (!table) return;
    
    // 상태, 부서, 창고 필터 적용
    let filteredRows = [...this.state.originalRows];
    
    // 1. 상태 필터 적용
    if (this.state.status) {
      filteredRows = filteredRows.filter(row => {
        const statusCell = row.querySelector('.column-status .status-badge');
        return statusCell && statusCell.classList.contains(`status-${this.state.status}`);
      });
    }
    
    // 2. 부서 필터 적용
    if (this.state.department) {
      filteredRows = filteredRows.filter(row => {
        const departmentCell = row.querySelector('.column-department');
        return departmentCell && departmentCell.textContent.trim() === this.state.department;
      });
    }
    
    // 3. 창고 필터 적용
    if (this.state.warehouse) {
      filteredRows = filteredRows.filter(row => {
        const warehouseCell = row.querySelector('.column-warehouse');
        return warehouseCell && warehouseCell.textContent.trim() === this.state.warehouse;
      });
    }
    
    // 필터링된 행 저장
    this.state.filteredRows = filteredRows;
    
    // URL 매개변수 업데이트 (페이지 새로고침 없음)
    Utils.updateUrlParams({
      status: this.state.status,
      department: this.state.department,
      warehouse: this.state.warehouse
    });
    
    // 테이블에 필터링된 행 표시
    this.updateTableRows();
    
    // 페이지네이션 업데이트
    if (window.Pagination) {
      Pagination.update(filteredRows.length);
    }
  },
  
  /**
   * 테이블 행을 업데이트합니다.
   */
  updateTableRows: function() {
    const tbody = document.querySelector('#orderTable tbody');
    if (!tbody) return;
    
    // 기존 행 숨기기
    this.state.originalRows.forEach(row => {
      row.style.display = 'none';
    });
    
    // 필터링된 행 표시
    if (this.state.filteredRows.length > 0) {
      // 페이지네이션 적용
      let currentPage = 1;
      let pageSize = 10;
      
      if (window.Pagination) {
        const paginationState = Pagination.getState();
        currentPage = paginationState.currentPage;
        pageSize = paginationState.pageSize;
      }
      
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      
      // 현재 페이지에 해당하는 행만 표시
      this.state.filteredRows.forEach((row, index) => {
        if (index >= startIndex && index < endIndex) {
          row.style.display = '';
        }
      });
      
      // 데이터 없음 메시지 제거
      const noDataRow = tbody.querySelector('.no-data-row');
      if (noDataRow) {
        noDataRow.style.display = 'none';
      }
    } else {
      // 데이터가 없는 경우
      let noDataRow = tbody.querySelector('.no-data-row');
      
      if (!noDataRow) {
        // 데이터 없음 행 생성
        noDataRow = document.createElement('tr');
        noDataRow.className = 'no-data-row';
        
        const noDataCell = document.createElement('td');
        noDataCell.colSpan = '11';
        noDataCell.className = 'no-data-cell';
        noDataCell.textContent = '데이터가 없습니다';
        
        noDataRow.appendChild(noDataCell);
        tbody.appendChild(noDataRow);
      } else {
        noDataRow.style.display = '';
      }
    }
    
    // 체크박스 상태 초기화
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
    }
    
    // 선택된 행 액션 패널 업데이트
    if (window.DashboardTable) {
      DashboardTable.updateSelectedCount();
    }
  },
  
  /**
   * 모든 필터를 초기화합니다.
   */
  resetFilters: function() {
    // 필터 상태 초기화
    this.state.status = '';
    this.state.department = '';
    this.state.warehouse = '';
    
    // 필터 UI 초기화
    const statusFilter = document.getElementById('statusFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    const warehouseFilter = document.getElementById('warehouseFilter');
    
    if (statusFilter) statusFilter.value = '';
    if (departmentFilter) departmentFilter.value = '';
    if (warehouseFilter) warehouseFilter.value = '';
    
    // 필터링된 행 초기화
    this.state.filteredRows = [...this.state.originalRows];
    
    // URL 매개변수 업데이트 (페이지 새로고침 없음)
    Utils.updateUrlParams({
      status: null,
      department: null,
      warehouse: null
    });
    
    // 테이블에 모든 행 표시
    this.updateTableRows();
    
    // 페이지네이션 업데이트
    if (window.Pagination) {
      Pagination.update(this.state.originalRows.length);
    }
  },
  
  /**
   * 테이블 데이터를 새로고침합니다.
   */
  refreshData: function() {
    // 현재 URL의 모든 매개변수를 유지하며 페이지 새로고침
    window.location.reload();
  }
};

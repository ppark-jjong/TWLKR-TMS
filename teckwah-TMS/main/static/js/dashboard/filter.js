console.log('[로드] dashboard/filter.js 로드됨 - ' + new Date().toISOString());

/**
 * 대시보드 필터 모듈
 * 필터링 기능을 처리합니다.
 */
(function() {
  // Dashboard 객체가 존재하는지 확인
  if (!window.Dashboard) {
    console.error('[대시보드/filter] Dashboard 객체가 초기화되지 않았습니다.');
    return;
  }
  
  // 필터 객체 정의
  const filter = {
    /**
     * 초기화 함수
     */
    init: function() {
      console.log('[대시보드/filter] 초기화 시작');
      
      this.bindFilterEvents();
      this.setupInitialFilters();
      
      console.log('[대시보드/filter] 초기화 완료');
      return true;
    },
    
    /**
     * 필터 이벤트를 바인딩합니다.
     */
    bindFilterEvents: function() {
      // 검색 버튼 클릭 이벤트
      const searchBtn = document.getElementById('searchBtn');
      if (searchBtn) {
        searchBtn.addEventListener('click', () => {
          this.applyDateFilter();
        });
      }
      
      // 오늘 버튼 클릭 이벤트
      const todayBtn = document.getElementById('todayBtn');
      if (todayBtn) {
        todayBtn.addEventListener('click', () => {
          this.setTodayFilter();
        });
      }
      
      // 주문번호 검색 이벤트
      const orderSearchBtn = document.getElementById('orderSearchBtn');
      if (orderSearchBtn) {
        orderSearchBtn.addEventListener('click', () => {
          this.applyOrderNoFilter();
        });
      }
      
      // 주문번호 입력 필드 엔터 키 이벤트
      const orderNoSearch = document.getElementById('orderNoSearch');
      if (orderNoSearch) {
        orderNoSearch.addEventListener('keypress', (event) => {
          if (event.key === 'Enter') {
            this.applyOrderNoFilter();
          }
        });
      }
      
      // 상태 필터 변경 이벤트
      const statusFilter = document.getElementById('statusFilter');
      if (statusFilter) {
        statusFilter.addEventListener('change', () => {
          this.applyCSRFilters();
        });
      }
      
      // 부서 필터 변경 이벤트
      const departmentFilter = document.getElementById('departmentFilter');
      if (departmentFilter) {
        departmentFilter.addEventListener('change', () => {
          this.applyCSRFilters();
        });
      }
      
      // 창고 필터 변경 이벤트
      const warehouseFilter = document.getElementById('warehouseFilter');
      if (warehouseFilter) {
        warehouseFilter.addEventListener('change', () => {
          this.applyCSRFilters();
        });
      }
      
      // 필터 초기화 버튼 클릭 이벤트
      const resetFilterBtn = document.getElementById('resetFilterBtn');
      if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
          this.resetFilters();
        });
      }
      
      // 새로고침 버튼 클릭 이벤트
      const refreshBtn = document.getElementById('refreshBtn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          this.refreshData();
        });
      }
    },
    
    /**
     * 초기 필터를 설정합니다.
     */
    setupInitialFilters: function() {
      // URL 매개변수에서 필터 값 가져오기
      const startDate = this.getUrlParam('start_date');
      const endDate = this.getUrlParam('end_date');
      const orderNo = this.getUrlParam('order_no');
      const status = this.getUrlParam('status');
      const department = this.getUrlParam('department');
      const warehouse = this.getUrlParam('warehouse');
      
      // 날짜 필터 설정
      const startDateInput = document.getElementById('startDate');
      const endDateInput = document.getElementById('endDate');
      
      if (startDateInput && startDate) {
        startDateInput.value = startDate;
      } else if (startDateInput) {
        // 기본값: 오늘
        startDateInput.value = this.getTodayDate();
      }
      
      if (endDateInput && endDate) {
        endDateInput.value = endDate;
      } else if (endDateInput) {
        // 기본값: 오늘
        endDateInput.value = this.getTodayDate();
      }
      
      // 주문번호 검색 설정
      const orderNoSearch = document.getElementById('orderNoSearch');
      if (orderNoSearch && orderNo) {
        orderNoSearch.value = orderNo;
      }
      
      // 상태 필터 설정
      const statusFilter = document.getElementById('statusFilter');
      if (statusFilter && status) {
        statusFilter.value = status;
      }
      
      // 부서 필터 설정
      const departmentFilter = document.getElementById('departmentFilter');
      if (departmentFilter && department) {
        departmentFilter.value = department;
      }
      
      // 창고 필터 설정
      const warehouseFilter = document.getElementById('warehouseFilter');
      if (warehouseFilter && warehouse) {
        warehouseFilter.value = warehouse;
      }
    },
    
    /**
     * 날짜 필터를 적용합니다.
     */
    applyDateFilter: function() {
      const startDate = document.getElementById('startDate')?.value;
      const endDate = document.getElementById('endDate')?.value;
      
      if (!startDate || !endDate) {
        if (window.Alerts) {
          Alerts.warning('시작일과 종료일을 모두 선택해주세요.');
        } else {
          alert('시작일과 종료일을 모두 선택해주세요.');
        }
        return;
      }
      
      // 페이지 새로고침 (서버 필터링)
      window.location.href = `?start_date=${startDate}&end_date=${endDate}`;
    },
    
    /**
     * 오늘 날짜 필터를 설정합니다.
     */
    setTodayFilter: function() {
      const today = this.getTodayDate();
      
      const startDateInput = document.getElementById('startDate');
      const endDateInput = document.getElementById('endDate');
      
      if (startDateInput) startDateInput.value = today;
      if (endDateInput) endDateInput.value = today;
      
      // 필터 적용
      this.applyDateFilter();
    },
    
    /**
     * 주문번호 필터를 적용합니다.
     */
    applyOrderNoFilter: function() {
      const orderNo = document.getElementById('orderNoSearch')?.value?.trim();
      
      if (!orderNo) {
        if (window.Alerts) {
          Alerts.warning('검색할 주문번호를 입력해주세요.');
        } else {
          alert('검색할 주문번호를 입력해주세요.');
        }
        return;
      }
      
      // 페이지 새로고침 (서버 필터링)
      window.location.href = `?order_no=${orderNo}`;
    },
    
    /**
     * CSR 필터를 적용합니다 (클라이언트 사이드 필터링).
     */
    applyCSRFilters: function() {
      const status = document.getElementById('statusFilter')?.value;
      const department = document.getElementById('departmentFilter')?.value;
      const warehouse = document.getElementById('warehouseFilter')?.value;
      
      // URL 매개변수 업데이트 (페이지 새로고침 없음)
      const params = {};
      if (status) params.status = status;
      if (department) params.department = department;
      if (warehouse) params.warehouse = warehouse;
      
      // 기존 날짜 필터 유지
      const startDate = this.getUrlParam('start_date');
      const endDate = this.getUrlParam('end_date');
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      // 기존 주문번호 검색 유지
      const orderNo = this.getUrlParam('order_no');
      if (orderNo) params.order_no = orderNo;
      
      // URL 업데이트
      if (window.Dashboard.utils && typeof Dashboard.utils.updateUrlParams === 'function') {
        Dashboard.utils.updateUrlParams(params);
      } else {
        const url = new URL(window.location.href);
        url.search = new URLSearchParams(params).toString();
        window.history.pushState({}, '', url);
      }
      
      // 테이블 행 필터링
      this.filterTableRows(status, department, warehouse);
    },
    
    /**
     * 테이블 행을 필터링합니다.
     * @param {string} status - 상태 필터
     * @param {string} department - 부서 필터
     * @param {string} warehouse - 창고 필터
     */
    filterTableRows: function(status, department, warehouse) {
      const tableRows = document.querySelectorAll('#orderTable tbody tr');
      
      let visibleCount = 0;
      
      tableRows.forEach(row => {
        // 'no-data-row' 클래스가 있는 행은 건너뜁니다.
        if (row.classList.contains('no-data-row')) {
          return;
        }
        
        const rowStatus = row.querySelector('.column-status .status-badge')?.dataset.status || row.querySelector('.column-status .status-badge')?.textContent.trim();
        const rowDepartment = row.querySelector('.column-department')?.textContent.trim();
        const rowWarehouse = row.querySelector('.column-warehouse')?.textContent.trim();
        
        // 필터 조건에 따라 행 표시/숨김
        const statusMatch = !status || rowStatus === status || rowStatus?.includes(status);
        const departmentMatch = !department || rowDepartment === department;
        const warehouseMatch = !warehouse || rowWarehouse === warehouse;
        
        const shouldShow = statusMatch && departmentMatch && warehouseMatch;
        
        // 행 표시/숨김 처리
        row.style.display = shouldShow ? '' : 'none';
        
        // 보이는 행 수 카운트
        if (shouldShow) {
          visibleCount++;
        }
      });
      
      // 결과가 없는 경우 처리
      const noDataRow = document.querySelector('#orderTable .no-data-row');
      if (noDataRow) {
        if (visibleCount === 0) {
          // 결과가 없으면 '데이터 없음' 행 표시
          noDataRow.style.display = '';
          noDataRow.querySelector('.no-data-cell').textContent = '검색 결과가 없습니다';
        } else {
          // 결과가 있으면 '데이터 없음' 행 숨김
          noDataRow.style.display = 'none';
        }
      }
      
      return visibleCount;
    },
    
    /**
     * 오늘 날짜를 YYYY-MM-DD 형식으로 반환합니다.
     * @returns {string} - 오늘 날짜 문자열
     */
    getTodayDate: function() {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    
    /**
     * URL 쿼리 매개변수를 가져옵니다.
     * @param {string} paramName - 매개변수 이름
     * @returns {string} - 매개변수 값 또는 빈 문자열
     */
    getUrlParam: function(paramName) {
      const url = new URL(window.location.href);
      return url.searchParams.get(paramName) || '';
    },
    
    /**
     * 필터를 초기화합니다.
     */
    resetFilters: function() {
      // 필터 요소 초기화
      const statusFilter = document.getElementById('statusFilter');
      const departmentFilter = document.getElementById('departmentFilter');
      const warehouseFilter = document.getElementById('warehouseFilter');
      
      if (statusFilter) statusFilter.value = '';
      if (departmentFilter) departmentFilter.value = '';
      if (warehouseFilter) warehouseFilter.value = '';
      
      // 날짜 필터 초기화
      const startDateInput = document.getElementById('startDate');
      const endDateInput = document.getElementById('endDate');
      
      if (startDateInput) startDateInput.value = this.getTodayDate();
      if (endDateInput) endDateInput.value = this.getTodayDate();
      
      // 주문번호 검색 초기화
      const orderNoSearch = document.getElementById('orderNoSearch');
      if (orderNoSearch) orderNoSearch.value = '';
      
      // 페이지 새로고침
      window.location.href = window.location.pathname;
    },
    
    /**
     * 데이터를 새로고침합니다.
     */
    refreshData: function() {
      // 페이지 새로고침 (현재 URL 유지)
      window.location.reload();
    }
  };
  
  // Dashboard 객체에 필터 모듈 등록
  Dashboard.registerModule('filter', filter);
})();

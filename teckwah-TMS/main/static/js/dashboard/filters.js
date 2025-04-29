/**
 * 대시보드 필터 모듈
 * 테이블 필터링 및 검색을 담당합니다.
 */

// 네임스페이스에 모듈 추가
Dashboard.filters = {
  /**
   * 초기화
   */
  init: function() {
    console.log('[Dashboard.filters] 초기화');
    
    // 상태 필터
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        Dashboard.state.filters.status = statusFilter.value;
        Dashboard.applyFilters();
      });
    }
    
    // 부서 필터
    const departmentFilter = document.getElementById('departmentFilter');
    if (departmentFilter) {
      departmentFilter.addEventListener('change', () => {
        Dashboard.state.filters.department = departmentFilter.value;
        Dashboard.applyFilters();
      });
    }
    
    // 창고 필터
    const warehouseFilter = document.getElementById('warehouseFilter');
    if (warehouseFilter) {
      warehouseFilter.addEventListener('change', () => {
        Dashboard.state.filters.warehouse = warehouseFilter.value;
        Dashboard.applyFilters();
      });
    }
    
    // 초기화 버튼
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        this.reset();
      });
    }
    
    // 주문번호 검색
    const orderSearchBtn = document.getElementById('orderSearchBtn');
    const orderNoSearch = document.getElementById('orderNoSearch');
    
    if (orderSearchBtn && orderNoSearch) {
      orderSearchBtn.addEventListener('click', () => {
        Dashboard.state.search.orderNo = orderNoSearch.value.trim();
        Dashboard.loadOrders();
      });
      
      // 엔터 키 이벤트
      orderNoSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          Dashboard.state.search.orderNo = orderNoSearch.value.trim();
          Dashboard.loadOrders();
        }
      });
    }
    
    // URL에서 필터 파라미터 가져오기
    this.getFiltersFromUrl();
  },
  
  /**
   * 필터 초기화
   */
  reset: function() {
    // 필터 요소 초기화
    const statusFilter = document.getElementById('statusFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    const warehouseFilter = document.getElementById('warehouseFilter');
    
    if (statusFilter) statusFilter.value = '';
    if (departmentFilter) departmentFilter.value = '';
    if (warehouseFilter) warehouseFilter.value = '';
    
    // 상태 업데이트
    Dashboard.state.filters = {
      status: '',
      department: '',
      warehouse: ''
    };
    
    // 필터 재적용
    Dashboard.applyFilters();
    
    // 알림
    Notify.info('필터가 초기화되었습니다.');
  },
  
  /**
   * URL에서 필터 파라미터 가져오기
   */
  getFiltersFromUrl: function() {
    const status = Utils.getUrlParam('status');
    const department = Utils.getUrlParam('department');
    const warehouse = Utils.getUrlParam('warehouse');
    const orderNo = Utils.getUrlParam('order_no');
    
    // 필터 설정
    const statusFilter = document.getElementById('statusFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    const warehouseFilter = document.getElementById('warehouseFilter');
    const orderNoSearch = document.getElementById('orderNoSearch');
    
    if (status && statusFilter) {
      statusFilter.value = status;
      Dashboard.state.filters.status = status;
    }
    
    if (department && departmentFilter) {
      departmentFilter.value = department;
      Dashboard.state.filters.department = department;
    }
    
    if (warehouse && warehouseFilter) {
      warehouseFilter.value = warehouse;
      Dashboard.state.filters.warehouse = warehouse;
    }
    
    if (orderNo && orderNoSearch) {
      orderNoSearch.value = orderNo;
      Dashboard.state.search.orderNo = orderNo;
    }
  },
  
  /**
   * 필터 상태를 URL에 반영
   */
  updateUrlWithFilters: function() {
    const url = new URL(window.location.href);
    
    // 필터 상태 URL 파라미터에 저장
    if (Dashboard.state.filters.status) {
      url.searchParams.set('status', Dashboard.state.filters.status);
    } else {
      url.searchParams.delete('status');
    }
    
    if (Dashboard.state.filters.department) {
      url.searchParams.set('department', Dashboard.state.filters.department);
    } else {
      url.searchParams.delete('department');
    }
    
    if (Dashboard.state.filters.warehouse) {
      url.searchParams.set('warehouse', Dashboard.state.filters.warehouse);
    } else {
      url.searchParams.delete('warehouse');
    }
    
    if (Dashboard.state.search.orderNo) {
      url.searchParams.set('order_no', Dashboard.state.search.orderNo);
    } else {
      url.searchParams.delete('order_no');
    }
    
    // 날짜 상태 URL 파라미터에 저장
    if (Dashboard.state.startDate) {
      url.searchParams.set('start_date', Dashboard.state.startDate);
    } else {
      url.searchParams.delete('start_date');
    }
    
    if (Dashboard.state.endDate) {
      url.searchParams.set('end_date', Dashboard.state.endDate);
    } else {
      url.searchParams.delete('end_date');
    }
    
    // URL 업데이트 (페이지 새로고침 없이)
    window.history.replaceState({}, '', url);
  }
};

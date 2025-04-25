/**
 * 대시보드 초기화 모듈
 * 대시보드 페이지 초기화 및 데이터 처리
 */
window.DashboardInit = {
  /**
   * 상태, 부서, 창고 데이터
   */
  configData: {
    types: [], // 주문 유형
    statuses: [], // 주문 상태
    departments: [], // 부서 목록
    warehouses: [] // 창고 목록
  },
  
  /**
   * 대시보드를 초기화합니다.
   */
  init: function() {
    // 전역 설정 데이터 초기화
    this.initConfigData();
    
    // 모듈 초기화 (의존성 고려하여 순서 지정)
    this.initModules();
    
    // 이벤트 핸들러 설정
    this.setupEventListeners();
    
    // CSR 페이지네이션 초기화
    this.initPagination();
    
    console.log('Dashboard initialized');
  },
  
  /**
   * 설정 데이터를 초기화합니다.
   */
  initConfigData: function() {
    // 주문 유형 데이터
    window.typeOptions = Array.from(document.querySelectorAll('#createType option:not(:first-child)'))
      .map(option => ({
        value: option.value,
        label: option.textContent
      }));
    
    // 주문 상태 데이터
    window.statusOptions = Array.from(document.querySelectorAll('#statusFilter option:not(:first-child)'))
      .map(option => ({
        value: option.value,
        label: option.textContent
      }));
    
    // 부서 데이터
    window.departmentOptions = Array.from(document.querySelectorAll('#departmentFilter option:not(:first-child)'))
      .map(option => ({
        value: option.value,
        label: option.textContent
      }));
    
    // 창고 데이터
    window.warehouseOptions = Array.from(document.querySelectorAll('#warehouseFilter option:not(:first-child)'))
      .map(option => ({
        value: option.value,
        label: option.textContent
      }));
    
    // 설정 데이터 저장
    this.configData = {
      types: window.typeOptions || [],
      statuses: window.statusOptions || [],
      departments: window.departmentOptions || [],
      warehouses: window.warehouseOptions || []
    };
  },
  
  /**
   * 모듈을 초기화합니다.
   */
  initModules: function() {
    // 테이블 모듈 초기화
    if (window.DashboardTable) {
      DashboardTable.init();
    }
    
    // 필터 모듈 초기화
    if (window.DashboardFilter) {
      DashboardFilter.init();
    }
    
    // 모달 모듈 초기화
    if (window.DashboardModals) {
      DashboardModals.init();
    }
    
    // 액션 모듈 초기화
    if (window.DashboardActions) {
      DashboardActions.init();
    }
  },
  
  /**
   * 이벤트 리스너를 설정합니다.
   */
  setupEventListeners: function() {
    // 로딩이 완료된 후 추가 이벤트 설정
    window.addEventListener('load', () => {
      // 로딩 인디케이터 숨김
      Utils.toggleLoading(false);
    });
    
    // 우편번호 입력 필드 이벤트 (4자리 → 5자리 변환)
    document.querySelectorAll('input[name="postalCode"]').forEach(input => {
      input.addEventListener('blur', () => {
        const postalCode = input.value.trim();
        if (postalCode.length === 4 && /^\d{4}$/.test(postalCode)) {
          input.value = Utils.formatPostalCode(postalCode);
        }
      });
    });
    
    // 주문 생성 모달의 ETA 기본값 설정
    const createETAInput = document.getElementById('createETA');
    if (createETAInput && !createETAInput.value) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      
      const etaValue = tomorrow.toISOString().slice(0, 16);
      createETAInput.value = etaValue;
    }
  },
  
  /**
   * CSR 페이지네이션을 초기화합니다.
   */
  initPagination: function() {
    if (!window.Pagination) return;
    
    // 페이지네이션 정보 가져오기
    const paginationInfo = document.querySelector('.pagination-info');
    if (!paginationInfo) return;
    
    const totalItems = parseInt(paginationInfo.dataset.total || '0');
    const totalPages = parseInt(paginationInfo.dataset.totalPages || '1');
    
    // URL에서 현재 페이지 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = parseInt(urlParams.get('page') || '1');
    
    // 저장된 페이지 크기 가져오기
    const savedPageSize = Utils.getFromStorage('pageSize');
    const pageSize = savedPageSize ? parseInt(savedPageSize) : 10;
    
    // 페이지 선택 필드 초기화
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
      pageSizeSelect.value = pageSize.toString();
    }
    
    // 페이지네이션 초기화
    Pagination.init({
      currentPage,
      pageSize,
      totalItems,
      onPageChange: (page, pageSize) => {
        this.handlePageChange(page, pageSize);
      },
      onPageSizeChange: (pageSize) => {
        this.handlePageSizeChange(pageSize);
      }
    });
  },
  
  /**
   * 페이지 변경을 처리합니다.
   * @param {number} page - 페이지 번호
   * @param {number} pageSize - 페이지 크기
   */
  handlePageChange: function(page, pageSize) {
    // 필터가 적용된 경우 클라이언트 측 페이지네이션
    if (DashboardFilter && (DashboardFilter.state.status || DashboardFilter.state.department || DashboardFilter.state.warehouse)) {
      DashboardFilter.updateTableRows();
    } else {
      // URL 매개변수 업데이트 (페이지 새로고침 없음)
      Utils.updateUrlParams({ page });
    }
  },
  
  /**
   * 페이지 크기 변경을 처리합니다.
   * @param {number} pageSize - 페이지 크기
   */
  handlePageSizeChange: function(pageSize) {
    // 필터가 적용된 경우 클라이언트 측 페이지네이션
    if (DashboardFilter && (DashboardFilter.state.status || DashboardFilter.state.department || DashboardFilter.state.warehouse)) {
      DashboardFilter.updateTableRows();
    }
  }
};

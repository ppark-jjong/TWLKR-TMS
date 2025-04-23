/**
 * 대시보드 필터 관련 기능
 */

/**
 * 날짜 선택기 초기화
 */
function initializeDatePickers() {
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  
  if (startDateInput && endDateInput) {
    // URL 파라미터에서 날짜 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const startDate = urlParams.get('startDate');
    const endDate = urlParams.get('endDate');
    
    // 날짜 설정
    if (startDate) {
      startDateInput.value = startDate.split(' ')[0]; // YYYY-MM-DD 부분만 추출
    } else {
      startDateInput.value = Utils.getTodayDate();
    }
    
    if (endDate) {
      endDateInput.value = endDate.split(' ')[0]; // YYYY-MM-DD 부분만 추출
    } else {
      endDateInput.value = Utils.getTodayDate();
    }
    
    // 종료일은 시작일보다 이전일 수 없도록 설정
    startDateInput.addEventListener('change', function() {
      if (endDateInput.value < startDateInput.value) {
        endDateInput.value = startDateInput.value;
      }
    });
  }
}

/**
 * 필터 이벤트 등록
 */
function registerFilterEvents() {
  try {
    console.log('필터 이벤트 등록 중...');
    
    // 오늘 버튼 클릭
    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
      // 기존 이벤트 리스너 제거 (중복 방지)
      todayBtn.removeEventListener('click', handleTodayBtnClick);
      
      // 새 이벤트 리스너 추가
      todayBtn.addEventListener('click', handleTodayBtnClick);
      
      function handleTodayBtnClick(e) {
        e.stopPropagation(); // 이벤트 전파 중지
        console.log('오늘 버튼 클릭됨');
        const today = Utils.getTodayDate();
        
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) startDateInput.value = today;
        if (endDateInput) endDateInput.value = today;
        
        // 오늘 버튼 클릭 시 바로 조회 실행
        submitFilterForm();
      }
      
      console.log('오늘 버튼 이벤트 등록 완료');
    } else {
      console.error('오늘 버튼 요소를 찾을 수 없음');
    }
    
    // 조회 버튼 클릭
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
      // 기존 이벤트 리스너 제거 (중복 방지)
      searchBtn.removeEventListener('click', handleSearchBtnClick);
      
      // 새 이벤트 리스너 추가
      searchBtn.addEventListener('click', handleSearchBtnClick);
      
      function handleSearchBtnClick(e) {
        e.stopPropagation(); // 이벤트 전파 중지
        console.log('조회 버튼 클릭됨');
        submitFilterForm();
      }
      
      console.log('조회 버튼 이벤트 등록 완료');
    } else {
      console.error('조회 버튼 요소를 찾을 수 없음');
    }
  
  // 주문번호 검색 버튼 클릭
  const orderSearchBtn = document.getElementById('orderSearchBtn');
  if (orderSearchBtn) {
    // 기존 이벤트 리스너 제거 (중복 방지)
    orderSearchBtn.removeEventListener('click', handleOrderSearchBtnClick);
    
    // 새 이벤트 리스너 추가
    orderSearchBtn.addEventListener('click', handleOrderSearchBtnClick);
    
    function handleOrderSearchBtnClick(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      console.log('주문번호 검색 버튼 클릭됨');
      submitFilterForm();
    }
    
    // Enter 키 이벤트
    const orderNoSearch = document.getElementById('orderNoSearch');
    if (orderNoSearch) {
      // 기존 이벤트 리스너 제거 (중복 방지)
      orderNoSearch.removeEventListener('keypress', handleOrderNoSearchKeypress);
      
      // 새 이벤트 리스너 추가
      orderNoSearch.addEventListener('keypress', handleOrderNoSearchKeypress);
      
      function handleOrderNoSearchKeypress(event) {
        if (event.key === 'Enter') {
          console.log('주문번호 검색 Enter 키 입력됨');
          event.preventDefault();
          submitFilterForm();
        }
      }
      
      console.log('주문번호 검색 이벤트 등록 완료');
    } else {
      console.error('주문번호 검색 입력 요소를 찾을 수 없음');
    }
  } else {
    console.error('주문번호 검색 버튼 요소를 찾을 수 없음');
  }
  
  // 초기화 버튼 클릭
  const resetFilterBtn = document.getElementById('resetFilterBtn');
  if (resetFilterBtn) {
    // 기존 이벤트 리스너 제거 (중복 방지)
    resetFilterBtn.removeEventListener('click', handleResetFilterBtnClick);
    
    // 새 이벤트 리스너 추가
    resetFilterBtn.addEventListener('click', handleResetFilterBtnClick);
    
    function handleResetFilterBtnClick(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      console.log('초기화 버튼 클릭됨');
      
      // 상태, 부서, 창고 필터 초기화
      const statusFilter = document.getElementById('statusFilter');
      const departmentFilter = document.getElementById('departmentFilter');
      const warehouseFilter = document.getElementById('warehouseFilter');
      const orderNoSearch = document.getElementById('orderNoSearch');
      
      if (statusFilter) statusFilter.value = '';
      if (departmentFilter) departmentFilter.value = '';
      if (warehouseFilter) warehouseFilter.value = '';
      if (orderNoSearch) orderNoSearch.value = '';
      
      // 폼 제출
      submitFilterForm();
    }
    
    console.log('초기화 버튼 이벤트 등록 완료');
  } else {
    console.error('초기화 버튼 요소를 찾을 수 없음');
  }
  
  // 새로고침 버튼 클릭
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    // 기존 이벤트 리스너 제거 (중복 방지)
    refreshBtn.removeEventListener('click', handleRefreshBtnClick);
    
    // 새 이벤트 리스너 추가
    refreshBtn.addEventListener('click', handleRefreshBtnClick);
    
    function handleRefreshBtnClick(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      console.log('새로고침 버튼 클릭됨');
      window.location.reload();
    }
    
    console.log('새로고침 버튼 이벤트 등록 완료');
  } else {
    console.error('새로고침 버튼 요소를 찾을 수 없음');
  }
  
  // 페이지 크기 변경
  const pageSizeSelect = document.getElementById('pageSizeSelect');
  if (pageSizeSelect) {
    // 기존 이벤트 리스너 제거 (중복 방지)
    pageSizeSelect.removeEventListener('change', handlePageSizeChange);
    
    // 새 이벤트 리스너 추가
    pageSizeSelect.addEventListener('change', handlePageSizeChange);
    
    function handlePageSizeChange() {
      console.log('페이지 크기 변경됨:', this.value);
      const url = new URL(window.location.href);
      url.searchParams.set('limit', this.value);
      url.searchParams.set('page', '1'); // 페이지 번호 리셋
      window.location.href = url.toString();
    }
    
    // 현재 URL에서 페이지 크기 파라미터가 있으면 선택
    const urlParams = new URLSearchParams(window.location.search);
    const currentPageSize = urlParams.get('limit');
    if (currentPageSize) {
      pageSizeSelect.value = currentPageSize;
    }
    
    console.log('페이지 크기 선택 이벤트 등록 완료');
  } else {
    console.error('페이지 크기 선택 요소를 찾을 수 없음');
  }
  
  console.log('모든 필터 이벤트 등록 완료');
  } catch (error) {
    console.error('필터 이벤트 등록 중 오류 발생:', error);
  }
}

/**
 * 필터 폼 제출
 */
function submitFilterForm() {
  console.log('필터 폼 제출 시작');
  
  try {
    // 날짜 필드 참조
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    // 날짜가 비어있으면 오늘 날짜로 설정
    let startDate = startDateInput ? startDateInput.value : '';
    let endDate = endDateInput ? endDateInput.value : '';
    
    if (!startDate) {
      startDate = Utils.getTodayDate();
      if (startDateInput) startDateInput.value = startDate;
      console.log('시작일이 비어있어 오늘 날짜로 설정:', startDate);
    }
    
    if (!endDate) {
      endDate = Utils.getTodayDate();
      if (endDateInput) endDateInput.value = endDate;
      console.log('종료일이 비어있어 오늘 날짜로 설정:', endDate);
    }
    
    // 필터 필드 참조
    const statusFilter = document.getElementById('statusFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    const warehouseFilter = document.getElementById('warehouseFilter');
    const orderNoSearch = document.getElementById('orderNoSearch');
    
    // 필터 값 가져오기
    const status = statusFilter ? statusFilter.value : '';
    const department = departmentFilter ? departmentFilter.value : '';
    const warehouse = warehouseFilter ? warehouseFilter.value : '';
    const orderNo = orderNoSearch ? orderNoSearch.value : '';
    
    // URL 생성
    const url = new URL(window.location.href);
    
    console.log('폼 데이터:', {
      startDate,
      endDate,
      status,
      department,
      warehouse,
      orderNo
    });
    
    // 날짜 설정 (시간 포함)
    url.searchParams.set('startDate', `${startDate} 00:00:00`);
    url.searchParams.set('endDate', `${endDate} 23:59:59`);
    
    // 필터 설정
    if (status) {
      url.searchParams.set('status', status);
    } else {
      url.searchParams.delete('status');
    }
    
    if (department) {
      url.searchParams.set('department', department);
    } else {
      url.searchParams.delete('department');
    }
    
    if (warehouse) {
      url.searchParams.set('warehouse', warehouse);
    } else {
      url.searchParams.delete('warehouse');
    }
    
    if (orderNo) {
      url.searchParams.set('orderNo', orderNo);
    } else {
      url.searchParams.delete('orderNo');
    }
    
    // 페이지 번호 리셋
    url.searchParams.set('page', '1');
    
    // 현재 페이지 크기 유지
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const currentPageSize = pageSizeSelect ? pageSizeSelect.value : null;
    
    if (currentPageSize) {
      url.searchParams.set('limit', currentPageSize);
    }
    
    console.log('이동할 URL:', url.toString());
    
    // URL 이동
    window.location.href = url.toString();
  } catch (error) {
    console.error('필터 폼 제출 중 오류 발생:', error);
    alert('조회 중 오류가 발생했습니다: ' + error.message);
  }
}

// 전역 namespace에 등록
window.DashboardFilter = {
  initializeDatePickers,
  registerFilterEvents,
  submitFilterForm
};

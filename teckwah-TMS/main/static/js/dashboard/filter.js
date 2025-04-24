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
    
    // 클라이언트 사이드 필터링 체크
    // orderNo가 입력된 경우 서버 API 호출 (DB 검색)
    // 그외의 필터링은 클라이언트 사이드에서 처리
    if (orderNo) {
      // 서버 API 검색 (주문번호 검색은 항상 서버로 요청)
      applyServerSideFilters(startDate, endDate, status, department, warehouse, orderNo);
    } else if (hasDateChanged(startDate, endDate)) {
      // 날짜 필터가 변경된 경우에만 서버 요청 (날짜는 항상 서버쪽 변경)
      applyServerSideFilters(startDate, endDate, status, department, warehouse, orderNo);
    } else {
      // 날짜 필터가 변경되지 않고, 주문번호 검색이 아닌 경우
      // 클라이언트 사이드 필터링 적용
      applyClientSideFilters(status, department, warehouse);
    }
  } catch (error) {
    console.error('필터 폼 제출 중 오류 발생:', error);
    alert('조회 중 오류가 발생했습니다: ' + error.message);
  }
}

/**
 * 날짜 필터 변경 여부 체크
 * @param {string} startDate - 시작 날짜
 * @param {string} endDate - 종료 날짜
 * @returns {boolean} 날짜 변경 여부
 */
function hasDateChanged(startDate, endDate) {
  const urlParams = new URLSearchParams(window.location.search);
  const currentStartDate = urlParams.get('startDate')?.split(' ')[0] || Utils.getTodayDate();
  const currentEndDate = urlParams.get('endDate')?.split(' ')[0] || Utils.getTodayDate();
  
  return startDate !== currentStartDate || endDate !== currentEndDate;
}

/**
 * 서버 사이드 필터링 (URL 파라미터 변경으로 API 호출)
 */
function applyServerSideFilters(startDate, endDate, status, department, warehouse, orderNo) {
  // URL 생성
  const url = new URL(window.location.href);
  
  console.log('서버 필터링 적용:', {
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
  
  // URL 이동 (서버 요청)
  window.location.href = url.toString();
}

/**
 * 클라이언트 사이드 필터링 (이미 로드된 테이블 데이터 필터링)
 */
function applyClientSideFilters(status, department, warehouse) {
  console.log('클라이언트 필터링 적용:', {
    status,
    department,
    warehouse
  });
  
  try {
    // 테이블 참조
    const table = document.getElementById('orderTable');
    const rows = table.querySelectorAll('tbody tr');
    
    // 필터링 적용 카운터
    let visibleCount = 0;
    
    // 각 행에 대한 필터링
    rows.forEach(row => {
      // 'no-data-row' 클래스가 있는 행은 건너뜀 (데이터 없음 행)
      if (row.classList.contains('no-data-row')) {
        row.style.display = 'none';
        return;
      }
      
      // 행에서 필터 조건 추출
      const rowStatus = row.querySelector('.column-status')?.getAttribute('data-status') || '';
      const rowDept = row.querySelector('.column-department')?.textContent.trim() || '';
      const rowWarehouse = row.querySelector('.column-warehouse')?.textContent.trim() || '';
      
      // 조건에 맞지 않으면 숨김 처리
      const statusMatch = !status || rowStatus === status;
      const deptMatch = !department || rowDept === department;
      const warehouseMatch = !warehouse || rowWarehouse === warehouse;
      
      // 모든 조건이 일치할 때만 표시
      const shouldShow = statusMatch && deptMatch && warehouseMatch;
      
      // 행 표시/숨김 설정
      row.style.display = shouldShow ? '' : 'none';
      
      // 표시되는 행 카운트
      if (shouldShow) {
        visibleCount++;
      }
    });
    
    // 결과가 없을 경우 "데이터 없음" 행 표시
    const noDataRow = document.querySelector('.no-data-row');
    
    if (visibleCount === 0 && noDataRow) {
      noDataRow.style.display = '';
    } else if (noDataRow) {
      noDataRow.style.display = 'none';
    }
    
    // 필터 적용 결과 URL 파라미터 변경 (새로고침 없음)
    // URL 히스토리 변경으로 필터 상태를 URL에 반영
    const url = new URL(window.location.href);
    
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
    
    // 현재 URL 업데이트 (페이지 새로고침 없이)
    window.history.replaceState({}, '', url.toString());
    
    // 필터링 결과 업데이트
    const paginationInfo = document.querySelector('.pagination-info');
    if (paginationInfo) {
      const totalCount = visibleCount;
      paginationInfo.textContent = `총 ${totalCount}개 항목 표시 중`;
    }
    
    console.log(`클라이언트 필터링 완료: ${visibleCount}개 행 표시`);
  } catch (error) {
    console.error('클라이언트 필터링 오류:', error);
    // 오류 발생 시 기본 서버 사이드 필터링으로 폴백
    applyServerSideFilters(startDate, endDate, status, department, warehouse, '');
  }
}

// 전역 namespace에 등록
window.DashboardFilter = {
  initializeDatePickers,
  registerFilterEvents,
  submitFilterForm
};

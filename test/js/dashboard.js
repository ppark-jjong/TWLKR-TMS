/**
 * 대시보드 페이지 스크립트
 * Ant Design 스타일로 개선된 버전
 */

// 현재 필터 상태
const dashboardFilters = {
  status: '',
  department: '',
  warehouse: '',
  type: '',
  keyword: '',
  startDate: '',
  endDate: ''
};

// 선택된 주문 ID 목록
let selectedOrders = [];

// 현재 상태 변경 정보
let currentStatusChange = {
  status: null,
  orderIds: []
};

// 페이지네이션 상태
const paginationState = {
  currentPage: 1,
  pageSize: 10,
  totalItems: 0
};

// 대시보드 페이지 초기화
function initDashboard() {
  console.log('대시보드 페이지 초기화');
  
  // 페이지 타이틀 설정
  setPageTitle('대시보드');
  
  // 현재 시간 표시
  setupCurrentTime();
  
  // 필터 이벤트 설정
  setupFilters();
  
  // 테이블 행 클릭 이벤트 설정
  setupTableRowEvents();
  
  // 체크박스 이벤트 설정
  setupCheckboxEvents();
  
  // 액션 버튼 이벤트 설정
  setupActionButtons();
  
  // 모바일 메뉴 이벤트 설정
  setupMobileMenu();
  
  // 상태 변경 드롭다운 이벤트 설정
  setupStatusDropdown();
  
  // 페이지네이션 초기화
  initPagination();
  
  // 데이터 로드
  loadAppData().then(() => {
    // 초기 데이터 렌더링
    renderDashboardTable();
    updateSummaryCards();
    
    // 데이터 변경 시 테이블 갱신 이벤트 설정
    document.addEventListener('dashboard_updated', () => {
      renderDashboardTable();
      updateSummaryCards();
    });
  });
  
  // 초기 날짜 필터 설정 - 오늘 기준 ±7일
  setDefaultDateFilter();
}

// 현재 시간 표시 설정
function setupCurrentTime() {
  const currentTimeElement = document.getElementById('currentTime');
  
  if (currentTimeElement) {
    const updateTime = () => {
      const now = new Date();
      const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      };
      currentTimeElement.textContent = now.toLocaleString('ko-KR', options);
    };
    
    // 초기 시간 설정
    updateTime();
    
    // 매 분마다 업데이트
    setInterval(updateTime, 60000);
  }
}

// 필터 이벤트 설정
function setupFilters() {
  // 상태 필터
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      dashboardFilters.status = statusFilter.value;
      renderDashboardTable();
      updateSummaryCards();
    });
  }
  
  // 부서 필터
  const deptFilter = document.getElementById('departmentFilter');
  if (deptFilter) {
    deptFilter.addEventListener('change', () => {
      dashboardFilters.department = deptFilter.value;
      renderDashboardTable();
      updateSummaryCards();
    });
  }
  
  // 창고 필터
  const warehouseFilter = document.getElementById('warehouseFilter');
  if (warehouseFilter) {
    warehouseFilter.addEventListener('change', () => {
      dashboardFilters.warehouse = warehouseFilter.value;
      renderDashboardTable();
      updateSummaryCards();
    });
  }
  
  // 유형 필터
  const typeFilter = document.getElementById('typeFilter');
  if (typeFilter) {
    typeFilter.addEventListener('change', () => {
      dashboardFilters.type = typeFilter.value;
      renderDashboardTable();
      updateSummaryCards();
    });
  }
  
  // 키워드 검색
  const searchBtn = document.getElementById('searchBtn');
  const keywordInput = document.getElementById('keywordInput');
  
  if (searchBtn && keywordInput) {
    searchBtn.addEventListener('click', () => {
      dashboardFilters.keyword = keywordInput.value.trim();
      renderDashboardTable();
      updateSummaryCards();
    });
    
    // 엔터키 검색
    keywordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        dashboardFilters.keyword = keywordInput.value.trim();
        renderDashboardTable();
        updateSummaryCards();
      }
    });
  }
  
  // 날짜 필터
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const dateFilterBtn = document.getElementById('dateFilterBtn');
  
  if (startDateInput && endDateInput && dateFilterBtn) {
    dateFilterBtn.addEventListener('click', () => {
      dashboardFilters.startDate = startDateInput.value;
      dashboardFilters.endDate = endDateInput.value;
      renderDashboardTable();
      updateSummaryCards();
    });
  }
  
  // Today 버튼
  const todayBtn = document.getElementById('todayBtn');
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      const today = new Date();
      const todayStr = formatDateForInput(today);
      
      if (startDateInput) startDateInput.value = todayStr;
      if (endDateInput) endDateInput.value = todayStr;
      
      dashboardFilters.startDate = todayStr;
      dashboardFilters.endDate = todayStr;
      
      renderDashboardTable();
      updateSummaryCards();
    });
  }
  
  // 필터 초기화 버튼
  const resetFilterBtn = document.getElementById('resetFilterBtn');
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', resetFilters);
  }
}

// input 태그용 날짜 포맷 (YYYY-MM-DD)
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 테이블 행 클릭 이벤트 설정
function setupTableRowEvents() {
  // 이벤트 위임 사용
  document.addEventListener('click', (e) => {
    // 체크박스 클릭은 무시 (체크박스 전용 이벤트 핸들러가 있음)
    if (e.target.closest('.ant-checkbox-wrapper')) {
      return;
    }
    
    // 복사 버튼 클릭은 무시
    if (e.target.closest('.copy-btn')) {
      return;
    }
    
    const target = e.target.closest('#dashboardTable tbody tr');
    if (target) {
      const orderId = target.getAttribute('data-id');
      if (orderId) {
        showOrderDetail(orderId);
      }
    }
  });
  
  // 주문번호 복사 기능
  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
      const orderId = copyBtn.getAttribute('data-id');
      if (orderId) {
        copyToClipboard(orderId);
        showMessage(`주문번호가 클립보드에 복사되었습니다: ${orderId}`, 'success');
        e.stopPropagation(); // 상위 요소 클릭 이벤트 방지
      }
    }
  });
}

// 텍스트를 클립보드에 복사
function copyToClipboard(text) {
  // 임시 textarea 생성
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed'; // 화면 밖으로
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    // 복사 시도
    document.execCommand('copy');
  } catch (err) {
    console.error('클립보드 복사 실패:', err);
  }
  
  // 임시 요소 제거
  document.body.removeChild(textarea);
}

// 체크박스 이벤트 설정
function setupCheckboxEvents() {
  // 전체 선택 체크박스
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      
      // 모든 개별 체크박스에 상태 적용
      const checkboxes = document.querySelectorAll('#dashboardTable tbody .row-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        
        // 부모 행의 ID 가져오기
        const row = checkbox.closest('tr');
        const orderId = row.getAttribute('data-id');
        
        if (isChecked) {
          // 선택 목록에 추가
          if (!selectedOrders.includes(orderId)) {
            selectedOrders.push(orderId);
          }
          row.classList.add('selected');
        } else {
          // 선택 목록에서 제거
          selectedOrders = selectedOrders.filter(id => id !== orderId);
          row.classList.remove('selected');
        }
      });
      
      // 액션 버튼 상태 업데이트
      updateActionButtonsState();
    });
  }
  
  // 개별 체크박스 이벤트 (이벤트 위임)
  document.addEventListener('change', (e) => {
    const checkbox = e.target.closest('.row-checkbox');
    if (checkbox) {
      const row = checkbox.closest('tr');
      const orderId = row.getAttribute('data-id');
      
      if (checkbox.checked) {
        // 선택 목록에 추가
        if (!selectedOrders.includes(orderId)) {
          selectedOrders.push(orderId);
        }
        row.classList.add('selected');
      } else {
        // 선택 목록에서 제거
        selectedOrders = selectedOrders.filter(id => id !== orderId);
        row.classList.remove('selected');
        
        // 전체 선택 체크박스 해제
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = false;
        }
      }
      
      // 액션 버튼 상태 업데이트
      updateActionButtonsState();
    }
  });
}

// 액션 버튼 이벤트 설정
function setupActionButtons() {
  // 새로고침 버튼
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      // 로딩 오버레이 표시
      document.getElementById('loadingOverlay').style.display = 'flex';
      
      // 데이터 다시 로드
      loadAppData().then(() => {
        // 테이블 갱신
        renderDashboardTable();
        updateSummaryCards();
        
        // 선택 초기화
        selectedOrders = [];
        updateActionButtonsState();
        
        // 로딩 오버레이 숨김
        document.getElementById('loadingOverlay').style.display = 'none';
        
        showMessage('데이터가 새로고침되었습니다', 'success');
      }).catch(error => {
        document.getElementById('loadingOverlay').style.display = 'none';
        showMessage('데이터 새로고침 중 오류가 발생했습니다', 'error');
      });
    });
  }
  
  // 신규 등록 버튼
  const newOrderBtn = document.getElementById('newOrderBtn');
  if (newOrderBtn) {
    newOrderBtn.addEventListener('click', () => {
      openModal('newOrderModal');
      
      // 등록 버튼 이벤트 설정
      const createOrderBtn = document.getElementById('createOrderBtn');
      if (createOrderBtn) {
        createOrderBtn.onclick = handleCreateOrder;
      }
    });
  }
  
  // 배차 처리 버튼
  const assignDriverBtn = document.getElementById('assignDriverBtn');
  if (assignDriverBtn) {
    assignDriverBtn.addEventListener('click', () => {
      if (selectedOrders.length === 0) {
        showMessage('배차 처리할 주문을 선택해주세요', 'warning');
        return;
      }
      
      // 배차 처리 모달 열기
      openModal('assignDriverModal');
      
      // 저장 버튼 이벤트 설정
      const saveDriverBtn = document.getElementById('saveDriverBtn');
      if (saveDriverBtn) {
        saveDriverBtn.onclick = handleAssignDriver;
      }
    });
  }
  
  // 삭제 버튼
  const deleteOrderBtn = document.getElementById('deleteOrderBtn');
  if (deleteOrderBtn) {
    deleteOrderBtn.addEventListener('click', () => {
      if (selectedOrders.length === 0) {
        showMessage('삭제할 주문을 선택해주세요', 'warning');
        return;
      }
      
      // 삭제 확인 메시지 설정
      const deleteConfirmMessage = document.getElementById('deleteConfirmMessage');
      if (deleteConfirmMessage) {
        deleteConfirmMessage.textContent = `선택한 ${selectedOrders.length}개의 주문을 삭제하시겠습니까?`;
      }
      
      // 삭제 확인 모달 열기
      openModal('deleteConfirmModal');
      
      // 확인 버튼 이벤트 설정
      const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
      if (confirmDeleteBtn) {
        confirmDeleteBtn.onclick = handleDeleteOrders;
      }
    });
  }
  
  // 액션 버튼 초기 상태 설정
  updateActionButtonsState();
}

// 액션 버튼 상태 업데이트
function updateActionButtonsState() {
  // 상태 변경 버튼
  const statusChangeBtn = document.getElementById('statusChangeBtn');
  if (statusChangeBtn) {
    statusChangeBtn.disabled = selectedOrders.length === 0;
    statusChangeBtn.classList.toggle('ant-btn-disabled', selectedOrders.length === 0);
  }
  
  // 배차 처리 버튼
  const assignDriverBtn = document.getElementById('assignDriverBtn');
  if (assignDriverBtn) {
    assignDriverBtn.disabled = selectedOrders.length === 0;
    assignDriverBtn.classList.toggle('ant-btn-disabled', selectedOrders.length === 0);
  }
  
  // 삭제 버튼
  const deleteOrderBtn = document.getElementById('deleteOrderBtn');
  if (deleteOrderBtn) {
    deleteOrderBtn.disabled = selectedOrders.length === 0;
    deleteOrderBtn.classList.toggle('ant-btn-disabled', selectedOrders.length === 0);
  }
}

// 모바일 메뉴 토글 이벤트 설정
function setupMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.querySelector('.sidebar');
  
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-visible');
    });
    
    // 메인 콘텐츠 클릭 시 모바일 메뉴 닫기
    document.querySelector('.main-content').addEventListener('click', () => {
      if (sidebar.classList.contains('mobile-visible')) {
        sidebar.classList.remove('mobile-visible');
      }
    });
  }
}

// 상태 변경 드롭다운 이벤트 설정
function setupStatusDropdown() {
  // 드롭다운 토글
  const statusChangeBtn = document.getElementById('statusChangeBtn');
  const statusDropdown = document.getElementById('statusDropdown');
  
  if (statusChangeBtn && statusDropdown) {
    statusChangeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 상위 요소 클릭 이벤트 방지
      statusDropdown.classList.toggle('active');
    });
    
    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', () => {
      statusDropdown.classList.remove('active');
    });
    
    // 드롭다운 내부 클릭은 버블링 방지
    statusDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // 상태 항목 클릭 이벤트
    const statusItems = document.querySelectorAll('#statusDropdown .ant-dropdown-menu-item');
    statusItems.forEach(item => {
      item.addEventListener('click', () => {
        const status = item.getAttribute('data-status');
        if (status && selectedOrders.length > 0) {
          // 상태 변경 정보 설정
          currentStatusChange = {
            status: status,
            orderIds: [...selectedOrders]
          };
          
          // 확인 메시지 설정
          const statusConfirmMessage = document.getElementById('statusConfirmMessage');
          if (statusConfirmMessage) {
            statusConfirmMessage.innerHTML = `선택한 ${selectedOrders.length}개의 주문 상태를 <span class="status-badge ${getStatusClass(status)}">${getStatusText(status)}</span>으로 변경하시겠습니까?`;
          }
          
          // 확인 모달 열기
          openModal('statusConfirmModal');
          
          // 확인 버튼 이벤트 설정
          const confirmStatusChangeBtn = document.getElementById('confirmStatusChangeBtn');
          if (confirmStatusChangeBtn) {
            confirmStatusChangeBtn.onclick = handleStatusChange;
          }
          
          // 드롭다운 닫기
          statusDropdown.classList.remove('active');
        }
      });
    });
  }
}

// 페이지네이션 초기화
function initPagination() {
  // 페이지 사이즈 변경 이벤트
  const pageSizeSelect = document.getElementById('pageSizeSelect');
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', () => {
      paginationState.pageSize = parseInt(pageSizeSelect.value, 10);
      paginationState.currentPage = 1; // 페이지 사이즈 변경 시 첫 페이지로
      renderPagination();
      renderDashboardTable();
    });
  }
}

// 페이지네이션 렌더링
function renderPagination() {
  const paginationContainer = document.getElementById('paginationContainer');
  if (!paginationContainer) return;
  
  // 전체 항목 수 표시
  const totalItemsEl = document.getElementById('totalItems');
  if (totalItemsEl) {
    totalItemsEl.textContent = paginationState.totalItems;
  }
  
  // 페이지 수 계산
  const totalPages = Math.ceil(paginationState.totalItems / paginationState.pageSize);
  
  // 컨테이너 초기화
  paginationContainer.innerHTML = '';
  
  // 페이지가 없거나 1페이지만 있는 경우
  if (totalPages <= 1) {
    return;
  }
  
  // 이전 페이지 버튼
  const prevBtn = document.createElement('li');
  prevBtn.className = `ant-pagination-prev ${paginationState.currentPage === 1 ? 'ant-pagination-disabled' : ''}`;
  prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
  if (paginationState.currentPage > 1) {
    prevBtn.addEventListener('click', () => goToPage(paginationState.currentPage - 1));
  }
  paginationContainer.appendChild(prevBtn);
  
  // 페이지 버튼 생성
  let startPage = Math.max(1, paginationState.currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  // 시작 페이지 조정
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  
  // 첫 페이지 버튼
  if (startPage > 1) {
    const firstPageBtn = document.createElement('li');
    firstPageBtn.className = 'ant-pagination-item';
    firstPageBtn.textContent = '1';
    firstPageBtn.addEventListener('click', () => goToPage(1));
    paginationContainer.appendChild(firstPageBtn);
    
    // 건너뛰기 표시
    if (startPage > 2) {
      const ellipsis = document.createElement('li');
      ellipsis.className = 'ant-pagination-ellipsis';
      ellipsis.innerHTML = '•••';
      paginationContainer.appendChild(ellipsis);
    }
  }
  
  // 페이지 버튼 추가
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('li');
    pageBtn.className = `ant-pagination-item ${i === paginationState.currentPage ? 'ant-pagination-item-active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => goToPage(i));
    paginationContainer.appendChild(pageBtn);
  }
  
  // 마지막 페이지 버튼
  if (endPage < totalPages) {
    // 건너뛰기 표시
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('li');
      ellipsis.className = 'ant-pagination-ellipsis';
      ellipsis.innerHTML = '•••';
      paginationContainer.appendChild(ellipsis);
    }
    
    const lastPageBtn = document.createElement('li');
    lastPageBtn.className = 'ant-pagination-item';
    lastPageBtn.textContent = totalPages;
    lastPageBtn.addEventListener('click', () => goToPage(totalPages));
    paginationContainer.appendChild(lastPageBtn);
  }
  
  // 다음 페이지 버튼
  const nextBtn = document.createElement('li');
  nextBtn.className = `ant-pagination-next ${paginationState.currentPage === totalPages ? 'ant-pagination-disabled' : ''}`;
  nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
  if (paginationState.currentPage < totalPages) {
    nextBtn.addEventListener('click', () => goToPage(paginationState.currentPage + 1));
  }
  paginationContainer.appendChild(nextBtn);
}

// 페이지 이동
function goToPage(page) {
  paginationState.currentPage = page;
  renderPagination();
  renderDashboardTable();
  
  // 테이블 상단으로 스크롤
  const tableContainer = document.querySelector('.table-container');
  if (tableContainer) {
    tableContainer.scrollIntoView({ behavior: 'smooth' });
  }
}

// 페이지네이션 정보 업데이트
function updatePaginationInfo(totalItems) {
  paginationState.totalItems = totalItems;
  
  // 현재 페이지가 전체 페이지 수보다 크면 조정
  const totalPages = Math.ceil(totalItems / paginationState.pageSize);
  if (paginationState.currentPage > totalPages && totalPages > 0) {
    paginationState.currentPage = totalPages;
  }
  
  renderPagination();
}

// 현재 페이지의 데이터만 가져오기
function getPaginatedData(data) {
  const startIndex = (paginationState.currentPage - 1) * paginationState.pageSize;
  const endIndex = startIndex + paginationState.pageSize;
  return data.slice(startIndex, endIndex);
}

// 필터 초기화
function resetFilters() {
  // 필터 상태 초기화
  dashboardFilters.status = '';
  dashboardFilters.department = '';
  dashboardFilters.warehouse = '';
  dashboardFilters.type = '';
  dashboardFilters.keyword = '';
  
  // 필터 UI 초기화
  const statusFilter = document.getElementById('statusFilter');
  const deptFilter = document.getElementById('departmentFilter');
  const warehouseFilter = document.getElementById('warehouseFilter');
  const typeFilter = document.getElementById('typeFilter');
  const keywordInput = document.getElementById('keywordInput');
  
  if (statusFilter) statusFilter.value = '';
  if (deptFilter) deptFilter.value = '';
  if (warehouseFilter) warehouseFilter.value = '';
  if (typeFilter) typeFilter.value = '';
  if (keywordInput) keywordInput.value = '';
  
  // 날짜 필터 기본값으로 설정
  setDefaultDateFilter();
  
  // 테이블 다시 렌더링
  renderDashboardTable();
  updateSummaryCards();
  
  showMessage('필터가 초기화되었습니다', 'info');
}

// 기본 날짜 필터 설정 (오늘 기준 ±7일)
function setDefaultDateFilter() {
  const today = new Date();
  
  // 일주일 전
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7);
  
  // 일주일 후
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 7);
  
  // YYYY-MM-DD 형식으로 변환
  const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // 필터에 날짜 설정
  dashboardFilters.startDate = formatDateInput(startDate);
  dashboardFilters.endDate = formatDateInput(endDate);
  
  // 입력 필드에 날짜 설정
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  
  if (startDateInput) startDateInput.value = dashboardFilters.startDate;
  if (endDateInput) endDateInput.value = dashboardFilters.endDate;
}

// 대시보드 테이블 렌더링
function renderDashboardTable() {
  const table = document.getElementById('dashboardTable');
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  
  // 필터링된 데이터 가져오기
  const filteredData = filterDashboardData(dashboardFilters);
  
  // 페이지네이션 정보 업데이트
  updatePaginationInfo(filteredData.length);
  
  // 현재 페이지 데이터 가져오기
  const pageData = getPaginatedData(filteredData);
  
  // 결과 카운트 업데이트
  const resultCount = document.getElementById('resultCount');
  if (resultCount) {
    resultCount.textContent = filteredData.length;
  }
  
  // 테이블 내용 초기화
  tbody.innerHTML = '';
  
  // 데이터가 없는 경우
  if (pageData.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `<td colspan="9" class="empty-message">
      ${filteredData.length === 0 ? '데이터가 없습니다' : '현재 페이지에 표시할 데이터가 없습니다'}
    </td>`;
    tbody.appendChild(emptyRow);
    return;
  }
  
  // 데이터 행 생성
  pageData.forEach(order => {
    const row = document.createElement('tr');
    
    // 행 ID 설정
    row.setAttribute('data-id', order.order_no);
    
    // 상태에 따른 행 클래스 추가
    row.classList.add(`status-${order.status?.toLowerCase() || 'pending'}`);
    
    // 선택 상태 클래스 추가
    if (selectedOrders.includes(order.order_no)) {
      row.classList.add('selected');
    }
    
    // 행 내용 설정
    row.innerHTML = `
      <td>
        <label class="ant-checkbox-wrapper">
          <input type="checkbox" class="ant-checkbox-input row-checkbox" ${selectedOrders.includes(order.order_no) ? 'checked' : ''}>
          <span class="ant-checkbox-inner"></span>
        </label>
      </td>
      <td>
        ${order.order_no || '-'}
        <i class="fas fa-copy copy-btn" data-id="${order.order_no}" title="클립보드에 복사"></i>
      </td>
      <td>${order.customer || '-'}</td>
      <td>${order.type === 'DELIVERY' ? '배송' : '회수'}</td>
      <td>${formatDate(order.eta) || '-'}</td>
      <td>${getWarehouseText(order.warehouse) || '-'}</td>
      <td>${order.department || '-'}</td>
      <td><span class="status-badge ${getStatusClass(order.status)}">${getStatusText(order.status) || '-'}</span></td>
      <td>${formatDateTime(order.update_at) || formatDateTime(order.create_time) || '-'}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  // 전체 선택 체크박스 상태 업데이트
  updateSelectAllCheckbox();
}

// 전체 선택 체크박스 상태 업데이트
function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const rowCheckboxes = document.querySelectorAll('#dashboardTable tbody .row-checkbox');
  
  if (selectAllCheckbox && rowCheckboxes.length > 0) {
    // 현재 보이는 모든 행이 선택된 경우 전체 선택 체크
    const allSelected = Array.from(rowCheckboxes).every(checkbox => checkbox.checked);
    selectAllCheckbox.checked = allSelected;
  }
}

// 요약 카드 업데이트
function updateSummaryCards() {
  // 필터링된 데이터
  const filteredData = filterDashboardData(dashboardFilters);
  
  // 상태별 카운트 계산
  const statusCounts = {
    total: filteredData.length,
    pending: filteredData.filter(item => item.status === 'PENDING').length,
    inProgress: filteredData.filter(item => item.status === 'IN_PROGRESS').length,
    complete: filteredData.filter(item => item.status === 'COMPLETE').length,
    delivery: filteredData.filter(item => item.type === 'DELIVERY').length,
    return: filteredData.filter(item => item.type === 'RETURN').length
  };
  
  // 요약 카드 업데이트
  const totalOrdersEl = document.getElementById('totalOrders');
  const pendingOrdersEl = document.getElementById('pendingOrders');
  const inProgressOrdersEl = document.getElementById('inProgressOrders');
  const completedOrdersEl = document.getElementById('completedOrders');
  const deliveryOrdersEl = document.getElementById('deliveryOrders');
  const returnOrdersEl = document.getElementById('returnOrders');
  
  if (totalOrdersEl) totalOrdersEl.textContent = `${statusCounts.total}건`;
  if (pendingOrdersEl) pendingOrdersEl.textContent = `${statusCounts.pending}건`;
  if (inProgressOrdersEl) inProgressOrdersEl.textContent = `${statusCounts.inProgress}건`;
  if (completedOrdersEl) completedOrdersEl.textContent = `${statusCounts.complete}건`;
  if (deliveryOrdersEl) deliveryOrdersEl.textContent = `${statusCounts.delivery}건`;
  if (returnOrdersEl) returnOrdersEl.textContent = `${statusCounts.return}건`;
}

// 신규 주문 등록 처리
function handleCreateOrder() {
  const form = document.getElementById('newOrderForm');
  if (!form) return;
  
  // 폼 데이터 수집
  const formData = new FormData(form);
  const orderId = formData.get('order_no');
  
  // 필수 필드 검증
  const requiredFields = ['order_no', 'customer', 'eta', 'warehouse', 'department', 'type'];
  for (const field of requiredFields) {
    if (!formData.get(field)) {
      showMessage(`필수 입력 항목을 확인해주세요: ${field}`, 'warning');
      return;
    }
  }
  
  // 데이터 객체 생성
  const newOrder = {
    order_no: orderId,
    customer: formData.get('customer'),
    department: formData.get('department'),
    warehouse: formData.get('warehouse'),
    type: formData.get('type'),
    status: 'PENDING', // 신규 등록은 항상 대기 상태
    eta: formData.get('eta'),
    sla: formData.get('sla'),
    postal_code: formData.get('postal_code'),
    address: formData.get('address'),
    contact: formData.get('contact'),
    remark: formData.get('remark'),
    create_time: new Date().toISOString()
  };
  
  // 주문 등록
  if (updateOrder(orderId, newOrder)) {
    showMessage('새 주문이 성공적으로 등록되었습니다', 'success');
    closeModal('newOrderModal');
    renderDashboardTable();
    updateSummaryCards();
  } else {
    showMessage('주문 등록 중 오류가 발생했습니다', 'error');
  }
}

// 상태 변경 처리
function handleStatusChange() {
  // 로딩 표시
  document.getElementById('loadingOverlay').style.display = 'flex';
  
  // 각 주문 상태 업데이트
  const updatePromises = currentStatusChange.orderIds.map(orderId => {
    const order = findOrderById(orderId);
    if (!order) return Promise.resolve();
    
    const updateData = {
      status: currentStatusChange.status
    };
    
    // 상태 변경에 따른 시간 업데이트
    // 대기 -> 진행: 출발 시간 설정
    if (order.status === 'PENDING' && currentStatusChange.status === 'IN_PROGRESS') {
      updateData.depart_time = new Date().toISOString();
    }
    
    // 진행 -> 완료/이슈: 완료 시간 설정
    if (order.status === 'IN_PROGRESS' && 
        (currentStatusChange.status === 'COMPLETE' || currentStatusChange.status === 'ISSUE')) {
      updateData.complete_time = new Date().toISOString();
    }
    
    return new Promise((resolve) => {
      if (updateOrder(orderId, updateData)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
  
  // 모든 업데이트 완료 후 처리
  Promise.all(updatePromises).then(() => {
    // 로딩 숨김
    document.getElementById('loadingOverlay').style.display = 'none';
    
    // 모달 닫기
    closeModal('statusConfirmModal');
    
    // 상태 변경 정보 초기화
    currentStatusChange = {
      status: null,
      orderIds: []
    };
    
    // 선택 초기화
    selectedOrders = [];
    updateActionButtonsState();
    
    // 테이블 갱신
    renderDashboardTable();
    updateSummaryCards();
    
    showMessage('상태 변경이 완료되었습니다', 'success');
  });
}

// 배차 처리 실행
function handleAssignDriver() {
  // 폼 데이터 가져오기
  const form = document.getElementById('assignDriverForm');
  if (!form) return;
  
  const formData = new FormData(form);
  const driverName = formData.get('driver_name');
  const driverContact = formData.get('driver_contact');
  
  if (!driverName) {
    showMessage('기사 이름을 입력해주세요', 'warning');
    return;
  }
  
  // 로딩 표시
  document.getElementById('loadingOverlay').style.display = 'flex';
  
  // 각 주문에 배차 정보 업데이트
  const updatePromises = selectedOrders.map(orderId => {
    const order = findOrderById(orderId);
    if (!order) return Promise.resolve();
    
    const updateData = {
      driver_name: driverName,
      driver_contact: driverContact
    };
    
    return new Promise((resolve) => {
      if (updateOrder(orderId, updateData)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
  
  // 모든 업데이트 완료 후 처리
  Promise.all(updatePromises).then(() => {
    // 로딩 숨김
    document.getElementById('loadingOverlay').style.display = 'none';
    
    // 모달 닫기
    closeModal('assignDriverModal');
    
    // 폼 초기화
    form.reset();
    
    // 선택 초기화
    selectedOrders = [];
    updateActionButtonsState();
    
    // 테이블 갱신
    renderDashboardTable();
    
    showMessage('배차 처리가 완료되었습니다', 'success');
  });
}

// 주문 삭제 실행
function handleDeleteOrders() {
  // 로딩 표시
  document.getElementById('loadingOverlay').style.display = 'flex';
  
  // 삭제할 주문 ID 목록 저장
  const orderIdsToDelete = [...selectedOrders];
  
  // 로컬 데이터에서 선택한 주문 제거
  appData.dashboard = appData.dashboard.filter(order => !orderIdsToDelete.includes(order.order_no));
  
  // 로컬 스토리지 업데이트
  localStorage.setItem('tms_dashboard_data', JSON.stringify(appData.dashboard));
  
  // 로딩 숨김
  document.getElementById('loadingOverlay').style.display = 'none';
  
  // 모달 닫기
  closeModal('deleteConfirmModal');
  
  // 선택 초기화
  selectedOrders = [];
  updateActionButtonsState();
  
  // 테이블 갱신
  renderDashboardTable();
  updateSummaryCards();
  
  // 이벤트 발생
  document.dispatchEvent(new Event('dashboard_updated'));
  
  showMessage(`${orderIdsToDelete.length}개의 주문이 삭제되었습니다`, 'success');
}

// 페이지 로드 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', initDashboard);

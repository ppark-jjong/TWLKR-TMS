/**
 * 대시보드 페이지 스크립트
 */

// 현재 필터 상태
const dashboardFilters = {
  status: '',
  department: '',
  warehouse: '',
  keyword: '',
  startDate: '',
  endDate: ''
};

// 대시보드 페이지 초기화
function initDashboard() {
  console.log('대시보드 페이지 초기화');
  
  // 페이지 타이틀 설정
  setPageTitle('대시보드');
  
  // 필터 이벤트 설정
  setupFilters();
  
  // 테이블 행 클릭 이벤트 설정
  setupTableRowEvents('dashboardTable', showOrderDetail);
  
  // 데이터 로드
  loadAppData().then(() => {
    // 초기 데이터 렌더링
    renderDashboardTable();
    
    // 데이터 변경 시 테이블 갱신 이벤트 설정
    document.addEventListener('dashboard_updated', renderDashboardTable);
  });
  
  // 초기 날짜 필터 설정 - 오늘 기준 ±7일
  setDefaultDateFilter();
  
  // 모달 폼 제출 이벤트 설정
  setupModalForms();
}

// 필터 이벤트 설정
function setupFilters() {
  // 상태 필터
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      dashboardFilters.status = statusFilter.value;
      renderDashboardTable();
    });
  }
  
  // 부서 필터
  const deptFilter = document.getElementById('departmentFilter');
  if (deptFilter) {
    deptFilter.addEventListener('change', () => {
      dashboardFilters.department = deptFilter.value;
      renderDashboardTable();
    });
  }
  
  // 창고 필터
  const warehouseFilter = document.getElementById('warehouseFilter');
  if (warehouseFilter) {
    warehouseFilter.addEventListener('change', () => {
      dashboardFilters.warehouse = warehouseFilter.value;
      renderDashboardTable();
    });
  }
  
  // 키워드 검색
  const searchBtn = document.getElementById('searchBtn');
  const keywordInput = document.getElementById('keywordInput');
  
  if (searchBtn && keywordInput) {
    searchBtn.addEventListener('click', () => {
      dashboardFilters.keyword = keywordInput.value.trim();
      renderDashboardTable();
    });
    
    // 엔터키 검색
    keywordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        dashboardFilters.keyword = keywordInput.value.trim();
        renderDashboardTable();
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
    });
  }
  
  // 필터 초기화 버튼
  const resetFilterBtn = document.getElementById('resetFilterBtn');
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', resetFilters);
  }
}

// 필터 초기화
function resetFilters() {
  // 필터 상태 초기화
  dashboardFilters.status = '';
  dashboardFilters.department = '';
  dashboardFilters.warehouse = '';
  dashboardFilters.keyword = '';
  
  // 필터 UI 초기화
  const statusFilter = document.getElementById('statusFilter');
  const deptFilter = document.getElementById('departmentFilter');
  const warehouseFilter = document.getElementById('warehouseFilter');
  const keywordInput = document.getElementById('keywordInput');
  
  if (statusFilter) statusFilter.value = '';
  if (deptFilter) deptFilter.value = '';
  if (warehouseFilter) warehouseFilter.value = '';
  if (keywordInput) keywordInput.value = '';
  
  // 날짜 필터 기본값으로 설정
  setDefaultDateFilter();
  
  // 테이블 다시 렌더링
  renderDashboardTable();
  
  showMessage('필터가 초기화되었습니다.', 'info');
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
  
  // 결과 카운트 업데이트
  const resultCount = document.getElementById('resultCount');
  if (resultCount) {
    resultCount.textContent = filteredData.length;
  }
  
  // 테이블 내용 초기화
  tbody.innerHTML = '';
  
  // 데이터가 없는 경우
  if (filteredData.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `<td colspan="7" class="empty-message">데이터가 없습니다</td>`;
    tbody.appendChild(emptyRow);
    return;
  }
  
  // 데이터 행 생성
  filteredData.forEach(order => {
    const row = document.createElement('tr');
    row.setAttribute('data-id', order.order_no);
    
    // 행 내용 설정
    row.innerHTML = `
      <td>${order.order_no || '-'}</td>
      <td>${order.customer || '-'}</td>
      <td>${formatDate(order.eta) || '-'}</td>
      <td>${order.warehouse || '-'}</td>
      <td>${order.department || '-'}</td>
      <td><span class="status-badge ${getStatusClass(order.status)}">${getStatusText(order.status) || '-'}</span></td>
      <td>${formatDateTime(order.update_at) || '-'}</td>
    `;
    
    tbody.appendChild(row);
  });
}

// 주문 상세 정보 표시
function showOrderDetail(orderId) {
  console.log('주문 상세 정보 표시:', orderId);
  
  // ID로 주문 정보 가져오기
  const order = findOrderById(orderId);
  
  if (!order) {
    showError(`주문 정보를 찾을 수 없습니다: ${orderId}`);
    return;
  }
  
  // 모달 내용 설정
  let content = `
    <div class="order-detail">
      <dl>
        <dt>주문번호</dt>
        <dd>${order.order_no || '-'}</dd>
        
        <dt>고객명</dt>
        <dd>${order.customer || '-'}</dd>
        
        <dt>예상도착일</dt>
        <dd>${formatDate(order.eta) || '-'}</dd>
        
        <dt>창고</dt>
        <dd>${order.warehouse || '-'}</dd>
        
        <dt>담당부서</dt>
        <dd>${order.department || '-'}</dd>
        
        <dt>상태</dt>
        <dd><span class="status-badge ${getStatusClass(order.status)}">${getStatusText(order.status) || '-'}</span></dd>
        
        <dt>최종 업데이트</dt>
        <dd>${formatDateTime(order.update_at) || '-'}</dd>
        
        <dt>담당자</dt>
        <dd>${order.updated_by || '-'}</dd>
      </dl>
      
      <div class="order-actions">
        <button type="button" id="editOrderBtn" class="btn btn-primary">주문 수정</button>
      </div>
    </div>
  `;
  
  // 모달 제목과 내용 설정
  setModalContent('orderDetailModal', `주문 상세정보 (${orderId})`, content);
  
  // 모달 열기
  openModal('orderDetailModal');
  
  // 수정 버튼 이벤트 설정
  const editBtn = document.getElementById('editOrderBtn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      // 상세 모달 닫기
      closeModal('orderDetailModal');
      // 수정 모달 열기
      showEditOrderModal(orderId);
    });
  }
}

// 주문 수정 모달 표시
function showEditOrderModal(orderId) {
  console.log('주문 수정 모달 표시:', orderId);
  
  // ID로 주문 정보 가져오기
  const order = findOrderById(orderId);
  
  if (!order) {
    showError(`주문 정보를 찾을 수 없습니다: ${orderId}`);
    return;
  }
  
  // 수정 폼 생성
  let formContent = `
    <form id="editOrderForm" class="edit-form">
      <input type="hidden" name="order_no" value="${order.order_no}">
      
      <div class="form-group">
        <label>고객명</label>
        <input type="text" name="customer" value="${order.customer || ''}" class="form-control">
      </div>
      
      <div class="form-group">
        <label>예상도착일</label>
        <input type="date" name="eta" value="${order.eta ? order.eta.split('T')[0] : ''}" class="form-control">
      </div>
      
      <div class="form-group">
        <label>창고</label>
        <select name="warehouse" class="form-control">
          <option value="">선택하세요</option>
          <option value="서울창고" ${order.warehouse === '서울창고' ? 'selected' : ''}>서울창고</option>
          <option value="부산창고" ${order.warehouse === '부산창고' ? 'selected' : ''}>부산창고</option>
          <option value="대전창고" ${order.warehouse === '대전창고' ? 'selected' : ''}>대전창고</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>담당부서</label>
        <select name="department" class="form-control">
          <option value="">선택하세요</option>
          <option value="영업" ${order.department === '영업' ? 'selected' : ''}>영업</option>
          <option value="CS" ${order.department === 'CS' ? 'selected' : ''}>CS</option>
          <option value="물류" ${order.department === '물류' ? 'selected' : ''}>물류</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>상태</label>
        <select name="status" class="form-control">
          <option value="PENDING" ${order.status === 'PENDING' ? 'selected' : ''}>대기</option>
          <option value="IN_PROGRESS" ${order.status === 'IN_PROGRESS' ? 'selected' : ''}>진행</option>
          <option value="COMPLETE" ${order.status === 'COMPLETE' ? 'selected' : ''}>완료</option>
          <option value="ISSUE" ${order.status === 'ISSUE' ? 'selected' : ''}>이슈</option>
          <option value="CANCEL" ${order.status === 'CANCEL' ? 'selected' : ''}>취소</option>
        </select>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">저장</button>
        <button type="button" class="btn btn-secondary" data-close-modal>취소</button>
      </div>
    </form>
  `;
  
  // 모달 제목과 내용 설정
  setModalContent('editOrderModal', `주문 수정 (${orderId})`, formContent);
  
  // 모달 열기
  openModal('editOrderModal');
}

// 모달 폼 제출 이벤트 설정
function setupModalForms() {
  // 이벤트 위임을 사용하여 문서 레벨에서 폼 제출 처리
  document.addEventListener('submit', (e) => {
    // 주문 수정 폼
    if (e.target.id === 'editOrderForm') {
      e.preventDefault();
      
      // 폼 데이터 수집
      const formData = new FormData(e.target);
      const orderId = formData.get('order_no');
      
      // 업데이트 데이터 객체 생성
      const updateData = {
        customer: formData.get('customer'),
        eta: formData.get('eta'),
        warehouse: formData.get('warehouse'),
        department: formData.get('department'),
        status: formData.get('status')
      };
      
      // 주문 업데이트
      if (updateOrder(orderId, updateData)) {
        showSuccess('주문이 성공적으로 업데이트되었습니다.');
        closeModal('editOrderModal');
        renderDashboardTable(); // 테이블 갱신
      } else {
        showError('주문 업데이트 중 오류가 발생했습니다.');
      }
    }
  });
}

// 페이지 로드 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', initDashboard);

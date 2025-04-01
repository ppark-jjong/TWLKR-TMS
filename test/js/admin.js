// 관리자 페이지 스크립트

// 전역 변수
let selectedRows = new Set();
let currentStatusItem = null;
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 10;

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function () {
  // 초기 데이터 설정
  filteredData = [...dashboardData]; // mock-data.js에서 가져온 데이터

  // 사이드바 토글 이벤트 리스너
  document
    .getElementById('sidebarToggle')
    .addEventListener('click', toggleSidebar);

  // 메뉴 아이템 이벤트 리스너
  document.querySelectorAll('.menu-item').forEach((item) => {
    item.addEventListener('click', function () {
      navigateToPage(this.dataset.page);
    });
  });

  // 현재 날짜 설정
  const today = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(today.getMonth() - 1);

  document.getElementById('startDate').valueAsDate = lastMonth;
  document.getElementById('endDate').valueAsDate = today;

  // 관리자 페이지 이벤트 리스너
  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  document
    .getElementById('resetFilterBtn')
    .addEventListener('click', resetFilters);
  document.getElementById('refreshBtn').addEventListener('click', function () {
    filteredData = [...dashboardData];
    renderAdminTable(currentPage);
  });
  document
    .getElementById('assignBtn')
    .addEventListener('click', showAssignModal);
  document.getElementById('deleteBtn').addEventListener('click', handleDelete);
  document
    .getElementById('downloadExcelBtn')
    .addEventListener('click', function () {
      alert('엑셀 파일 다운로드가 시작되었습니다.');
    });
  document.getElementById('addOrderBtn').addEventListener('click', function () {
    toggleModal('orderModal', true);
  });

  // 전체 선택 체크박스 이벤트 리스너
  document
    .getElementById('selectAllCheckbox')
    .addEventListener('change', function () {
      const checkboxes = document.querySelectorAll(
        '#adminTableBody input[type="checkbox"]'
      );
      checkboxes.forEach((checkbox) => {
        checkbox.checked = this.checked;
        const rowId = checkbox.dataset.id;
        if (this.checked) {
          selectedRows.add(parseInt(rowId));
        } else {
          selectedRows.delete(parseInt(rowId));
        }
      });
    });

  // 상태 모달 이벤트 리스너
  document
    .getElementById('statusModalClose')
    .addEventListener('click', function () {
      toggleModal('statusModal', false);
    });
  document
    .getElementById('statusModalCancel')
    .addEventListener('click', function () {
      toggleModal('statusModal', false);
    });
  document
    .getElementById('statusModalSubmit')
    .addEventListener('click', handleStatusChange);

  // 배차 모달 이벤트 리스너
  document
    .getElementById('assignModalClose')
    .addEventListener('click', function () {
      toggleModal('assignModal', false);
    });
  document
    .getElementById('assignModalCancel')
    .addEventListener('click', function () {
      toggleModal('assignModal', false);
    });
  document
    .getElementById('assignModalSubmit')
    .addEventListener('click', handleAssign);

  // 주문 추가 모달 이벤트 리스너
  document
    .getElementById('orderModalClose')
    .addEventListener('click', function () {
      toggleModal('orderModal', false);
    });
  document
    .getElementById('orderModalCancel')
    .addEventListener('click', function () {
      toggleModal('orderModal', false);
    });
  document
    .getElementById('orderModalSubmit')
    .addEventListener('click', handleAddOrder);

  // 페이지 초기 렌더링
  renderAdminTable(currentPage);
});

// 사이드바 토글
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');

  sidebar.classList.toggle('sidebar-collapsed');
  mainContent.classList.toggle('main-content-full');

  const toggleBtn = document.getElementById('sidebarToggle');
  toggleBtn.textContent = sidebar.classList.contains('sidebar-collapsed')
    ? '▶'
    : '◀';
}

// 페이지 이동
function navigateToPage(page) {
  switch (page) {
    case 'admin':
      // 현재 페이지이므로 아무 작업 없음
      break;
    case 'handover':
      window.location.href = 'handover.html';
      break;
    case 'users':
      window.location.href = 'users.html';
      break;
  }
}

// 관리자 테이블 렌더링
function renderAdminTable(page) {
  const tbody = document.getElementById('adminTableBody');
  tbody.innerHTML = '';

  document.getElementById(
    'totalCount'
  ).textContent = `총 건수: ${filteredData.length}건`;

  // 페이징 처리
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // 테이블 데이터 렌더링
  paginatedData.forEach((item) => {
    const tr = document.createElement('tr');

    // 체크박스 셀
    const checkboxCell = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.id = item.dashboard_id;
    checkbox.addEventListener('change', function () {
      if (this.checked) {
        selectedRows.add(parseInt(this.dataset.id));
      } else {
        selectedRows.delete(parseInt(this.dataset.id));
      }
    });
    checkboxCell.appendChild(checkbox);
    tr.appendChild(checkboxCell);

    // 주문번호
    tr.appendChild(createCell(item.order_no));

    // 고객
    tr.appendChild(createCell(item.customer));

    // 유형
    const typeCell = document.createElement('td');
    const typeTag = document.createElement('span');
    typeTag.className = `tag tag-${typeMap[item.type].color}`;
    typeTag.textContent = typeMap[item.type].text;
    typeCell.appendChild(typeTag);
    tr.appendChild(typeCell);

    // 상태
    const statusCell = document.createElement('td');
    const statusTag = document.createElement('span');
    statusTag.className = `tag tag-${statusMap[item.status].color}`;
    statusTag.textContent = statusMap[item.status].text;
    statusCell.appendChild(statusTag);
    tr.appendChild(statusCell);

    // 부서, 창고, ETA, 배송기사
    tr.appendChild(createCell(item.department));
    tr.appendChild(createCell(item.warehouse));
    tr.appendChild(createCell(item.eta));
    tr.appendChild(createCell(item.driver_name || '-'));

    // 액션
    const actionCell = document.createElement('td');
    const actionButton = document.createElement('button');
    actionButton.className = 'action-button';
    actionButton.textContent = '상태변경';
    actionButton.addEventListener('click', function (e) {
      e.stopPropagation();
      showStatusModal(item);
    });
    actionCell.appendChild(actionButton);
    tr.appendChild(actionCell);

    // 행 클릭 이벤트
    tr.addEventListener('click', function () {
      showOrderDetail(item);
    });

    tbody.appendChild(tr);
  });

  // 페이지네이션 렌더링
  renderPagination();
}

// 페이지네이션 렌더링
function renderPagination() {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const pagination = document.getElementById('adminPagination');
  pagination.innerHTML = '';

  // 처음 페이지 버튼
  if (currentPage > 1) {
    const firstBtn = createPaginationButton('<<', 1);
    pagination.appendChild(firstBtn);
  }

  // 이전 페이지 버튼
  if (currentPage > 1) {
    const prevBtn = createPaginationButton('<', currentPage - 1);
    pagination.appendChild(prevBtn);
  }

  // 페이지 번호 버튼
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = createPaginationButton(i, i);
    if (i === currentPage) {
      pageBtn.classList.add('active');
    }
    pagination.appendChild(pageBtn);
  }

  // 다음 페이지 버튼
  if (currentPage < totalPages) {
    const nextBtn = createPaginationButton('>', currentPage + 1);
    pagination.appendChild(nextBtn);
  }

  // 마지막 페이지 버튼
  if (currentPage < totalPages) {
    const lastBtn = createPaginationButton('>>', totalPages);
    pagination.appendChild(lastBtn);
  }
}

// 페이지네이션 버튼 생성
function createPaginationButton(text, pageNum) {
  const btn = document.createElement('button');
  btn.className = 'pagination-btn';
  btn.textContent = text;
  btn.addEventListener('click', function () {
    currentPage = pageNum;
    renderAdminTable(currentPage);
  });
  return btn;
}

// 셀 생성 헬퍼 함수
function createCell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

// 주문 상세 정보 표시
function showOrderDetail(item) {
  alert(
    `주문 상세 정보:\n\n주문번호: ${item.order_no}\n고객명: ${
      item.customer
    }\n주소: ${item.address}\n상태: ${statusMap[item.status].text}\n배송기사: ${
      item.driver_name || '미배정'
    }\n연락처: ${item.driver_contact || '-'}`
  );
}

// 관리자 페이지 검색 처리
function handleSearch() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;
  const departmentFilter = document.getElementById('departmentFilter').value;
  const warehouseFilter = document.getElementById('warehouseFilter').value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  filteredData = dashboardData.filter((item) => {
    // 검색어 필터링
    const matchesSearch =
      searchTerm === '' ||
      item.order_no.toLowerCase().includes(searchTerm) ||
      item.customer.toLowerCase().includes(searchTerm);

    // 상태 필터링
    const matchesStatus = statusFilter === '' || item.status === statusFilter;

    // 부서 필터링
    const matchesDepartment =
      departmentFilter === '' || item.department === departmentFilter;

    // 창고 필터링
    const matchesWarehouse =
      warehouseFilter === '' || item.warehouse === warehouseFilter;

    // 날짜 필터링
    const itemDate = item.created_at.split(' ')[0];
    const matchesDate =
      (!startDate || itemDate >= startDate) &&
      (!endDate || itemDate <= endDate);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesDepartment &&
      matchesWarehouse &&
      matchesDate
    );
  });

  currentPage = 1; // 검색 시 첫 페이지로 이동
  renderAdminTable(currentPage);
}

// 필터 초기화
function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('departmentFilter').value = '';
  document.getElementById('warehouseFilter').value = '';

  const today = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(today.getMonth() - 1);

  document.getElementById('startDate').valueAsDate = lastMonth;
  document.getElementById('endDate').valueAsDate = today;

  filteredData = [...dashboardData];
  currentPage = 1;
  renderAdminTable(currentPage);
}

// 상태 변경 모달 표시
function showStatusModal(item) {
  currentStatusItem = item;

  document.getElementById('modalOrderNo').textContent = item.order_no;
  document.getElementById('modalCustomer').textContent = item.customer;

  const statusTag = document.createElement('span');
  statusTag.className = `tag tag-${statusMap[item.status].color}`;
  statusTag.textContent = statusMap[item.status].text;

  const modalCurrentStatus = document.getElementById('modalCurrentStatus');
  modalCurrentStatus.innerHTML = '';
  modalCurrentStatus.appendChild(statusTag);

  document.getElementById('statusSelect').value = item.status;

  toggleModal('statusModal', true);
}

// 상태 변경 처리
function handleStatusChange() {
  if (!currentStatusItem) return;

  const newStatus = document.getElementById('statusSelect').value;

  // 모의 데이터 업데이트
  dashboardData.forEach((item) => {
    if (item.dashboard_id === currentStatusItem.dashboard_id) {
      item.status = newStatus;
      item.updated_at = getCurrentDateTime();
    }
  });

  // 필터링된 데이터도 업데이트
  filteredData.forEach((item) => {
    if (item.dashboard_id === currentStatusItem.dashboard_id) {
      item.status = newStatus;
      item.updated_at = getCurrentDateTime();
    }
  });

  // 테이블 새로고침
  renderAdminTable(currentPage);

  // 모달 닫기
  toggleModal('statusModal', false);

  alert('상태가 변경되었습니다.');
}

// 배차 모달 표시
function showAssignModal() {
  const checkboxes = document.querySelectorAll(
    '#adminTableBody input[type="checkbox"]:checked'
  );

  if (checkboxes.length === 0) {
    alert('배차할 항목을 선택해주세요.');
    return;
  }

  document.getElementById('selectedCount').textContent = checkboxes.length;
  toggleModal('assignModal', true);
}

// 배차 처리
function handleAssign() {
  const driverName = document.getElementById('driverName').value;
  const driverContact = document.getElementById('driverContact').value;

  if (!driverName) {
    alert('기사명을 입력해주세요.');
    return;
  }

  if (!driverContact) {
    alert('연락처를 입력해주세요.');
    return;
  }

  // 체크된 항목 ID 수집
  const selectedIds = Array.from(selectedRows);

  // 모의 데이터 업데이트
  dashboardData.forEach((item) => {
    if (selectedIds.includes(item.dashboard_id)) {
      item.driver_name = driverName;
      item.driver_contact = driverContact;
      item.status = 'IN_PROGRESS'; // 배차 시 상태를 진행 중으로 변경
      item.updated_at = getCurrentDateTime();
    }
  });

  // 필터링된 데이터도 업데이트
  filteredData.forEach((item) => {
    if (selectedIds.includes(item.dashboard_id)) {
      item.driver_name = driverName;
      item.driver_contact = driverContact;
      item.status = 'IN_PROGRESS';
      item.updated_at = getCurrentDateTime();
    }
  });

  // 테이블 새로고침
  renderAdminTable(currentPage);

  // 모달 닫기
  toggleModal('assignModal', false);

  // 선택 초기화
  selectedRows.clear();
  document.getElementById('selectAllCheckbox').checked = false;

  alert('배차가 완료되었습니다.');
}

// 주문 추가 처리
function handleAddOrder() {
  const orderNo = document.getElementById('orderNo').value;
  const customer = document.getElementById('customerName').value;
  const type = document.getElementById('orderType').value;
  const department = document.getElementById('orderDepartment').value;
  const warehouse = document.getElementById('orderWarehouse').value;
  const postalCode = document.getElementById('orderPostalCode').value;
  const address = document.getElementById('orderAddress').value;
  const eta = document.getElementById('orderEta').value;

  if (!orderNo || !customer || !postalCode || !address || !eta) {
    alert('필수 항목을 모두 입력해주세요.');
    return;
  }

  // 새 주문 생성
  const newOrder = {
    dashboard_id:
      dashboardData.length > 0
        ? Math.max(...dashboardData.map((item) => item.dashboard_id)) + 1
        : 1,
    order_no: orderNo,
    customer: customer,
    type: type,
    status: 'WAITING',
    department: department,
    warehouse: warehouse,
    postal_code: parseInt(postalCode),
    address: address,
    eta: eta.replace('T', ' '),
    driver_name: '',
    driver_contact: '',
    created_at: getCurrentDateTime(),
    updated_at: getCurrentDateTime(),
  };

  // 데이터 추가
  dashboardData.push(newOrder);

  // 필터링된 데이터가 전체 데이터인 경우 추가
  if (filteredData.length === dashboardData.length - 1) {
    filteredData.push(newOrder);
  } else {
    // 필터 다시 적용
    handleSearch();
  }

  // 테이블 새로고침
  renderAdminTable(currentPage);

  // 모달 닫기
  toggleModal('orderModal', false);

  // 폼 초기화
  document.getElementById('orderNo').value = '';
  document.getElementById('customerName').value = '';
  document.getElementById('orderPostalCode').value = '';
  document.getElementById('orderAddress').value = '';
  document.getElementById('orderEta').value = '';

  alert('주문이 추가되었습니다.');
}

// 주문 삭제 처리
function handleDelete() {
  const selectedIds = Array.from(selectedRows);

  if (selectedIds.length === 0) {
    alert('삭제할 항목을 선택해주세요.');
    return;
  }

  if (confirm(`선택한 ${selectedIds.length}개 항목을 삭제하시겠습니까?`)) {
    // 모의 데이터에서 삭제
    for (let i = dashboardData.length - 1; i >= 0; i--) {
      if (selectedIds.includes(dashboardData[i].dashboard_id)) {
        dashboardData.splice(i, 1);
      }
    }

    // 필터링된 데이터에서도 삭제
    for (let i = filteredData.length - 1; i >= 0; i--) {
      if (selectedIds.includes(filteredData[i].dashboard_id)) {
        filteredData.splice(i, 1);
      }
    }

    // 테이블 새로고침
    renderAdminTable(currentPage);

    // 선택 초기화
    selectedRows.clear();
    document.getElementById('selectAllCheckbox').checked = false;

    alert('선택한 항목이 삭제되었습니다.');
  }
}

// 모달 토글
function toggleModal(modalId, show) {
  const modal = document.getElementById(modalId);
  if (show) {
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
}

// 현재 날짜/시간 포맷팅
function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

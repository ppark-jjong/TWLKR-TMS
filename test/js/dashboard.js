/**
 * 대시보드 페이지 모듈 (단순화된 버전)
 */
const DashboardPage = {
  // 페이지 상태 관리 (간소화)
  state: {
    currentPage: 1,
    pageSize: 10,
    currentData: [],
    filteredData: [],
    selectedItems: [],
    visibleColumns: [], // 화면에 표시할 컬럼
    formMode: 'new', // 'new' 또는 'edit'
    orderBeingEdited: null, // 현재 편집 중인 주문 정보
    filters: {
      status: '',
      department: '',
      warehouse: '',
      region: '',
      keyword: '',
      date: {
        start: null,
        end: null,
      },
    },
  },

  // 전체 데이터
  dashboardData: [],

  // 컬럼 정의
  ALL_COLUMNS: [
    { key: 'order_no', label: '주문번호', default: true },
    { key: 'status', label: '상태', default: true },
    { key: 'department', label: '부서', default: true },
    { key: 'warehouse', label: '창고', default: true },
    { key: 'sla', label: 'SLA', default: false },
    { key: 'eta', label: 'ETA', default: true },
    { key: 'region', label: '지역', default: true },
    { key: 'customer', label: '고객명', default: true },
    { key: 'driver_name', label: '기사명', default: true },
    { key: 'updated_by', label: '최종수정자', default: false },
    { key: 'address', label: '주소', default: false },
    { key: 'postal_code', label: '우편번호', default: false },
    { key: 'phone', label: '연락처', default: false },
    { key: 'notes', label: '비고', default: false },
    { key: 'created_at', label: '생성일시', default: false },
    { key: 'updated_at', label: '수정일시', default: false },
  ],

  /**
   * 페이지 초기화
   */
  init: function () {
    console.log('대시보드 페이지 초기화...');

    // 날짜 필터 초기화
    this.initDateFilter();

    // 이벤트 리스너 등록
    this.registerEventListeners();

    // 데이터 로드
    this.loadData();

    this.loadVisibleColumns();
  },

  /**
   * 데이터 로드
   */
  loadData: function () {
    // 대시보드 데이터 로드
    fetch('dashboard_data.json')
      .then((response) => response.json())
      .then((data) => {
        // 데이터 저장
        this.dashboardData = data.orders || [];

        // 대시보드 업데이트
        this.updateDashboard();
      })
      .catch((error) => {
        console.error('데이터 로드 오류:', error);
        this.showMessage('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
      });
  },

  /**
   * 날짜 필터 초기화
   */
  initDateFilter: function () {
    const today = new Date();

    // 날짜 포맷팅 함수
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const endDateStr = formatDate(today);

    // 7일 전
    const startDate = new Date();
    startDate.setDate(today.getDate() - 7);
    const startDateStr = formatDate(startDate);

    // 초기값 설정
    document.getElementById('quickStartDate').value = startDateStr;
    document.getElementById('quickEndDate').value = endDateStr;

    // 필터 상태 업데이트
    this.state.filters.date.start = startDateStr;
    this.state.filters.date.end = endDateStr;
  },

  /**
   * 이벤트 리스너 등록
   */
  registerEventListeners: function () {
    // 필터 관련 이벤트
    document
      .getElementById('statusFilter')
      ?.addEventListener('change', this.handleFilterChange.bind(this));
    document
      .getElementById('departmentFilter')
      ?.addEventListener('change', this.handleFilterChange.bind(this));
    document
      .getElementById('warehouseFilter')
      ?.addEventListener('change', this.handleFilterChange.bind(this));

    document.getElementById('searchKeyword')?.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('searchBtn')?.click();
      }
    });

    document
      .getElementById('searchBtn')
      ?.addEventListener('click', this.handleSearch.bind(this));
    document
      .getElementById('applyFilterBtn')
      ?.addEventListener('click', this.applyFilters.bind(this));
    document
      .getElementById('resetBtn')
      ?.addEventListener('click', this.resetFilters.bind(this));

    // 날짜 필터
    document
      .getElementById('quickDateBtn')
      ?.addEventListener('click', this.applyDateFilter.bind(this));
    document
      .getElementById('todayBtn')
      ?.addEventListener('click', this.applyTodayFilter.bind(this));

    // 테이블 액션 버튼
    document
      .getElementById('refreshBtn')
      ?.addEventListener('click', this.loadData.bind(this));
    document
      .getElementById('changeStatusBtn')
      ?.addEventListener('click', this.openStatusChangeModal.bind(this));
    document
      .getElementById('assignBtn')
      ?.addEventListener('click', this.handleAssign.bind(this));
    document
      .getElementById('newOrderBtn')
      ?.addEventListener('click', this.handleNewOrder.bind(this));
    document
      .getElementById('deleteOrderBtn')
      ?.addEventListener('click', this.handleDelete.bind(this));

    // 전체 선택 체크박스
    document
      .getElementById('selectAll')
      ?.addEventListener('change', this.handleSelectAll.bind(this));

    // 페이지네이션
    document.querySelectorAll('.page-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const direction = e.currentTarget.getAttribute('data-page');
        this.handlePageChange(direction);
      });
    });

    document
      .getElementById('pageSize')
      ?.addEventListener('change', this.handlePageSizeChange.bind(this));

    // 수정 버튼 이벤트 리스너
    document
      .getElementById('editOrderBtn')
      ?.addEventListener('click', this.handleEdit.bind(this));

    // 모달 버튼 - 주문 수정
    document
      .getElementById('confirmEditOrderBtn')
      ?.addEventListener('click', this.confirmEditOrder.bind(this));

    // 상태 변경 확인 버튼
    document
      .getElementById('confirmStatusChangeBtn')
      ?.addEventListener('click', this.confirmStatusChange.bind(this));

    // 모달 닫기 버튼들
    document.querySelectorAll('.close-modal').forEach((button) => {
      const modalId = button.getAttribute('data-modal');
      if (modalId) {
        button.addEventListener('click', () => {
          this.closeModal(modalId);
        });
      }
    });

    // 컬럼 설정 버튼 이벤트
    document
      .getElementById('columnSettingsBtn')
      ?.addEventListener('click', () => {
        this.openColumnSettings();
      });

    // 컬럼 설정 저장 버튼
    document
      .getElementById('saveColumnSettings')
      ?.addEventListener('click', () => {
        this.saveColumnSettingsFromModal();
      });

    // 컬럼 설정 초기화 버튼
    document
      .getElementById('resetColumnSettings')
      ?.addEventListener('click', () => {
        this.resetToDefaultColumns();
        this.updateDashboard();
        this.closeModal('columnSettingsModal');
      });
  },

  /**
   * 대시보드 업데이트
   */
  updateDashboard: function () {
    // 먼저 필터링된 데이터 가져오기
    this.updateFilteredData();

    // 요약 카드 업데이트
    this.updateSummaryCards();

    // 현재 페이지 데이터 가져오기
    this.updateCurrentPageData();

    // 테이블 렌더링
    this.renderTable();

    // 페이지네이션 업데이트
    this.updatePagination();

    // 선택된 항목 초기화
    this.state.selectedItems = [];

    // 체크박스 초기화 (요소가 존재하는 경우에만)
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
    }
  },

  /**
   * 필터링된 데이터 업데이트
   */
  updateFilteredData: function () {
    const { status, department, warehouse, region, keyword, date } =
      this.state.filters;

    // 데이터가 없는 경우 처리
    if (!this.dashboardData || !Array.isArray(this.dashboardData)) {
      this.state.filteredData = [];
      return;
    }

    // 날짜 필터링을 위한 시작/종료일 변환
    const startDateObj = date.start ? new Date(date.start) : null;
    const endDateObj = date.end ? new Date(date.end) : null;
    if (endDateObj) {
      endDateObj.setHours(23, 59, 59, 999); // 종료일은 해당 일자의 마지막 시간으로 설정
    }

    // 필터링 적용
    this.state.filteredData = this.dashboardData.filter((item) => {
      // 상태 필터
      if (status && item.status !== status) {
        return false;
      }

      // 부서 필터
      if (department && item.department !== department) {
        return false;
      }

      // 창고 필터
      if (warehouse && item.warehouse !== warehouse) {
        return false;
      }

      // 지역 필터
      if (region && item.region !== region) {
        return false;
      }

      // 키워드 검색 (주문번호, 고객명, 주소 등에서 검색)
      if (keyword) {
        const searchFields = [
          item.order_no,
          item.customer,
          item.address,
          item.postal_code,
          item.phone,
          item.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchFields.includes(keyword.toLowerCase())) {
          return false;
        }
      }

      // 날짜 필터링
      if (startDateObj || endDateObj) {
        const createDate = new Date(item.created_at);

        if (startDateObj && createDate < startDateObj) {
          return false;
        }

        if (endDateObj && createDate > endDateObj) {
          return false;
        }
      }

      return true;
    });
  },

  /**
   * 요약 카드 업데이트
   */
  updateSummaryCards: function () {
    const { filteredData } = this.state;

    // 상태별 카운트
    const statusCounts = {
      total: filteredData.length,
      waiting: filteredData.filter((item) => item.status === 'WAITING').length,
      inProgress: filteredData.filter((item) => item.status === 'IN_PROGRESS')
        .length,
      completed: filteredData.filter((item) => item.status === 'COMPLETED')
        .length,
      cancelled: filteredData.filter((item) => item.status === 'CANCELLED')
        .length,
      issue: filteredData.filter((item) => item.status === 'ISSUE').length,
    };

    // 요약 카드 업데이트 (요소가 존재하는 경우에만)
    const updateElement = (id, value) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    };

    updateElement('totalCount', statusCounts.total);
    updateElement('waitingCount', statusCounts.waiting);
    updateElement('inProgressCount', statusCounts.inProgress);
    updateElement('completedCount', statusCounts.completed);
    updateElement(
      'cancelledIssueCount',
      statusCounts.cancelled + statusCounts.issue
    );
  },

  /**
   * 현재 페이지 데이터 업데이트
   */
  updateCurrentPageData: function () {
    const { currentPage, pageSize } = this.state;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    this.state.currentData = this.state.filteredData.slice(
      startIndex,
      endIndex
    );
  },

  /**
   * 테이블 렌더링
   */
  renderTable: function () {
    const { currentData, selectedItems, visibleColumns } = this.state;
    const tableBody = document.getElementById('dashboardTableBody');

    if (!tableBody) {
      console.error('테이블 본문을 찾을 수 없습니다: dashboardTableBody');
      return;
    }

    // 테이블 초기화
    tableBody.innerHTML = '';

    // 데이터가 없는 경우
    if (currentData.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-data-row';
      emptyRow.innerHTML = `
        <td colspan="${visibleColumns.length + 2}" class="text-center">
          <div class="no-data-content">
            <i class="fa-solid fa-inbox"></i>
            <p>조회된 데이터가 없습니다.</p>
          </div>
        </td>
      `;
      tableBody.appendChild(emptyRow);
      return;
    }

    // 데이터 행 생성
    currentData.forEach((item) => {
      const row = document.createElement('tr');

      // 선택된 항목인지 확인
      const isSelected = selectedItems.includes(item.order_no);
      if (isSelected) {
        row.classList.add('selected-row');
      }

      // 체크박스 셀
      const checkboxCell = document.createElement('td');
      checkboxCell.className = 'checkbox-column';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = item.order_no;
      checkbox.checked = isSelected;
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation(); // 행 클릭 이벤트와 중복 방지
        this.handleRowSelection(item.order_no, e.target.checked);
      });
      checkboxCell.appendChild(checkbox);

      row.appendChild(checkboxCell);

      // 선택된 컬럼 표시
      visibleColumns.forEach((colKey) => {
        const cell = document.createElement('td');

        // 특별 처리가 필요한 컬럼
        if (colKey === 'status') {
          const statusClass = this.getStatusClass(item.status);
          cell.innerHTML = `<span class="status-badge ${statusClass}">${this.getStatusText(
            item.status
          )}</span>`;
        } else {
          // 기본 텍스트 표시
          cell.textContent = item[colKey] || '';
        }

        row.appendChild(cell);
      });

      // 액션 버튼
      const actionsCell = document.createElement('td');
      actionsCell.className = 'action-column';

      // 수정 버튼
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-sm btn-primary mr-1';
      editBtn.innerHTML = '<i class="fas fa-edit"></i>';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 행 클릭 이벤트와 중복 방지
        this.handleEdit(item.order_no);
      });
      actionsCell.appendChild(editBtn);

      // 상세 버튼
      const detailBtn = document.createElement('button');
      detailBtn.className = 'btn btn-sm btn-info';
      detailBtn.innerHTML = '<i class="fas fa-info-circle"></i>';
      detailBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 행 클릭 이벤트와 중복 방지
        this.fillOrderDetailModal(item);
        this.openModal('orderDetailModal');
      });
      actionsCell.appendChild(detailBtn);

      row.appendChild(actionsCell);

      // 행 클릭 이벤트
      row.addEventListener('click', () => {
        this.handleRowClick(item);
      });

      tableBody.appendChild(row);
    });
  },

  /**
   * 페이지네이션 업데이트
   */
  updatePagination: function () {
    const { currentPage, pageSize, filteredData } = this.state;
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    // 페이지 정보 업데이트
    const pageInfoEl = document.getElementById('pageInfo');
    if (pageInfoEl) {
      pageInfoEl.textContent = `${currentPage} / ${totalPages}`;
    }

    // 페이지 버튼 활성화/비활성화
    const prevBtn = document.querySelector('.page-btn[data-page="prev"]');
    const nextBtn = document.querySelector('.page-btn[data-page="next"]');

    if (prevBtn) {
      prevBtn.disabled = currentPage <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled = currentPage >= totalPages;
    }

    // 총 건수 표시
    const totalItemCountEl = document.getElementById('totalItemCount');
    const currentPageItemsEl = document.getElementById('currentPageItems');

    if (totalItemCountEl) {
      totalItemCountEl.textContent = totalItems;
    }

    if (currentPageItemsEl) {
      currentPageItemsEl.textContent = `${Math.min(
        (currentPage - 1) * pageSize + 1,
        totalItems
      )} - ${Math.min(currentPage * pageSize, totalItems)}`;
    }
  },

  /**
   * 필터 변경 처리
   */
  handleFilterChange: function (e) {
    const filterName = e.target.id.replace('Filter', '');
    this.state.filters[filterName.toLowerCase()] = e.target.value;
  },

  /**
   * 검색 처리
   */
  handleSearch: function () {
    const keyword = document.getElementById('searchKeyword').value.trim();
    this.state.filters.keyword = keyword;
    this.state.currentPage = 1;
    this.updateDashboard();
  },

  /**
   * 필터 적용
   */
  applyFilters: function () {
    // 날짜 범위 가져오기
    const startDate = document.getElementById('quickStartDate').value;
    const endDate = document.getElementById('quickEndDate').value;

    // 필터 상태 업데이트
    this.state.filters.date.start = startDate;
    this.state.filters.date.end = endDate;

    // 페이지 초기화 및 데이터 업데이트
    this.state.currentPage = 1;
    this.updateDashboard();
  },

  /**
   * 필터 초기화
   */
  resetFilters: function () {
    // 셀렉트 박스 필터 초기화
    document.getElementById('statusFilter').value = '';
    document.getElementById('departmentFilter').value = '';
    document.getElementById('warehouseFilter').value = '';

    // 검색어 초기화
    document.getElementById('searchKeyword').value = '';

    // 날짜 필터 초기화
    this.initDateFilter();

    // 필터 상태 초기화
    this.state.filters = {
      status: '',
      department: '',
      warehouse: '',
      region: '',
      keyword: '',
      date: {
        start: this.state.filters.date.start,
        end: this.state.filters.date.end,
      },
    };

    // 페이지 초기화 및 데이터 업데이트
    this.state.currentPage = 1;
    this.updateDashboard();
  },

  /**
   * 날짜 필터 적용
   */
  applyDateFilter: function () {
    this.applyFilters();
  },

  /**
   * 오늘 필터 적용
   */
  applyTodayFilter: function () {
    const today = new Date();
    const formattedDate = this.formatDate(today);

    // 날짜 입력 필드 업데이트
    document.getElementById('quickStartDate').value = formattedDate;
    document.getElementById('quickEndDate').value = formattedDate;

    // 필터 상태 업데이트
    this.state.filters.date.start = formattedDate;
    this.state.filters.date.end = formattedDate;

    // 페이지 초기화 및 데이터 업데이트
    this.state.currentPage = 1;
    this.updateDashboard();
  },

  /**
   * 페이지 변경 처리
   */
  handlePageChange: function (direction) {
    const { currentPage } = this.state;
    const totalItems = this.state.filteredData.length;
    const { pageSize } = this.state;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    let newPage = currentPage;

    if (direction === 'prev' && currentPage > 1) {
      newPage = currentPage - 1;
    } else if (direction === 'next' && currentPage < totalPages) {
      newPage = currentPage + 1;
    }

    if (newPage !== currentPage) {
      this.state.currentPage = newPage;
      this.updateCurrentPageData();
      this.renderTable();
      this.updatePagination();
    }
  },

  /**
   * 페이지 크기 변경 처리
   */
  handlePageSizeChange: function (e) {
    const newPageSize = parseInt(e.target.value, 10);
    this.state.pageSize = newPageSize;
    this.state.currentPage = 1; // 페이지 사이즈 변경 시 첫 페이지로
    this.updateCurrentPageData();
    this.renderTable();
    this.updatePagination();
  },

  /**
   * 행 선택 처리
   */
  handleRowSelection: function (orderId, isChecked) {
    if (isChecked) {
      // 선택 항목에 추가 (중복 방지)
      if (!this.state.selectedItems.includes(orderId)) {
        this.state.selectedItems.push(orderId);
      }
    } else {
      // 선택 항목에서 제거
      this.state.selectedItems = this.state.selectedItems.filter(
        (id) => id !== orderId
      );
    }

    // 전체 선택 체크박스 상태 업데이트
    this.updateSelectAllCheckbox();
  },

  /**
   * 전체 선택 처리
   */
  handleSelectAll: function (e) {
    const isChecked = e.target.checked;

    if (isChecked) {
      // 현재 페이지의 모든 항목 선택
      this.state.selectedItems = this.state.currentData.map(
        (item) => item.order_no
      );
    } else {
      // 선택 항목 초기화
      this.state.selectedItems = [];
    }

    // 테이블 다시 렌더링
    this.renderTable();
  },

  /**
   * 전체 선택 체크박스 상태 업데이트
   */
  updateSelectAllCheckbox: function () {
    const selectAllCheckbox = document.getElementById('selectAll');
    const allSelected =
      this.state.currentData.length > 0 &&
      this.state.currentData.every((item) =>
        this.state.selectedItems.includes(item.order_no)
      );

    selectAllCheckbox.checked = allSelected;
  },

  /**
   * 행 클릭 처리 (상세 정보 모달 열기)
   */
  handleRowClick: function (item) {
    // 상세 정보 모달 내용 설정
    this.fillOrderDetailModal(item);

    // 모달 열기
    this.openModal('orderDetailModal');
  },

  /**
   * 주문 상세 정보 모달 채우기
   */
  fillOrderDetailModal: function (item) {
    if (!item) return;

    // 요소 업데이트 헬퍼 함수
    const updateElement = (id, value) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value || '-';
      }
    };

    // 기본 정보
    updateElement('detailOrderNo', item.order_no);
    updateElement('detailCustomer', item.customer);
    updateElement('detailType', this.getDeliveryTypeText(item.type));
    updateElement('detailStatus', this.getStatusText(item.status));
    updateElement('detailDepartment', item.department);
    updateElement('detailWarehouse', item.warehouse);

    // 시간 정보
    updateElement('detailCreateTime', this.formatDateTime(item.created_at));
    updateElement('detailDepartTime', this.formatDateTime(item.depart_time));
    updateElement(
      'detailCompleteTime',
      this.formatDateTime(item.complete_time)
    );
    updateElement('detailEta', this.formatDateTime(item.eta));

    // 배송 정보
    updateElement('detailPostalCode', item.postal_code);
    updateElement('detailAddress', item.address);
    updateElement('detailContact', item.phone);
    updateElement('detailDriver', item.driver_name);

    // 추가 정보
    updateElement('detailRemark', item.notes);
    updateElement('detailUpdateAt', this.formatDateTime(item.updated_at));
    updateElement('detailUpdatedBy', item.updated_by);

    // 현재 선택된 주문 저장
    this.selectedOrder = item;
  },

  /**
   * 새 주문 등록 처리
   */
  handleNewOrder: function () {
    // 폼 초기화
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
      orderForm.reset();
    }

    // 모달 제목 설정
    const orderModalTitle = document.getElementById('orderModalTitle');
    if (orderModalTitle) {
      orderModalTitle.textContent = '새 배송 주문 등록';
    }

    // 선택된 주문 초기화 (신규 모드)
    this.selectedOrder = null;

    // 모달 열기
    this.openModal('orderFormModal');
  },

  /**
   * 상태 변경 모달 열기
   */
  openStatusChangeModal: function () {
    // 선택된 항목이 없는 경우
    if (this.state.selectedItems.length === 0) {
      this.showMessage('상태를 변경할 항목을 선택해주세요.', 'warning');
      return;
    }

    // 모달 정보 업데이트
    document.getElementById('statusChangeCount').textContent =
      this.state.selectedItems.length;

    // 모달 열기
    this.openModal('statusChangeModal');
  },

  /**
   * 상태 변경 확인
   */
  confirmStatusChange: function () {
    // 선택된 상태 가져오기
    const statusSelect = document.getElementById('newStatusSelect');
    if (!statusSelect) {
      this.showMessage('상태 선택 필드를 찾을 수 없습니다.', 'error');
      return;
    }

    const newStatus = statusSelect.value;

    if (!newStatus) {
      this.showMessage('변경할 상태를 선택해주세요.', 'warning');
      return;
    }

    // 선택된 주문 상태 변경
    const selectedOrderIds = this.state.selectedItems;
    const now = new Date().toISOString();

    this.dashboardData.forEach((item) => {
      if (selectedOrderIds.includes(item.order_no)) {
        // 상태 변경
        item.status = newStatus;

        // 시간 필드 업데이트
        if (newStatus === 'IN_PROGRESS' && !item.depart_time) {
          item.depart_time = now; // 진행 중으로 변경 시 출발 시간 설정
        } else if (
          (newStatus === 'COMPLETED' || newStatus === 'ISSUE') &&
          !item.complete_time
        ) {
          item.complete_time = now; // 완료 또는 이슈로 변경 시 완료 시간 설정
        }

        // 업데이트 정보
        item.updated_at = now;
        item.updated_by = 'CSAdmin'; // 현재 사용자 (예시)
      }
    });

    // 모달 닫기
    this.closeModal('statusChangeModal');

    // 성공 메시지
    const count = selectedOrderIds.length;
    this.showMessage(
      `${count}개 주문의 상태가 '${this.getStatusText(
        newStatus
      )}'(으)로 변경되었습니다.`,
      'success'
    );

    // 선택 항목 초기화
    this.state.selectedItems = [];

    // 대시보드 업데이트
    this.updateDashboard();
  },

  /**
   * 담당자 지정 처리
   */
  handleAssign: function () {
    // 선택된 항목이 없는 경우
    if (this.state.selectedItems.length === 0) {
      this.showMessage('담당자를 지정할 항목을 선택해주세요.', 'warning');
      return;
    }

    // 담당자 이름 입력 받기
    const driverName = prompt('배송 담당자 이름을 입력해주세요.');

    if (driverName === null) {
      return; // 취소
    }

    if (driverName.trim() === '') {
      this.showMessage('담당자 이름을 입력해주세요.', 'warning');
      return;
    }

    // 선택된 주문에 담당자 지정
    const selectedOrderIds = this.state.selectedItems;
    const now = new Date().toISOString();

    this.dashboardData.forEach((item) => {
      if (selectedOrderIds.includes(item.order_no)) {
        // 담당자 지정
        item.driver_name = driverName.trim();

        // 업데이트 정보
        item.updated_at = now;
        item.updated_by = 'CSAdmin'; // 현재 사용자 (예시)
      }
    });

    // 성공 메시지
    const count = selectedOrderIds.length;
    this.showMessage(
      `${count}개 주문에 '${driverName}' 담당자가 지정되었습니다.`,
      'success'
    );

    // 선택 항목 초기화
    this.state.selectedItems = [];

    // 대시보드 업데이트
    this.updateDashboard();
  },

  /**
   * 주문 삭제 처리
   */
  handleDelete: function () {
    // 선택된 항목이 없는 경우
    if (this.state.selectedItems.length === 0) {
      this.showMessage('삭제할 항목을 선택해주세요.', 'warning');
      return;
    }

    // 삭제 확인
    const count = this.state.selectedItems.length;
    if (
      !confirm(
        `선택한 ${count}개의 주문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }

    // 선택된 항목 제거
    const selectedOrderIds = this.state.selectedItems;
    this.dashboardData = this.dashboardData.filter(
      (item) => !selectedOrderIds.includes(item.order_no)
    );

    // 선택 항목 초기화
    this.state.selectedItems = [];

    // 성공 메시지
    this.showMessage(`${count}개의 주문이 삭제되었습니다.`, 'success');

    // 대시보드 업데이트
    this.updateDashboard();
  },

  /**
   * 주문 수정 처리
   */
  handleEdit: function (orderId) {
    // 주문 ID가 없는 경우, 선택된 항목 확인
    if (!orderId && this.state.selectedItems.length !== 1) {
      this.showMessage('수정할 항목을 하나만 선택해주세요.', 'warning');
      return;
    }

    // 선택된 주문 찾기
    const selectedOrderId = orderId || this.state.selectedItems[0];
    const selectedOrder = this.dashboardData.find(
      (item) => item.order_no === selectedOrderId
    );

    if (!selectedOrder) {
      this.showMessage('선택한 주문을 찾을 수 없습니다.', 'error');
      return;
    }

    // 각 폼 필드 업데이트
    const updateField = (id, value) => {
      const field = document.getElementById(id);
      if (field) {
        field.value = value || '';
      }
    };

    // 폼 필드 채우기
    updateField('orderNo', selectedOrder.order_no);
    updateField('orderType', selectedOrder.type);
    updateField('department', selectedOrder.department);
    updateField('warehouse', selectedOrder.warehouse);
    updateField('eta', this.formatDateForInput(selectedOrder.eta));
    updateField('postalCode', selectedOrder.postal_code);
    updateField('address', selectedOrder.address);
    updateField('customer', selectedOrder.customer);
    updateField('contact', selectedOrder.phone);
    updateField('remark', selectedOrder.notes);

    // 모달 제목 설정
    const orderModalTitle = document.getElementById('orderModalTitle');
    if (orderModalTitle) {
      orderModalTitle.textContent = '배송 주문 수정';
    }

    // 현재 선택된 주문 저장 (수정 모드)
    this.selectedOrder = selectedOrder;

    // 모달 열기
    this.openModal('orderFormModal');
  },

  /**
   * 주문 수정 확인
   */
  confirmEditOrder: function () {
    // 폼 데이터 가져오기
    const form = document.getElementById('orderForm');
    if (!form) {
      this.showMessage('주문 폼을 찾을 수 없습니다.', 'error');
      return;
    }

    const formData = new FormData(form);

    // 필수 필드 검증
    const orderNo = formData.get('orderNo')?.trim() || '';
    const customer = formData.get('customer')?.trim() || '';
    const address = formData.get('address')?.trim() || '';

    if (!orderNo) {
      this.showMessage('주문번호를 입력해주세요.', 'warning');
      return;
    }

    if (!customer) {
      this.showMessage('고객명을 입력해주세요.', 'warning');
      return;
    }

    if (!address) {
      this.showMessage('주소를 입력해주세요.', 'warning');
      return;
    }

    // 새 주문 데이터 생성
    const newOrderData = {
      order_no: orderNo,
      type: formData.get('orderType') || 'DELIVERY',
      department: formData.get('department') || '',
      warehouse: formData.get('warehouse') || '',
      eta: formData.get('eta') || '',
      postal_code: formData.get('postalCode') || '',
      address: address,
      customer: customer,
      phone: formData.get('contact') || '',
      notes: formData.get('remark') || '',
    };

    // 신규 등록 모드
    if (!this.selectedOrder) {
      // 주문번호 중복 확인
      const isDuplicate = this.dashboardData.some(
        (item) => item.order_no === orderNo
      );
      if (isDuplicate) {
        this.showMessage('이미 존재하는 주문번호입니다.', 'warning');
        return;
      }

      // 신규 주문 추가 데이터 설정
      newOrderData.status = 'WAITING'; // 기본 상태: 대기 중
      newOrderData.created_at = new Date().toISOString();
      newOrderData.updated_at = new Date().toISOString();
      newOrderData.updated_by = 'CSAdmin'; // 현재 사용자 (예시)

      // 데이터 추가
      this.dashboardData.unshift(newOrderData);

      this.showMessage('주문이 성공적으로 등록되었습니다.', 'success');
    } else {
      // 수정 모드
      // 기존 항목 찾기
      const index = this.dashboardData.findIndex(
        (item) => item.order_no === this.selectedOrder.order_no
      );

      if (index === -1) {
        this.showMessage('수정할 주문을 찾을 수 없습니다.', 'error');
        return;
      }

      // 기존 데이터 유지 (수정되지 않는 필드)
      newOrderData.status = this.selectedOrder.status;
      newOrderData.created_at = this.selectedOrder.created_at;
      newOrderData.depart_time = this.selectedOrder.depart_time;
      newOrderData.complete_time = this.selectedOrder.complete_time;
      newOrderData.driver_name = this.selectedOrder.driver_name;

      // 업데이트 정보
      newOrderData.updated_at = new Date().toISOString();
      newOrderData.updated_by = 'CSAdmin'; // 현재 사용자 (예시)

      // 데이터 업데이트
      this.dashboardData[index] = newOrderData;

      this.showMessage('주문이 성공적으로 수정되었습니다.', 'success');
    }

    // 모달 닫기
    this.closeModal('orderFormModal');

    // 대시보드 업데이트
    this.updateDashboard();
  },

  /**
   * 클립보드에 복사
   */
  copyToClipboard: function (text) {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          this.showMessage('클립보드에 복사되었습니다.', 'success');
        })
        .catch(() => {
          this.showMessage('클립보드 복사에 실패했습니다.', 'error');
        });
    } else {
      // 폴백 방법
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          this.showMessage('클립보드에 복사되었습니다.', 'success');
        } else {
          this.showMessage('클립보드 복사에 실패했습니다.', 'error');
        }
      } catch (err) {
        this.showMessage('클립보드 복사 중 오류가 발생했습니다.', 'error');
      }

      document.body.removeChild(textarea);
    }
  },

  /**
   * 모달 열기
   */
  openModal: function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
    }
  },

  /**
   * 모달 닫기
   */
  closeModal: function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  },

  /**
   * 메시지 표시
   */
  showMessage: function (message, type = 'info') {
    if (typeof messageUtils !== 'undefined' && messageUtils.showMessage) {
      messageUtils.showMessage(message, type);
    } else {
      alert(message);
    }
  },

  /**
   * 날짜 포맷팅
   */
  formatDate: function (dateStr) {
    if (!dateStr) return '';

    try {
      const date = new Date(dateStr);

      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return dateStr;
      }

      return date.toLocaleDateString('ko-KR');
    } catch (e) {
      console.warn('날짜 포맷팅 오류:', e);
      return dateStr;
    }
  },

  /**
   * 날짜/시간 포맷팅
   */
  formatDateTime: function (dateStr) {
    if (!dateStr) return '';

    try {
      const date = new Date(dateStr);

      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return dateStr;
      }

      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.warn('날짜/시간 포맷팅 오류:', e);
      return dateStr;
    }
  },

  /**
   * 입력 필드용 날짜 포맷팅
   */
  formatDateForInput: function (dateStr) {
    if (!dateStr) return '';

    try {
      const date = new Date(dateStr);

      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return '';
      }

      // YYYY-MM-DD 형식으로 반환
      return date.toISOString().split('T')[0];
    } catch (e) {
      console.warn('날짜 포맷팅 오류:', e);
      return '';
    }
  },

  /**
   * 상태 텍스트 반환
   */
  getStatusText: function (status) {
    const statusMap = {
      WAITING: '대기',
      IN_PROGRESS: '진행',
      COMPLETED: '완료',
      CANCELLED: '취소',
      ISSUE: '이슈',
    };

    return statusMap[status] || status;
  },

  /**
   * 상태 CSS 클래스 반환
   */
  getStatusClass: function (status) {
    const classMap = {
      WAITING: 'bg-yellow',
      IN_PROGRESS: 'bg-blue',
      COMPLETED: 'bg-green',
      CANCELLED: 'bg-gray',
      ISSUE: 'bg-red',
    };

    return classMap[status] || '';
  },

  /**
   * 배송 유형 텍스트 반환
   */
  getDeliveryTypeText: function (type) {
    const typeMap = {
      DELIVERY: '배송',
      RETURN: '반품',
    };

    return typeMap[type] || type;
  },

  /**
   * HTML 이스케이프
   */
  escapeHTML: function (text) {
    if (!text) return '';
    return text
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * 표시할 컬럼 정보 로드 (로컬 스토리지)
   */
  loadVisibleColumns: function () {
    // 로컬 스토리지에서 사용자 설정 로드
    const savedColumns = localStorage.getItem('dashboardVisibleColumns');

    if (savedColumns) {
      try {
        this.state.visibleColumns = JSON.parse(savedColumns);
      } catch (e) {
        console.error('컬럼 설정 로드 오류:', e);
        this.resetToDefaultColumns();
      }
    } else {
      // 기본 컬럼 설정
      this.resetToDefaultColumns();
    }
  },

  /**
   * 기본 컬럼으로 초기화
   */
  resetToDefaultColumns: function () {
    this.state.visibleColumns = this.ALL_COLUMNS.filter(
      (col) => col.default
    ).map((col) => col.key);

    // 로컬 스토리지에 저장
    this.saveVisibleColumns();
  },

  /**
   * 컬럼 설정 저장
   */
  saveVisibleColumns: function () {
    localStorage.setItem(
      'dashboardVisibleColumns',
      JSON.stringify(this.state.visibleColumns)
    );
  },

  /**
   * 컬럼 설정 모달 열기
   */
  openColumnSettings: function () {
    // 컬럼 설정 모달 내용 생성
    const modalBody = document.querySelector(
      '#columnSettingsModal .modal-body'
    );
    if (!modalBody) return;

    // 모달 내용 초기화
    modalBody.innerHTML = '';

    // 컬럼 옵션 생성
    this.ALL_COLUMNS.forEach((column) => {
      const isChecked = this.state.visibleColumns.includes(column.key);

      const columnOption = document.createElement('div');
      columnOption.className = 'column-option';
      columnOption.innerHTML = `
        <label>
          <input type="checkbox" name="column" value="${column.key}" ${
        isChecked ? 'checked' : ''
      }>
          ${column.label}
        </label>
      `;

      modalBody.appendChild(columnOption);
    });

    // 모달 열기
    this.openModal('columnSettingsModal');
  },

  /**
   * 컬럼 설정 저장 (모달)
   */
  saveColumnSettingsFromModal: function () {
    // 체크된 컬럼 가져오기
    const checkboxes = document.querySelectorAll(
      '#columnSettingsModal input[name="column"]:checked'
    );

    // 선택된 컬럼 배열로 변환
    const selectedColumns = Array.from(checkboxes).map(
      (checkbox) => checkbox.value
    );

    // 최소 1개 이상 선택 강제
    if (selectedColumns.length === 0) {
      this.showMessage('최소 1개 이상의 컬럼을 선택해주세요.', 'warning');
      return;
    }

    // 상태 업데이트
    this.state.visibleColumns = selectedColumns;

    // 로컬 스토리지에 저장
    this.saveVisibleColumns();

    // 대시보드 업데이트
    this.updateDashboard();

    // 모달 닫기
    this.closeModal('columnSettingsModal');

    // 알림
    this.showMessage('컬럼 설정이 저장되었습니다.', 'success');
  },
};

// 전역 객체에 페이지 모듈 할당
window.DashboardPage = DashboardPage;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function () {
  DashboardPage.init();
});

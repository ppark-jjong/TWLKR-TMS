/**
 * 대시보드 페이지 모듈
 */
const DashboardPage = {
  // 페이지 상태 관리
  state: {
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    currentData: [],
    filteredData: [],
    selectedItems: [],
    filters: {
      status: '',
      department: '',
      warehouse: '',
      keyword: '',
      startDate: '',
      endDate: '',
    },
  },

  /**
   * 페이지 초기화
   */
  init: function () {
    console.log('대시보드 페이지 초기화...');

    // 모달 관련 상태 초기화
    this.selectedOrderForAssign = null;
    this.selectedHandoverId = null;

    // 이벤트 리스너 등록
    this.registerEventListeners();

    // 날짜 필터 초기화
    this.initDateFilter();

    // 데이터 로드되었으면 테이블 업데이트
    if (DataManager.isDataLoaded()) {
      this.updateDashboard();
    } else {
      // 데이터 로드 대기
      document.addEventListener('data:loaded', () => {
        this.updateDashboard();
      });
    }

    // 데이터 변경 이벤트 리스닝
    document.addEventListener('data:dashboardChanged', () => {
      this.updateDashboard();
    });
    
    // 모달 이벤트 리스닝
    document.addEventListener('modal:opened', (e) => {
      console.log(`모달 열림: ${e.detail.modalId}`);
    });
    
    document.addEventListener('modal:closed', (e) => {
      console.log(`모달 닫힘: ${e.detail.modalId}`);
    });
  },

  /**
   * 이벤트 리스너 등록
   */
  registerEventListeners: function () {
    // 필터 관련 이벤트
    document
      .getElementById('statusFilter')
      .addEventListener('change', this.handleFilterChange.bind(this));
    document
      .getElementById('departmentFilter')
      .addEventListener('change', this.handleFilterChange.bind(this));
    document
      .getElementById('warehouseFilter')
      .addEventListener('change', this.handleFilterChange.bind(this));

    document.getElementById('searchKeyword').addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
      }
    });

    document
      .getElementById('searchBtn')
      .addEventListener('click', this.handleSearch.bind(this));
    document
      .getElementById('applyFilterBtn')
      .addEventListener('click', this.applyFilters.bind(this));
    document
      .getElementById('resetBtn')
      .addEventListener('click', this.resetFilters.bind(this));

    // 날짜 필터
    document
      .getElementById('quickDateBtn')
      .addEventListener('click', this.applyDateFilter.bind(this));
    document
      .getElementById('todayBtn')
      .addEventListener('click', this.applyTodayFilter.bind(this));

    // 테이블 액션 버튼
    document
      .getElementById('refreshBtn')
      .addEventListener('click', this.refreshData.bind(this));
    document
      .getElementById('changeStatusBtn')
      .addEventListener('click', this.openStatusChangeModal.bind(this));
    document
      .getElementById('assignBtn')
      .addEventListener('click', this.handleAssign.bind(this));
    document
      .getElementById('newOrderBtn')
      .addEventListener('click', this.handleNewOrder.bind(this));
    document
      .getElementById('deleteOrderBtn')
      .addEventListener('click', this.handleDelete.bind(this));

    // 전체 선택 체크박스
    document
      .getElementById('selectAll')
      .addEventListener('change', this.handleSelectAll.bind(this));

    // 페이지네이션
    document.querySelectorAll('.page-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const direction = e.currentTarget.getAttribute('data-page');
        this.handlePageChange(direction);
      });
    });

    document
      .getElementById('pageSize')
      .addEventListener('change', this.handlePageSizeChange.bind(this));

    // 테이블 행 이벤트 설정
    DOMUtils.setupTableRowEvents(
      document.getElementById('dashboardTable'),
      this.openDetailModal.bind(this),
      this.handleRowCheckboxChange.bind(this)
    );
    
    // 복사 버튼 이벤트 설정
    document.getElementById('dashboardTable').addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.copy-btn');
      if (copyBtn) {
        e.stopPropagation(); // 행 클릭 이벤트 중지
        const orderId = copyBtn.getAttribute('data-order');
        this.copyToClipboard(orderId);
      }
    });

    // 모달 버튼
    document
      .getElementById('confirmStatusChangeBtn')
      .addEventListener('click', this.handleStatusChange.bind(this));
    document
      .getElementById('editOrderBtn')
      .addEventListener('click', this.handleEdit.bind(this));
    document
      .getElementById('confirmNewOrderBtn')
      .addEventListener('click', this.submitNewOrder.bind(this));
    document
      .getElementById('confirmAssignBtn')
      .addEventListener('click', this.confirmAssign.bind(this));
    document
      .getElementById('confirmEditOrderBtn')
      .addEventListener('click', this.confirmEditOrder.bind(this));
  },

  /**
   * 날짜 필터 초기화
   */
  initDateFilter: function () {
    const today = new Date();
    const endDateStr = DateUtils.formatDate(today);

    // 7일 전
    const startDate = new Date();
    startDate.setDate(today.getDate() - 7);
    const startDateStr = DateUtils.formatDate(startDate);

    // 초기값 설정
    document.getElementById('quickStartDate').value = startDateStr;
    document.getElementById('quickEndDate').value = endDateStr;

    // 필터 상태 업데이트
    this.state.filters.startDate = startDateStr;
    this.state.filters.endDate = endDateStr;
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
    document.getElementById('selectAll').checked = false;
  },

  /**
   * 필터링된 데이터 업데이트
   */
  updateFilteredData: function () {
    console.log('필터링 시작:', this.state.filters);

    // 데이터 매니저로부터 필터링된 데이터 가져오기
    this.state.filteredData = DataManager.getDashboardData(this.state.filters);
    console.log(`최종 필터링된 데이터: ${this.state.filteredData.length}건`);

    // ETA 오름차순으로 정렬
    this.state.filteredData.sort((a, b) => {
      // ETA가 없는 경우 맨 뒤로 정렬
      if (!a.eta) return 1;
      if (!b.eta) return -1;

      // ETA 날짜 기준 오름차순 정렬
      return new Date(a.eta) - new Date(b.eta);
    });
  },

  /**
   * 요약 카드 업데이트
   */
  updateSummaryCards: function () {
    // 데이터가 없거나 undefined인 경우 처리
    if (!this.state.filteredData || this.state.filteredData.length === 0) {
      document.getElementById('totalOrders').textContent = "0건";
      document.getElementById('inProgressOrders').textContent = "0건";
      document.getElementById('progressOrders').textContent = "0건";
      document.getElementById('completedOrders').textContent = "0건";
      document.getElementById('pendingOrders').textContent = "0건";
      document.getElementById('etcOrders').textContent = "0건";
      return;
    }

    // 전체 주문 수
    const totalOrders = this.state.filteredData.length;
    document.getElementById('totalOrders').textContent = `${totalOrders}건`;

    // 배송 유형별 카운트
    const deliveryOrders = this.state.filteredData.filter(
      (item) => item.type === 'DELIVERY'
    ).length;
    const pickupOrders = this.state.filteredData.filter(
      (item) => item.type === 'PICKUP' || item.type === 'RETURN'
    ).length; // PICKUP 또는 RETURN으로 저장될 수 있음
    document.getElementById(
      'inProgressOrders'
    ).textContent = `${pickupOrders}건`;

    // 상태별 카운트
    const progressOrders = this.state.filteredData.filter(
      (item) => item.status === 'IN_PROGRESS'
    ).length;
    const completedOrders = this.state.filteredData.filter(
      (item) => item.status === 'COMPLETE'
    ).length;
    const pendingOrders = this.state.filteredData.filter(
      (item) => item.status === 'PENDING'
    ).length;
    const cancelOrders = this.state.filteredData.filter(
      (item) => item.status === 'CANCEL'
    ).length;
    const issueOrders = this.state.filteredData.filter(
      (item) => item.status === 'ISSUE'
    ).length;

    document.getElementById(
      'progressOrders'
    ).textContent = `${progressOrders}건`;
    document.getElementById(
      'completedOrders'
    ).textContent = `${completedOrders}건`;
    document.getElementById(
      'pendingOrders'
    ).textContent = `${pendingOrders}건`;
    document.getElementById(
      'etcOrders'
    ).textContent = `${cancelOrders + issueOrders}건`;
  },

  /**
   * 현재 페이지 데이터 업데이트
   */
  updateCurrentPageData: function () {
    const { currentPage, pageSize } = this.state;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;

    this.state.currentData = this.state.filteredData.slice(start, end);
    this.state.totalPages =
      Math.ceil(this.state.filteredData.length / pageSize) || 1;
  },

  /**
   * 테이블 렌더링
   */
  renderTable: function () {
    const tableBody = document.getElementById('dashboardTableBody');
    const totalColumns = 9; // 전체 열 수 (체크박스 포함)

    // 테이블 내용 초기화
    tableBody.innerHTML = '';

    // 데이터가 없는 경우
    if (this.state.currentData.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML =
        `<td colspan="${totalColumns}" class="empty-table">조회된 데이터가 없습니다.</td>`;
      tableBody.appendChild(emptyRow);
      return;
    }

    // 데이터 행 추가
    this.state.currentData.forEach((item) => {
      // 상태에 따른 행 클래스 추가
      const statusClassMap = {
        PENDING: 'status-pending',
        IN_PROGRESS: 'status-progress',
        COMPLETE: 'status-complete',
        ISSUE: 'status-issue',
        CANCEL: 'status-cancel',
      };

      const row = document.createElement('tr');
      row.setAttribute('data-id', item.order_no);
      // 상태별 행 색상 클래스 추가
      row.className = statusClassMap[item.status] || '';

      // 체크박스 셀
      const checkboxCell = document.createElement('td');
      checkboxCell.className = 'checkbox-cell';
      checkboxCell.innerHTML = `<input type="checkbox" class="row-checkbox" data-id="${item.order_no}">`;
      row.appendChild(checkboxCell);

      // 주문번호 셀 - 복사 버튼 추가
      const orderCell = document.createElement('td');
      orderCell.className = 'order-cell';
      orderCell.innerHTML = `
        <div style="display: flex; align-items: center;">
          <span class="order-number">${DOMUtils.escapeHTML(item.order_no)}</span>
          <button class="copy-btn" data-order="${DOMUtils.escapeHTML(item.order_no)}" title="주문번호 복사" style="margin-left: 5px; background: none; border: none; cursor: pointer; color: #1890ff; font-size: 0.8rem;">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
      `;
      row.appendChild(orderCell);

      // 고객 셀
      const customerCell = document.createElement('td');
      customerCell.textContent = item.customer || '-';
      row.appendChild(customerCell);

      // 유형 셀
      const typeCell = document.createElement('td');
      typeCell.textContent = item.type === 'DELIVERY' ? '배송' : '회수';
      row.appendChild(typeCell);

      // 상태 셀 - 배지 스타일 없이 단순 텍스트로 표시
      const statusText = StatusUtils.getStatusText(item.status);
      const statusCell = document.createElement('td');
      statusCell.textContent = statusText;
      row.appendChild(statusCell);

      // 부서 셀
      const deptCell = document.createElement('td');
      deptCell.textContent = item.department || '-';
      row.appendChild(deptCell);

      // 창고 셀
      const warehouseCell = document.createElement('td');
      warehouseCell.textContent = item.warehouse || '-';
      row.appendChild(warehouseCell);

      // ETA 셀
      const etaCell = document.createElement('td');
      if (item.eta) {
        const etaDate = new Date(item.eta);
        etaCell.textContent = etaDate.toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      } else {
        etaCell.textContent = '-';
      }
      row.appendChild(etaCell);

      // 배송기사 셀
      const driverCell = document.createElement('td');
      driverCell.textContent = item.driver_name || '-';
      row.appendChild(driverCell);

      tableBody.appendChild(row);
    });

    // 체크박스 상태 업데이트
    DOMUtils.updateCheckboxStates(
      document.getElementById('dashboardTable'),
      this.state.selectedItems
    );
  },

  /**
   * 페이지네이션 업데이트
   */
  updatePagination: function () {
    document.getElementById(
      'pageInfo'
    ).textContent = `${this.state.currentPage} / ${this.state.totalPages}`;
  },

  /**
   * 행 체크박스 변경 처리
   */
  handleRowCheckboxChange: function (checkbox, orderId) {
    if (!orderId) return;

    if (checkbox.checked) {
      if (!this.state.selectedItems.includes(orderId)) {
        this.state.selectedItems.push(orderId);
      }
    } else {
      this.state.selectedItems = this.state.selectedItems.filter(
        (id) => id !== orderId
      );
    }

    // 전체 선택 체크박스 상태 업데이트
    const allSelected =
      this.state.currentData.length > 0 &&
      this.state.selectedItems.length === this.state.currentData.length;
    document.getElementById('selectAll').checked = allSelected;
  },

  /**
   * 전체 선택 체크박스 처리
   */
  handleSelectAll: function (e) {
    const selectAll = e.target.checked;

    if (selectAll) {
      // 현재 페이지의 모든 항목 선택
      this.state.selectedItems = this.state.currentData.map(
        (item) => item.order_no
      );
    } else {
      // 선택 해제
      this.state.selectedItems = [];
    }

    // 체크박스 업데이트
    DOMUtils.updateCheckboxStates(
      document.getElementById('dashboardTable'),
      this.state.selectedItems
    );
  },

  /**
   * 페이지 변경 처리
   */
  handlePageChange: function (direction) {
    if (direction === 'prev' && this.state.currentPage > 1) {
      this.state.currentPage--;
    } else if (
      direction === 'next' &&
      this.state.currentPage < this.state.totalPages
    ) {
      this.state.currentPage++;
    }

    this.updateCurrentPageData();
    this.renderTable();
    this.updatePagination();
  },

  /**
   * 페이지 크기 변경 처리
   */
  handlePageSizeChange: function (e) {
    this.state.pageSize = parseInt(e.target.value, 10);
    this.state.currentPage = 1;

    this.updateCurrentPageData();
    this.renderTable();
    this.updatePagination();
  },

  /**
   * 필터 변경 처리
   */
  handleFilterChange: function (e) {
    const filter = e.target.id.replace('Filter', '');
    const value = e.target.value;

    if (filter === 'status') {
      this.state.filters.status = value;
    } else if (filter === 'department') {
      this.state.filters.department = value;
    } else if (filter === 'warehouse') {
      this.state.filters.warehouse = value;
    }
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
   * 필터 적용 처리
   */
  applyFilters: function () {
    // 현재 상태의 필터 적용
    this.state.currentPage = 1;
    this.updateDashboard();

    MessageManager.success('필터가 적용되었습니다.');
  },

  /**
   * 필터 초기화 처리
   */
  resetFilters: function () {
    // 필터 초기화
    document.getElementById('statusFilter').value = '';
    document.getElementById('departmentFilter').value = '';
    document.getElementById('warehouseFilter').value = '';
    document.getElementById('searchKeyword').value = '';

    this.state.filters = {
      status: '',
      department: '',
      warehouse: '',
      keyword: '',
      startDate: this.state.filters.startDate,
      endDate: this.state.filters.endDate,
    };

    this.state.currentPage = 1;
    this.updateDashboard();

    MessageManager.success('필터가 초기화되었습니다.');
  },

  /**
   * 날짜 필터 적용 처리
   */
  applyDateFilter: function () {
    const startDate = document.getElementById('quickStartDate').value;
    const endDate = document.getElementById('quickEndDate').value;

    if (!startDate || !endDate) {
      MessageManager.warning('시작일과 종료일을 모두 입력해주세요.');
      return;
    }

    console.log(`날짜 필터 적용: ${startDate} ~ ${endDate}`);
    this.state.filters.startDate = startDate;
    this.state.filters.endDate = endDate;

    this.state.currentPage = 1;
    this.updateDashboard();

    MessageManager.success('날짜 필터가 적용되었습니다.');
  },
  
  /**
   * 오늘 날짜 필터 적용
   */
  applyTodayFilter: function () {
    const today = new Date();
    const todayStr = DateUtils.formatDate(today);
    
    console.log(`오늘 날짜 필터 적용: ${todayStr}`);
    
    // 날짜 필드에 오늘 날짜 설정
    document.getElementById('quickStartDate').value = todayStr;
    document.getElementById('quickEndDate').value = todayStr;
    
    // 필터 상태 업데이트
    this.state.filters.startDate = todayStr;
    this.state.filters.endDate = todayStr;
    
    this.state.currentPage = 1;
    this.updateDashboard();
    
    MessageManager.success('오늘 날짜 필터가 적용되었습니다.');
  },

  /**
   * 데이터 새로고침 처리
   */
  refreshData: function () {
    // 로딩 표시
    document.getElementById('loadingOverlay').style.display = 'flex';

    // 데이터 다시 로드
    DataManager.loadData().then(() => {
      // 로딩 완료 후 업데이트
      this.updateDashboard();
      document.getElementById('loadingOverlay').style.display = 'none';
      MessageManager.success('데이터가 새로고침되었습니다.');
    });
  },

  /**
   * 상세 모달 열기
   */
  openDetailModal: function (orderId) {
    const item = DataManager.getDashboardItemById(orderId);

    if (!item) {
      MessageManager.error('주문 정보를 찾을 수 없습니다.');
      return;
    }

    // 모달 데이터 채우기
    document.getElementById('detailOrderId').textContent = item.order_no || '-';

    const statusText = StatusUtils.getStatusText(item.status);
    const statusClass = StatusUtils.getStatusClass(item.status);
    document.getElementById(
      'detailStatus'
    ).innerHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;

    document.getElementById('detailCustomer').textContent =
      item.customer || '-';
    document.getElementById('detailType').textContent =
      item.type === 'DELIVERY' ? '배송' : '회수';
    document.getElementById('detailDepartment').textContent =
      item.department || '-';
    document.getElementById('detailWarehouse').textContent =
      item.warehouse || '-';
    document.getElementById('detailSla').textContent = item.sla || '-';
    document.getElementById('detailPostalCode').textContent =
      item.postal_code || '-';

    document.getElementById('detailEta').textContent = DateUtils.formatDateTime(item.eta);
    document.getElementById('detailCreateTime').textContent = DateUtils.formatDateTime(
      item.create_time
    );
    document.getElementById('detailDepartTime').textContent = DateUtils.formatDateTime(
      item.depart_time
    );
    document.getElementById('detailCompleteTime').textContent = DateUtils.formatDateTime(
      item.complete_time
    );

    document.getElementById('detailDriver').textContent =
      item.driver_name || '-';
    document.getElementById('detailDriverContact').textContent =
      item.driver_contact || '-';
    document.getElementById('detailAddress').textContent = item.address || '-';
    document.getElementById('detailContact').textContent = item.contact || '-';
    document.getElementById('detailMemo').textContent = item.remark || '-';

    document.getElementById('detailUpdateAt').textContent = DateUtils.formatDateTime(
      item.update_at
    );
    document.getElementById('detailUpdatedBy').textContent =
      item.updated_by || '-';

    // 모달 열기
    ModalManager.openModal('orderDetailModal');
  },

  /**
   * 상태 변경 모달 열기
   */
  openStatusChangeModal: function () {
    // 선택된 항목 확인
    if (this.state.selectedItems.length === 0) {
      MessageManager.warning('상태를 변경할 항목을 선택해주세요.');
      return;
    }

    // 모달 열기
    ModalManager.openModal('statusChangeModal');
  },

  /**
   * 상태 변경 처리
   */
  handleStatusChange: function () {
    // 새 상태
    const newStatus = document.getElementById('newStatus').value;

    if (!newStatus) {
      MessageManager.warning('변경할 상태를 선택해주세요.');
      return;
    }

    // 상태 변경 처리
    let successCount = 0;

    this.state.selectedItems.forEach((orderId) => {
      // 현재 주문 상태 확인
      const orderItem = DataManager.getDashboardItemById(orderId);
      if (!orderItem) return;

      // 현재 상태와 같은 경우 스킵 (불필요한 업데이트 방지)
      if (orderItem.status === newStatus) {
        return;
      }

      // 특정 상태로 변경 시 추가 처리
      let updateData = { status: newStatus };

      // 진행 상태로 변경할 때 출발 시간 자동 설정 (만약 없는 경우)
      if (newStatus === 'IN_PROGRESS' && !orderItem.depart_time) {
        updateData.depart_time = new Date().toISOString();
      }

      // 완료 또는 이슈 상태로 변경할 때 완료 시간 자동 설정
      if (
        (newStatus === 'COMPLETE' || newStatus === 'ISSUE') &&
        !orderItem.complete_time
      ) {
        updateData.complete_time = new Date().toISOString();
      }

      const result = DataManager.updateDashboardItem(orderId, updateData);

      if (result) {
        successCount++;
      }
    });

    // 모달 닫기
    ModalManager.closeModal('statusChangeModal');

    // 결과 알림
    if (successCount > 0) {
      MessageManager.success(`${successCount}건의 주문 상태가 변경되었습니다.`);
    } else if (this.state.selectedItems.length > 0) {
      MessageManager.info('변경된 주문이 없습니다.');
    } else {
      MessageManager.error('상태 변경에 실패했습니다.');
    }

    // 선택된 항목 초기화
    this.state.selectedItems = [];
    document.getElementById('selectAll').checked = false;
  },

  /**
   * 배차 처리 모달 열기
   */
  handleAssign: function () {
    // 선택된 항목 확인
    if (this.state.selectedItems.length === 0) {
      MessageManager.warning('배차 처리할 항목을 선택해주세요.');
      return;
    }

    // 한 번에 하나의 항목만 배차 처리 가능
    if (this.state.selectedItems.length > 1) {
      MessageManager.warning('배차 처리는 한 번에 하나의 항목만 가능합니다.');
      return;
    }

    // 선택된 항목 정보 가져오기
    const orderId = this.state.selectedItems[0];
    const order = DataManager.getDashboardItemById(orderId);

    if (!order) {
      MessageManager.error('주문 정보를 찾을 수 없습니다.');
      return;
    }

    // 기존 값이 있으면 입력 필드에 설정
    document.getElementById('driverName').value = order.driver_name || '';
    document.getElementById('driverContact').value = order.driver_contact || '';

    // 선택된 주문 ID 저장
    this.selectedOrderForAssign = orderId;

    // 모달 열기
    ModalManager.openModal('assignDriverModal');
  },

  /**
   * 배차 처리 확인
   */
  confirmAssign: function () {
    if (!this.selectedOrderForAssign) {
      MessageManager.warning('배차 처리할 주문을 선택해주세요.');
      return;
    }

    // 입력 값 가져오기
    const driverName = document.getElementById('driverName').value.trim();
    const driverContact = document.getElementById('driverContact').value.trim();

    // 기사 이름은 필수
    if (!driverName) {
      MessageManager.warning('기사 이름을 입력해주세요.');
      return;
    }

    // 배차 처리 - 기사 정보만 업데이트 (상태 자동 변경 금지)
    const updateData = {
      driver_name: driverName,
      driver_contact: driverContact || null
    };

    const result = DataManager.updateDashboardItem(
      this.selectedOrderForAssign,
      updateData
    );

    // 모달 닫기
    ModalManager.closeModal('assignDriverModal');

    // 결과 알림
    if (result) {
      MessageManager.success('배차 처리가 완료되었습니다.');
      // 선택된 항목 초기화
      this.state.selectedItems = [];
      document.getElementById('selectAll').checked = false;
    } else {
      MessageManager.error('배차 처리에 실패했습니다.');
    }

    // 필드 초기화
    document.getElementById('driverName').value = '';
    document.getElementById('driverContact').value = '';

    // 선택된 주문 ID 초기화
    this.selectedOrderForAssign = null;
  },

  /**
   * 신규 등록 모달 열기
   */
  handleNewOrder: function () {
    // 현재 날짜/시간 설정
    const now = new Date();
    // 현재 시간 + 4시간으로 기본 ETA 설정
    const defaultEta = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    // ISO 형식으로 변환 (datetime-local 입력에 적합한 형식)
    const defaultEtaString = defaultEta.toISOString().slice(0, 16);

    // 입력 필드 초기화
    document.getElementById('newOrderNo').value = '';
    document.getElementById('newType').value = 'DELIVERY';
    document.getElementById('newDepartment').value = 'CS';
    document.getElementById('newWarehouse').value = 'SEOUL';
    document.getElementById('newSla').value = '4HR(24X7)';
    document.getElementById('newEta').value = defaultEtaString;
    document.getElementById('newPostalCode').value = '';
    document.getElementById('newCustomer').value = '';
    document.getElementById('newAddress').value = '';
    document.getElementById('newContact').value = '';
    document.getElementById('newRemark').value = '';

    // 모달 열기
    ModalManager.openModal('newOrderModal');
  },

  /**
   * 신규 주문 등록 제출
   */
  submitNewOrder: function () {
    // 필수 입력 필드 검증
    const orderNo = document.getElementById('newOrderNo').value.trim();
    const type = document.getElementById('newType').value;
    const department = document.getElementById('newDepartment').value;
    const warehouse = document.getElementById('newWarehouse').value;
    const sla = document.getElementById('newSla').value;
    const eta = document.getElementById('newEta').value;
    const postalCode = document.getElementById('newPostalCode').value.trim();
    const customer = document.getElementById('newCustomer').value.trim();
    const address = document.getElementById('newAddress').value.trim();
    const contact = document.getElementById('newContact').value.trim();
    const remark = document.getElementById('newRemark').value.trim();

    // 필수 필드 확인
    if (
      !orderNo ||
      !type ||
      !department ||
      !warehouse ||
      !sla ||
      !eta ||
      !postalCode ||
      !customer ||
      !address
    ) {
      MessageManager.warning('필수 입력 항목을 모두 입력해주세요.');
      return;
    }

    // 새 주문 객체 생성
    const newOrder = {
      order_no: orderNo,
      type: type,
      status: 'PENDING', // 기본 상태: 대기
      department: department,
      warehouse: warehouse,
      sla: sla,
      eta: new Date(eta).toISOString(),
      postal_code: postalCode,
      address: address,
      customer: customer,
      contact: contact || null,
      remark: remark || null,
      create_time: new Date().toISOString()
    };

    // 이미 존재하는 주문번호인지 확인
    const existingOrder = DataManager.getDashboardItemById(orderNo);
    if (existingOrder) {
      MessageManager.error('이미 존재하는 주문번호입니다.');
      return;
    }

    // 데이터 추가
    const result = DataManager.updateDashboardItem(orderNo, newOrder);

    // 모달 닫기
    ModalManager.closeModal('newOrderModal');

    // 성공 메시지
    if (result) {
      MessageManager.success('새 주문이 등록되었습니다.');
    } else {
      MessageManager.error('주문 등록에 실패했습니다.');
    }
  },

  /**
   * 주문 삭제 처리
   */
  handleDelete: function () {
    // 선택된 항목 확인
    if (this.state.selectedItems.length === 0) {
      MessageManager.warning('삭제할 항목을 선택해주세요.');
      return;
    }

    if (
      !confirm(
        `선택한 ${this.state.selectedItems.length}건의 주문을 삭제하시겠습니까?`
      )
    ) {
      return;
    }

    // 선택된 항목 삭제
    let successCount = 0;
    this.state.selectedItems.forEach(orderId => {
      if (DataManager.deleteDashboardItem(orderId)) {
        successCount++;
      }
    });

    MessageManager.success(
      `${successCount}건의 주문이 삭제되었습니다.`
    );
    this.state.selectedItems = [];
  },

  /**
   * 주문 수정 모달 열기
   */
  handleEdit: function () {
    const orderId = document.getElementById('detailOrderId').textContent;
    if (orderId === '-') {
      return;
    }

    // 주문 정보 가져오기
    const orderItem = DataManager.getDashboardItemById(orderId);
    if (!orderItem) {
      MessageManager.error('주문 정보를 찾을 수 없습니다.');
      return;
    }

    // 모달 필드 초기화
    document.getElementById('editOrderId').value = orderItem.order_no;
    document.getElementById('editOrderNo').value = orderItem.order_no;
    document.getElementById('editType').value = orderItem.type || 'DELIVERY';
    document.getElementById('editDepartment').value =
      orderItem.department || 'CS';
    document.getElementById('editWarehouse').value =
      orderItem.warehouse || 'SEOUL';
    document.getElementById('editSla').value = orderItem.sla || '4HR(24X7)';
    document.getElementById('editStatus').value = orderItem.status || 'PENDING';

    // ETA 날짜 변환 (datetime-local 형식으로)
    if (orderItem.eta) {
      const etaDate = new Date(orderItem.eta);
      const year = etaDate.getFullYear();
      const month = String(etaDate.getMonth() + 1).padStart(2, '0');
      const day = String(etaDate.getDate()).padStart(2, '0');
      const hours = String(etaDate.getHours()).padStart(2, '0');
      const minutes = String(etaDate.getMinutes()).padStart(2, '0');

      document.getElementById(
        'editEta'
      ).value = `${year}-${month}-${day}T${hours}:${minutes}`;
    } else {
      document.getElementById('editEta').value = '';
    }

    document.getElementById('editPostalCode').value =
      orderItem.postal_code || '';
    document.getElementById('editCustomer').value = orderItem.customer || '';
    document.getElementById('editAddress').value = orderItem.address || '';
    document.getElementById('editContact').value = orderItem.contact || '';
    document.getElementById('editRemark').value = orderItem.remark || '';

    // 상세 모달 닫기
    ModalManager.closeModal('orderDetailModal');

    // 편집 모달 열기
    ModalManager.openModal('editOrderModal');
  },

  /**
   * 주문 수정 저장 처리
   */
  confirmEditOrder: function () {
    // 폼 데이터 가져오기
    const orderId = document.getElementById('editOrderId').value;

    // 값 유효성 검사
    const type = document.getElementById('editType').value;
    const department = document.getElementById('editDepartment').value;
    const warehouse = document.getElementById('editWarehouse').value;
    const sla = document.getElementById('editSla').value;
    const eta = document.getElementById('editEta').value;
    const postalCode = document.getElementById('editPostalCode').value.trim();
    const customer = document.getElementById('editCustomer').value.trim();
    const address = document.getElementById('editAddress').value.trim();
    const contact = document.getElementById('editContact').value.trim();
    const remark = document.getElementById('editRemark').value.trim();
    const status = document.getElementById('editStatus').value;

    // 필수 필드 확인
    if (
      !type ||
      !department ||
      !warehouse ||
      !sla ||
      !eta ||
      !postalCode ||
      !customer ||
      !address
    ) {
      MessageManager.warning('필수 입력 항목을 모두 입력해주세요.');
      return;
    }

    // 기존 주문 정보 가져오기
    const orderItem = DataManager.getDashboardItemById(orderId);
    if (!orderItem) {
      MessageManager.error('주문 정보를 찾을 수 없습니다.');
      return;
    }

    // 업데이트 데이터 준비
    const updateData = {
      type: type,
      department: department,
      warehouse: warehouse,
      sla: sla,
      eta: new Date(eta).toISOString(),
      postal_code: postalCode,
      address: address,
      customer: customer,
      contact: contact || null,
      remark: remark || null,
      status: status,
    };

    // 상태가 변경되었을 경우 추가 필드 업데이트
    if (status !== orderItem.status) {
      // 진행 상태로 변경할 때 출발 시간 자동 설정 (만약 없는 경우)
      if (status === 'IN_PROGRESS' && !orderItem.depart_time) {
        updateData.depart_time = new Date().toISOString();
      }

      // 완료 또는 이슈 상태로 변경할 때 완료 시간 자동 설정
      if (
        (status === 'COMPLETE' || status === 'ISSUE') &&
        !orderItem.complete_time
      ) {
        updateData.complete_time = new Date().toISOString();
      }
    }

    // 주문 정보 업데이트
    const result = DataManager.updateDashboardItem(orderId, updateData);

    // 모달 닫기
    ModalManager.closeModal('editOrderModal');

    // 결과 알림
    if (result) {
      MessageManager.success('주문 정보가 성공적으로 수정되었습니다.');
    } else {
      MessageManager.error('주문 정보 수정에 실패했습니다.');
    }
  },
  
  /**
   * 텍스트를 클립보드에 복사
   * @param {string} text 복사할 텍스트
   */
  copyToClipboard: function(text) {
    // 임시 textarea 요소 생성
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; // 화면에서 안 보이게
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      // 복사 실행
      const successful = document.execCommand('copy');
      if (successful) {
        MessageManager.success(`주문번호 ${text} 복사됨`);
      } else {
        MessageManager.error('복사에 실패했습니다.');
      }
    } catch (err) {
      MessageManager.error('복사 중 오류가 발생했습니다.');
      console.error('복사 실패:', err);
    }
    
    // 임시 요소 제거
    document.body.removeChild(textarea);
  }
};

// 전역 객체에 페이지 모듈 할당
window.DashboardPage = DashboardPage;

/**
 * 대시보드 페이지 관련 기능
 */

class DashboardPage {
  constructor() {
    // 상태 초기화
    this.currentPage = 1;
    this.pageSize = 10;
    this.filters = {};
    this.selectedItems = new Set();
    this.currentDetailId = null;
    
    // 대시보드 요소
    this.elements = {
      tableBody: document.getElementById('dashboardTableBody'),
      selectAll: document.getElementById('selectAll'),
      pageInfo: document.getElementById('pageInfo'),
      searchBtn: document.getElementById('searchBtn'),
      resetBtn: document.getElementById('resetBtn'),
      refreshBtn: document.getElementById('refreshBtn'),
      assignBtn: document.getElementById('assignBtn'),
      newOrderBtn: document.getElementById('newOrderBtn'),
      deleteOrderBtn: document.getElementById('deleteOrderBtn'), // 삭제 버튼 추가
      totalOrders: document.getElementById('totalOrders'),
      inProgressOrders: document.getElementById('inProgressOrders'),
      completedOrders: document.getElementById('completedOrders'),
      pageSize: document.getElementById('pageSize'),
      
      // 상태 카운트 요소
      pendingCount: document.getElementById('pendingCount'),
      assignedCount: document.getElementById('assignedCount'),
      progressCount: document.getElementById('progressCount'),
      completeCount: document.getElementById('completeCount'),
      issueCount: document.getElementById('issueCount'),
      cancelCount: document.getElementById('cancelCount'),
      
      // 필터 요소
      startDate: document.getElementById('startDate'),
      endDate: document.getElementById('endDate'),
      dateRangeLabel: document.getElementById('dateRangeLabel'),
      statusFilter: document.getElementById('statusFilter'),
      departmentFilter: document.getElementById('departmentFilter'),
      warehouseFilter: document.getElementById('warehouseFilter'),
      searchKeyword: document.getElementById('searchKeyword'),
      
      // 모달 관련 요소
      statusForm: document.getElementById('statusForm'),
      assignForm: document.getElementById('assignForm'),
      selectedCount: document.getElementById('selectedCount'),
      driverSelect: document.getElementById('driverSelect'),
      driverContact: document.getElementById('driverContact'),
      vehicleInfo: document.getElementById('vehicleInfo'),
      saveStatusBtn: document.getElementById('saveStatusBtn'),
      saveAssignBtn: document.getElementById('saveAssignBtn'),
      saveNewOrderBtn: document.getElementById('saveNewOrderBtn'),
      
      // 상세 모달 요소
      detailNewStatus: document.getElementById('detailNewStatus'),
      saveDetailStatusBtn: document.getElementById('saveDetailStatusBtn')
    };
    
    // 이벤트 핸들러 바인딩
    this.bindEvents();
  }
  
  /**
   * 이벤트 핸들러 바인딩
   */
  bindEvents() {
    // 검색 이벤트
    this.elements.searchBtn.addEventListener('click', this.handleSearchByKeyword.bind(this));
    this.elements.resetBtn.addEventListener('click', this.resetFilters.bind(this));
    
    // 날짜 필터 변경 이벤트 - 즉시 적용
    this.elements.startDate.addEventListener('change', this.handleDateChange.bind(this));
    this.elements.endDate.addEventListener('change', this.handleDateChange.bind(this));
    
    // 필터 적용 버튼 이벤트 - 상태 필터 적용
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn) {
      applyFilterBtn.addEventListener('click', this.applyStateFilters.bind(this));
    }
    
    // 테이블 이벤트
    this.elements.selectAll.addEventListener('change', this.handleSelectAll.bind(this));
    this.elements.refreshBtn.addEventListener('click', this.refreshData.bind(this));
    this.elements.assignBtn.addEventListener('click', this.openAssignModal.bind(this));
    this.elements.newOrderBtn.addEventListener('click', () => modalUtils.openModal('newOrderModal'));
    this.elements.deleteOrderBtn.addEventListener('click', this.handleDeleteOrders.bind(this)); // 삭제 버튼 이벤트
    this.elements.pageSize.addEventListener('change', this.handlePageSizeChange.bind(this));
    
    // 페이지네이션 이벤트
    document.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', this.handlePageChange.bind(this));
    });
    
    // 모달 이벤트
    this.elements.saveStatusBtn.addEventListener('click', this.handleStatusSubmit.bind(this));
    this.elements.saveAssignBtn.addEventListener('click', this.handleAssignSubmit.bind(this));
    this.elements.saveNewOrderBtn.addEventListener('click', this.handleNewOrderSubmit.bind(this));
    
    // 상태 변경 버튼 이벤트
    const changeStatusBtn = document.getElementById('changeStatusBtn');
    if (changeStatusBtn) {
      changeStatusBtn.addEventListener('click', this.openBatchStatusModal.bind(this));
    }
    
    // 배치 상태 변경 이벤트
    const saveBatchStatusBtn = document.getElementById('saveBatchStatusBtn');
    if (saveBatchStatusBtn) {
      saveBatchStatusBtn.addEventListener('click', this.handleBatchStatusSubmit.bind(this));
    }
    
    // 상세 정보 수정 이벤트
    const editDetailBtn = document.getElementById('editDetailBtn');
    const saveDetailBtn = document.getElementById('saveDetailBtn');
    if (editDetailBtn && saveDetailBtn) {
      editDetailBtn.addEventListener('click', this.enableDetailEdit.bind(this));
      saveDetailBtn.addEventListener('click', this.saveDetailChanges.bind(this));
    }
  }
  
  /**
   * 초기화
   */
  async init() {
    try {
      // 데이터 로드
      await dataManager.loadData();
      
      // 필터 옵션 설정
      this.setupFilterOptions();
      
      // 초기 날짜 범위 설정
      const today = dateUtils.getCurrentDate();
      this.elements.endDate.value = today;
      
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      this.elements.startDate.value = dateUtils.formatDate(startDate);
      
      // 데이터 로드 및 렌더링
      this.refreshData();
      
    } catch (error) {
      console.error('대시보드 초기화 오류:', error);
      messageUtils.error('대시보드를 초기화하는 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 필터 옵션 설정
   */
  setupFilterOptions() {
    const options = dataManager.getFilterOptions();
    
    // 부서 옵션 설정
    domUtils.populateSelect('departmentFilter', options.departments);
    domUtils.populateSelect('newDepartment', options.departments, null, null, false);
    
    // 창고 옵션 설정
    domUtils.populateSelect('warehouseFilter', options.warehouses);
    domUtils.populateSelect('newWarehouse', options.warehouses, null, null, false);
    
    // 드라이버 옵션 설정
    const drivers = dataManager.getDrivers();
    domUtils.populateSelect('driverSelect', drivers, 'driver_id', 'name', false);
  }
  
  /**
   * 검색 필터 설정
   */
  setFilters() {
    this.filters = {
      startDate: this.elements.startDate.value,
      endDate: this.elements.endDate.value,
      status: this.elements.statusFilter.value,
      department: this.elements.departmentFilter.value,
      warehouse: this.elements.warehouseFilter.value,
      keyword: this.elements.searchKeyword.value
    };
  }
  
  /**
   * 검색어로 검색 이벤트 핸들러
   * 검색은 날짜 및 필터와 독립적으로 동작
   */
  handleSearchByKeyword() {
    // 검색어가 있을 때만 검색 실행
    const keyword = this.elements.searchKeyword.value.trim();
    if (keyword) {
      // 검색 시에는 날짜 및 상태 필터 초기화하고 키워드만 적용
      this.filters = {
        keyword: keyword
      };
      
      // 필터링된 것처럼 보이지 않도록 필터 선택 UI 초기화
      this.elements.statusFilter.value = '';
      this.elements.departmentFilter.value = '';
      this.elements.warehouseFilter.value = '';
      
      this.currentPage = 1;
      this.refreshData();
      
      // 검색 모드 메시지 표시
      messageUtils.info(`"${keyword}" 검색 결과입니다. 날짜 필터 및 상태 필터가 해제되었습니다.`);
    } else {
      messageUtils.warning('검색어를 입력해주세요.');
    }
  }
  
  /**
   * 날짜 변경 핸들러 - 즉시 필터링 적용
   */
  handleDateChange() {
    // 시작일과 종료일 가져오기
    const startDate = this.elements.startDate.value;
    const endDate = this.elements.endDate.value;
    
    // 날짜 입력 여부 확인
    if (!startDate || !endDate) {
      return; // 둘 중 하나라도 없으면 처리하지 않음
    }
    
    // 유효성 검사
    if (startDate && endDate) {
      // 시작일이 종료일보다 늦을 경우 조정
      if (new Date(startDate) > new Date(endDate)) {
        messageUtils.warning('시작일은 종료일보다 이전이어야 합니다.');
        // 종료일을 시작일로 설정
        this.elements.endDate.value = startDate;
      }
    }
    
    // 필터에 적용
    this.filters.startDate = startDate;
    this.filters.endDate = endDate;
    
    // 날짜 범위 표시
    const startFormatted = dateUtils.formatDate(new Date(startDate));
    const endFormatted = dateUtils.formatDate(new Date(endDate));
    
    // 날짜 범위 정보 표시
    if (this.elements.dateRangeLabel) {
      this.elements.dateRangeLabel.innerHTML = `기간 (${startFormatted} ~ ${endFormatted})`;
    }
    
    // 다른 필터는 유지하면서 날짜만 변경하여 데이터 새로고침
    this.currentPage = 1;
    this.refreshData();
    
    console.log(`날짜 필터 적용: ${startDate} ~ ${endDate} (ETA 기준)`);
  }
  
  /**
   * 상태 필터 적용 - 상태, 부서, 창고 필터만 적용 (날짜는 이미 적용된 상태)
   */
  applyStateFilters() {
    // 상태, 부서, 창고 필터 적용
    this.filters.status = this.elements.statusFilter.value;
    this.filters.department = this.elements.departmentFilter.value;
    this.filters.warehouse = this.elements.warehouseFilter.value;
    
    // 데이터 새로고침
    this.currentPage = 1;
    this.refreshData();
    
    // 필터 적용 메시지
    messageUtils.success('필터가 적용되었습니다.');
  }
  
  /**
   * 필터 초기화
   */
  resetFilters() {
    this.elements.statusFilter.value = '';
    this.elements.departmentFilter.value = '';
    this.elements.warehouseFilter.value = '';
    this.elements.searchKeyword.value = '';
    
    const today = dateUtils.getCurrentDate();
    this.elements.endDate.value = today;
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    this.elements.startDate.value = dateUtils.formatDate(startDate);
    
    // 먼저 날짜 변경 이벤트 발생시켜 날짜 관련 라벨 업데이트
    this.handleDateChange();
    
    // 나머지 필터 초기화 및 데이터 새로고침
    this.currentPage = 1;
    this.refreshData();
    
    // 초기화 완료 메시지 표시
    messageUtils.info('필터가 초기화되었습니다.');
  }
  
  /**
   * 전체 선택 핸들러
   */
  handleSelectAll(e) {
    const checked = e.target.checked;
    
    document.querySelectorAll('.item-checkbox').forEach(checkbox => {
      checkbox.checked = checked;
      
      const itemId = parseInt(checkbox.value);
      if (checked) {
        this.selectedItems.add(itemId);
      } else {
        this.selectedItems.delete(itemId);
      }
    });
    
    // 버튼 상태 업데이트
    this.updateActionButtons();
  }
  
  /**
   * 개별 체크박스 핸들러
   */
  handleCheckboxChange(e) {
    const checkbox = e.target;
    const itemId = parseInt(checkbox.value);
    
    if (checkbox.checked) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
      
      // 전체 선택 해제
      this.elements.selectAll.checked = false;
    }
    
    // 모든 체크박스가 선택되었는지 확인
    const allChecked = document.querySelectorAll('.item-checkbox:not(:checked)').length === 0;
    this.elements.selectAll.checked = allChecked && document.querySelectorAll('.item-checkbox').length > 0;
    
    // 버튼 상태 업데이트
    this.updateActionButtons();
  }
  
  /**
   * 버튼 상태 업데이트 (배차/삭제)
   */
  updateActionButtons() {
    const hasSelection = this.selectedItems.size > 0;
    
    // 배차 버튼 상태 업데이트
    this.elements.assignBtn.disabled = !hasSelection;
    if (hasSelection) {
      this.elements.assignBtn.classList.remove('disabled');
    } else {
      this.elements.assignBtn.classList.add('disabled');
    }
    
    // 삭제 버튼 상태 업데이트
    this.elements.deleteOrderBtn.disabled = !hasSelection;
    if (hasSelection) {
      this.elements.deleteOrderBtn.classList.remove('disabled');
    } else {
      this.elements.deleteOrderBtn.classList.add('disabled');
    }
  }
  
  /**
   * 페이지 크기 변경 핸들러
   */
  handlePageSizeChange() {
    this.pageSize = parseInt(this.elements.pageSize.value);
    this.currentPage = 1;
    this.refreshData();
  }
  
  /**
   * 페이지 변경 핸들러
   */
  handlePageChange(e) {
    const pageAction = e.currentTarget.getAttribute('data-page');
    
    if (pageAction === 'prev' && this.currentPage > 1) {
      this.currentPage--;
    } else if (pageAction === 'next' && this.currentPage < this.totalPages) {
      this.currentPage++;
    }
    
    this.refreshData();
  }
  
  /**
   * 선택한 주문 삭제 처리 핸들러
   */
  handleDeleteOrders() {
    if (this.selectedItems.size === 0) {
      messageUtils.warning('삭제할 항목을 선택해주세요.');
      return;
    }
    
    // 삭제 확인
    if (!confirm(`선택한 ${this.selectedItems.size}개 항목을 삭제하시겠습니까?`)) {
      return;
    }
    
    try {
      // 데이터 매니저에 삭제 함수 추가 (아래에서 구현)
      const deletedCount = dataManager.deleteDashboards(Array.from(this.selectedItems));
      
      if (deletedCount > 0) {
        messageUtils.success(`${deletedCount}건의 주문이 삭제되었습니다.`);
        this.refreshData();
      } else {
        messageUtils.error('주문 삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('주문 삭제 오류:', error);
      messageUtils.error('주문 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * 데이터 새로고침
   */
  refreshData() {
    this.setFilters();
    
    // 데이터 조회
    const result = dataManager.getDashboards(
      this.filters,
      this.currentPage,
      this.pageSize
    );
    
    // 결과 저장
    this.dashboards = result.items;
    this.totalItems = result.totalItems;
    this.totalPages = result.totalPages;
    
    // 선택 항목 초기화
    this.selectedItems.clear();
    this.elements.selectAll.checked = false;
    
    // 데이터 렌더링
    this.renderTable();
    this.renderPagination();
    this.updateSummary();
    
    // 버튼 상태 업데이트
    this.updateActionButtons();
  }
  
  /**
   * 테이블 렌더링
   */
  renderTable() {
    const tableBody = this.elements.tableBody;
    tableBody.innerHTML = '';
    
    if (this.dashboards.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `<td colspan="10" class="empty-table">데이터가 없습니다.</td>`;
      tableBody.appendChild(emptyRow);
      return;
    }
    
    this.dashboards.forEach(item => {
      const row = document.createElement('tr');
      
      // 상태에 따른 행 스타일 추가
      switch(item.delivery_status) {
        case 'PENDING':
          row.classList.add('row-pending');
          break;
        case 'IN_PROGRESS':
          row.classList.add('row-progress');
          break;
        case 'COMPLETE':
          row.classList.add('row-complete');
          break;
        case 'ISSUE':
          row.classList.add('row-issue');
          break;
        case 'CANCEL':
          row.classList.add('row-cancel');
          break;
      }
      
      const statusClass = statusUtils.getStatusClass(item.delivery_status);
      const statusText = statusUtils.getStatusText(item.delivery_status);
      
      // 배송(보라)과 회수(오렌지) 타입 구분 - 더 명확하게 표시
      const typeLabel = item.type === 'DELIVERY' ? '배송' : '회수';
      const typeClass = item.type === 'DELIVERY' ? 'bg-purple' : 'bg-orange';
      
      row.innerHTML = `
        <td class="checkbox-cell">
          <input type="checkbox" class="item-checkbox" value="${item.dashboard_id}">
        </td>
        <td>${item.order_no}</td>
        <td>${item.customer}</td>
        <td style="text-align: center;"><span class="status-badge ${typeClass}" style="display: inline-block; min-width: 60px; text-align: center;">${typeLabel}</span></td>
        <td style="text-align: center;"><span class="status-badge ${statusClass}" style="display: inline-block; min-width: 60px; text-align: center;">${statusText}</span></td>
        <td>${item.department}</td>
        <td>${item.warehouse}</td>
        <td>${item.eta}</td>
        <td>${item.driver_name || '-'}</td>
      `;
      
      // 체크박스 이벤트 핸들러
      const checkbox = row.querySelector('.item-checkbox');
      checkbox.addEventListener('change', this.handleCheckboxChange.bind(this));
      
      // 행 클릭 이벤트 - 상세 정보 표시
      row.addEventListener('click', (e) => {
        // 체크박스나 버튼 클릭 시 이벤트 전파 중지
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
          return;
        }
        
        this.showDetailModal(item.dashboard_id);
      });
      
      tableBody.appendChild(row);
    });
  }
  
  /**
   * 페이지네이션 렌더링
   */
  renderPagination() {
    this.elements.pageInfo.textContent = `${this.currentPage} / ${this.totalPages || 1}`;
    
    // 이전/다음 버튼 활성화/비활성화
    const prevBtn = document.querySelector('.page-btn[data-page="prev"]');
    const nextBtn = document.querySelector('.page-btn[data-page="next"]');
    
    prevBtn.disabled = this.currentPage <= 1;
    nextBtn.disabled = this.currentPage >= this.totalPages;
  }
  
  /**
   * 요약 정보 업데이트
   * 날짜 필터링 기간 내 데이터에 대해서만 계산
   */
  updateSummary() {
    // 상태별 카운트 조회
    const counts = dataManager.getStatusCounts();
    
    // 필터링된 데이터 기준으로 계산
    const deliveryCount = this.dashboards.filter(item => item.type === 'DELIVERY').length;
    const pickupCount = this.dashboards.filter(item => item.type === 'PICKUP').length;
    
    // 진행, 완료 상태 건수 계산
    const progressCount = this.dashboards.filter(item => item.delivery_status === 'IN_PROGRESS').length;
    const completeCount = this.dashboards.filter(item => item.delivery_status === 'COMPLETE').length;
    
    // 요약 카드 업데이트
    this.elements.totalOrders.textContent = deliveryCount + '건';
    this.elements.inProgressOrders.textContent = pickupCount + '건';
    
    // 새로 추가된 요약 카드 업데이트 (progressOrders 요소)
    const progressOrdersElement = document.getElementById('progressOrders');
    if (progressOrdersElement) {
      progressOrdersElement.textContent = progressCount + '건';
    }
    
    // 완료 건수 카드 업데이트
    this.elements.completedOrders.textContent = completeCount + '건';
  }
  
  /**
   * 상태 변경 모달 표시
   */
  showStatusModal(id) {
    const dashboard = dataManager.getDashboardById(id);
    if (!dashboard) {
      messageUtils.error('대시보드 정보를 찾을 수 없습니다.');
      return;
    }
    
    // 모달 폼 초기화
    document.getElementById('statusItemId').value = dashboard.dashboard_id;
    document.getElementById('currentStatus').value = statusUtils.getStatusText(dashboard.delivery_status);
    document.getElementById('newStatus').value = '';
    document.getElementById('statusRemark').value = dashboard.remark || '';
    
    // 모달 표시
    modalUtils.openModal('statusModal');
  }
  
  /**
   * 상세 정보 모달 표시
   */
  showDetailModal(id) {
    const dashboard = dataManager.getDashboardById(id);
    if (!dashboard) {
      messageUtils.error('정보를 찾을 수 없습니다.');
      return;
    }
    
    // 현재 선택된 아이템 ID 저장
    this.currentDetailId = id;
    
    // 상태에 따른 클래스
    const statusClass = statusUtils.getStatusClass(dashboard.delivery_status);
    const statusText = statusUtils.getStatusText(dashboard.delivery_status);
    
    // 상세 정보 채우기 - 표시용
    document.getElementById('detailOrderNo').textContent = dashboard.order_no;
    document.getElementById('detailCustomer').textContent = dashboard.customer;
    document.getElementById('detailType').textContent = dashboard.type === 'DELIVERY' ? '배송' : '회수';
    document.getElementById('detailStatus').textContent = statusText;
    document.getElementById('detailStatus').className = `status-badge ${statusClass}`;
    document.getElementById('detailDepartment').textContent = dashboard.department;
    document.getElementById('detailWarehouse').textContent = dashboard.warehouse;
    document.getElementById('detailEta').textContent = dashboard.eta;
    document.getElementById('detailDriver').textContent = dashboard.driver_name || '-';
    document.getElementById('detailContact').textContent = dashboard.driver_contact || '-';
    document.getElementById('detailAddress').textContent = dashboard.address;
    document.getElementById('detailPostalCode').textContent = dashboard.postal_code;
    document.getElementById('detailRemark').textContent = dashboard.remark || '-';
    
    // 추가된 필드
    document.getElementById('detailCreateTime').textContent = dashboard.create_time || '-';
    document.getElementById('detailDepartTime').textContent = dashboard.depart_time || '-';
    document.getElementById('detailCompleteTime').textContent = dashboard.complete_time || '-';
    document.getElementById('detailSla').textContent = dashboard.sla || '-';
    document.getElementById('detailUpdateAt').textContent = dashboard.update_at || '-';
    document.getElementById('detailUpdatedBy').textContent = dashboard.updated_by || 'System';
    
    // 편집용 입력 필드 초기화
    // 주문번호
    const editOrderNoField = document.getElementById('editDetailOrderNo');
    if (editOrderNoField) {
      editOrderNoField.value = dashboard.order_no;
      editOrderNoField.style.display = 'none';
    }
    
    // 고객명
    const editCustomerField = document.getElementById('editDetailCustomer');
    if (editCustomerField) {
      editCustomerField.value = dashboard.customer;
      editCustomerField.style.display = 'none';
    }
    
    // 부서
    const editDepartmentField = document.getElementById('editDetailDepartment');
    if (editDepartmentField) {
      editDepartmentField.value = dashboard.department;
      editDepartmentField.style.display = 'none';
    }
    
    // 창고
    const editWarehouseField = document.getElementById('editDetailWarehouse');
    if (editWarehouseField) {
      editWarehouseField.value = dashboard.warehouse;
      editWarehouseField.style.display = 'none';
    }
    
    // 편집 모드 끄기
    this.disableDetailEdit();
    
    // 모달 표시
    modalUtils.openModal('detailModal');
  }
  
  /**
   * 상세 정보 편집 모드 활성화
   */
  enableDetailEdit() {
    // 표시용 텍스트 요소 숨기기
    document.querySelectorAll('.detail-value').forEach(el => {
      if (el.id && !el.classList.contains('detail-status-container')) {
        el.style.display = 'none';
      }
    });
    
    // 편집용 입력 필드 표시
    document.querySelectorAll('.detail-edit-input').forEach(el => {
      el.style.display = 'block';
    });
    
    // 버튼 상태 전환
    document.getElementById('editDetailBtn').style.display = 'none';
    document.getElementById('saveDetailBtn').style.display = 'inline-block';
  }
  
  /**
   * 상세 정보 편집 모드 비활성화
   */
  disableDetailEdit() {
    // 표시용 텍스트 요소 표시
    document.querySelectorAll('.detail-value').forEach(el => {
      el.style.display = 'block';
    });
    
    // 편집용 입력 필드 숨기기
    document.querySelectorAll('.detail-edit-input').forEach(el => {
      el.style.display = 'none';
    });
    
    // 버튼 상태 전환
    document.getElementById('editDetailBtn').style.display = 'inline-block';
    document.getElementById('saveDetailBtn').style.display = 'none';
  }
  
  /**
   * 상세 정보 변경사항 저장
   */
  saveDetailChanges() {
    if (!this.currentDetailId) {
      messageUtils.error('선택된 항목이 없습니다.');
      return;
    }
    
    try {
      const dashboard = dataManager.getDashboardById(this.currentDetailId);
      if (!dashboard) {
        messageUtils.error('데이터를 찾을 수 없습니다.');
        return;
      }
      
      // 수정된 값 가져오기
      const newOrderNo = document.getElementById('editDetailOrderNo').value;
      const newCustomer = document.getElementById('editDetailCustomer').value;
      const newDepartment = document.getElementById('editDetailDepartment').value;
      const newWarehouse = document.getElementById('editDetailWarehouse').value;
      
      // 유효성 검사
      if (!newOrderNo || !newCustomer) {
        messageUtils.warning('필수 항목을 모두 입력해주세요.');
        return;
      }
      
      // 데이터 업데이트
      dashboard.order_no = newOrderNo;
      dashboard.customer = newCustomer;
      dashboard.department = newDepartment;
      dashboard.warehouse = newWarehouse;
      dashboard.update_at = dateUtils.getCurrentDateTime();
      dashboard.updated_by = 'CSAdmin'; // 현재 로그인한 사용자
      
      // 화면 업데이트
      document.getElementById('detailOrderNo').textContent = newOrderNo;
      document.getElementById('detailCustomer').textContent = newCustomer;
      document.getElementById('detailDepartment').textContent = newDepartment;
      document.getElementById('detailWarehouse').textContent = newWarehouse;
      document.getElementById('detailUpdateAt').textContent = dashboard.update_at;
      document.getElementById('detailUpdatedBy').textContent = dashboard.updated_by;
      
      // 편집 모드 비활성화
      this.disableDetailEdit();
      
      // 성공 메시지
      messageUtils.success('정보가 수정되었습니다.');
      
      // 테이블 새로고침
      this.refreshData();
      
    } catch (error) {
      console.error('정보 수정 오류:', error);
      messageUtils.error('정보 수정 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 상태 일괄 변경 모달 열기
   */
  openBatchStatusModal() {
    if (this.selectedItems.size === 0) {
      messageUtils.warning('상태를 변경할 항목을 선택해주세요.');
      return;
    }
    
    // 선택된 항목 개수 표시
    document.getElementById('batchSelectedCount').textContent = `${this.selectedItems.size}개 항목 선택됨`;
    
    // 상태 및 비고란 초기화
    document.getElementById('batchNewStatus').value = '';
    document.getElementById('batchStatusRemark').value = '';
    
    // 모달 열기
    modalUtils.openModal('batchStatusModal');
  }
  
  /**
   * 상태 일괄 변경 처리
   */
  handleBatchStatusSubmit() {
    if (this.selectedItems.size === 0) {
      messageUtils.warning('선택된 항목이 없습니다.');
      return;
    }
    
    const newStatus = document.getElementById('batchNewStatus').value;
    const remark = document.getElementById('batchStatusRemark').value;
    
    if (!newStatus) {
      messageUtils.warning('새 상태를 선택해주세요.');
      return;
    }
    
    try {
      let updatedCount = 0;
      const now = dateUtils.getCurrentDateTime();
      
      // 선택된 모든 항목의 상태 변경
      this.selectedItems.forEach(id => {
        const dashboard = dataManager.getDashboardById(id);
        if (dashboard) {
          const prevStatus = dashboard.delivery_status;
          
          // 상태 변경
          dashboard.delivery_status = newStatus;
          
          // 상태에 따른 시간 자동 기록
          if (prevStatus === 'PENDING' && newStatus === 'IN_PROGRESS') {
            // 대기 → 진행: 출발 시간 기록
            dashboard.depart_time = now;
          } else if (prevStatus === 'IN_PROGRESS' && 
                    (newStatus === 'COMPLETE' || newStatus === 'ISSUE')) {
            // 진행 → 완료/이슈: 완료 시간 기록
            dashboard.complete_time = now;
          }
          
          // 메타데이터 업데이트
          dashboard.update_at = now;
          dashboard.updated_by = 'CSAdmin'; // 현재 로그인한 사용자
          
          // 비고 업데이트
          if (remark) {
            dashboard.remark = remark;
          }
          
          updatedCount++;
        }
      });
      
      if (updatedCount > 0) {
        modalUtils.closeModal('batchStatusModal');
        messageUtils.success(`${updatedCount}건의 상태가 변경되었습니다.`);
        
        // 선택 항목 초기화 및 데이터 새로고침
        this.selectedItems.clear();
        this.elements.selectAll.checked = false;
        this.refreshData();
      } else {
        messageUtils.error('상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('상태 일괄 변경 오류:', error);
      messageUtils.error('상태 변경 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 배차 모달 열기
   */
  openAssignModal() {
    if (this.selectedItems.size === 0) {
      messageUtils.warning('배차할 항목을 선택해주세요.');
      return;
    }
    
    // 선택 항목 개수 표시
    this.elements.selectedCount.textContent = `${this.selectedItems.size}개 항목 선택됨`;
    
    // 배차 입력 필드 초기화
    document.getElementById('driverName').value = '';
    document.getElementById('driverContact').value = '';
    document.getElementById('vehicleInfo').value = '';
    
    // 모달 표시
    modalUtils.openModal('assignModal');
  }
  
  // 드라이버 선택 핸들러 함수는 제거
  
  /**
   * 상태 변경 제출 핸들러
   */
  handleStatusSubmit() {
    const id = parseInt(document.getElementById('statusItemId').value);
    const newStatus = document.getElementById('newStatus').value;
    const remark = document.getElementById('statusRemark').value;
    
    if (!newStatus) {
      messageUtils.warning('새 상태를 선택해주세요.');
      return;
    }
    
    try {
      // 상태 변경 처리
      const updatedDashboard = dataManager.updateDashboardStatus(id, newStatus, remark);
      
      if (updatedDashboard) {
        modalUtils.closeModal('statusModal');
        messageUtils.success('상태가 변경되었습니다.');
        this.refreshData();
      } else {
        messageUtils.error('상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      messageUtils.error('상태 변경 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 배차 처리 제출 핸들러
   */
  handleAssignSubmit() {
    const driverName = document.getElementById('driverName').value;
    const driverContact = document.getElementById('driverContact').value;
    const vehicleInfo = document.getElementById('vehicleInfo').value;
    
    if (!driverName) {
      messageUtils.warning('배송기사 이름을 입력해주세요.');
      return;
    }
    
    try {
      let updatedCount = 0;
      const now = dateUtils.getCurrentDateTime();
      
      // 선택된 모든 항목에 배차 정보 적용
      this.selectedItems.forEach(id => {
        const dashboard = dataManager.getDashboardById(id);
        if (dashboard) {
          dashboard.driver_name = driverName;
          dashboard.driver_contact = driverContact || '';
          dashboard.vehicle_info = vehicleInfo || '';
          
          // 상태가 대기일 경우에만 진행으로 변경
          if (dashboard.delivery_status === 'PENDING') {
            dashboard.delivery_status = 'IN_PROGRESS'; // 배차 시 자동으로 진행 상태로 변경
            dashboard.depart_time = now; // 출발 시간 자동 기록
          }
          
          // 메타데이터 업데이트
          dashboard.update_at = now;
          dashboard.updated_by = 'CSAdmin'; // 현재 로그인한 사용자
          
          updatedCount++;
        }
      });
      
      if (updatedCount > 0) {
        modalUtils.closeModal('assignModal');
        messageUtils.success(`${updatedCount}건의 배차 처리가 완료되었습니다.`);
        
        // 선택 항목 초기화 및 데이터 새로고침
        this.selectedItems.clear();
        this.elements.selectAll.checked = false;
        this.refreshData();
      } else {
        messageUtils.error('배차 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('배차 처리 오류:', error);
      messageUtils.error('배차 처리 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 신규 주문 등록 제출 핸들러
   */
  handleNewOrderSubmit() {
    const form = document.getElementById('newOrderForm');
    
    // 폼 유효성 검사
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    // 현재 시간 생성
    const now = dateUtils.getCurrentDateTime();
    
    const newOrderData = {
      order_no: document.getElementById('newOrderNo').value,
      customer: document.getElementById('newCustomer').value,
      type: document.getElementById('newType').value,
      delivery_status: document.getElementById('newStatus').value,
      department: document.getElementById('newDepartment').value,
      warehouse: document.getElementById('newWarehouse').value,
      eta: document.getElementById('newEta').value.replace('T', ' '),
      driver_name: '',
      driver_contact: '',
      address: document.getElementById('newAddress').value,
      postal_code: document.getElementById('newPostalCode').value,
      remark: document.getElementById('newRemark').value,
      create_time: now,
      update_at: now,
      updated_by: 'CSAdmin',
      sla: document.getElementById('newSla').value || 'Standard'
    };
    
    try {
      // 신규 주문 등록
      const newDashboard = dataManager.addDashboard(newOrderData);
      
      if (newDashboard) {
        modalUtils.closeModal('newOrderModal');
        messageUtils.success('신규 주문이 등록되었습니다.');
        this.refreshData();
        
        // 폼 초기화
        form.reset();
      } else {
        messageUtils.error('주문 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('주문 등록 오류:', error);
      messageUtils.error('주문 등록 중 오류가 발생했습니다.');
    }
  }
}

// 대시보드 페이지 인스턴스
const dashboardPage = new DashboardPage();

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
    
    // 기타 필터 변경 이벤트 - 즉시 적용
    this.elements.statusFilter.addEventListener('change', this.handleFilterChange.bind(this));
    this.elements.departmentFilter.addEventListener('change', this.handleFilterChange.bind(this));
    this.elements.warehouseFilter.addEventListener('change', this.handleFilterChange.bind(this));
    
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
    this.elements.saveDetailStatusBtn.addEventListener('click', this.handleDetailStatusSubmit.bind(this));
    
    // 드라이버 선택 이벤트
    this.elements.driverSelect.addEventListener('change', this.handleDriverSelect.bind(this));
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
   */
  handleSearchByKeyword() {
    // 검색어가 있을 때만 검색 실행
    const keyword = this.elements.searchKeyword.value.trim();
    if (keyword) {
      this.filters.keyword = keyword;
      this.currentPage = 1;
      this.refreshData();
    } else {
      messageUtils.warning('검색어를 입력해주세요.');
    }
  }
  
  /**
   * 날짜 필터 변경 핸들러 - 즉시 적용
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
    this.filters.startDate = this.elements.startDate.value;
    this.filters.endDate = this.elements.endDate.value;
    
    // 날짜 범위 표시
    const startFormatted = dateUtils.formatDate(new Date(startDate));
    const endFormatted = dateUtils.formatDate(new Date(endDate));
    
    // 날짜 범위 정보 표시
    if (this.elements.dateRangeLabel) {
      this.elements.dateRangeLabel.innerHTML = `기간 (ETA ${startFormatted} ~ ${endFormatted})`;
    }
    
    // 데이터 새로고침
    this.currentPage = 1;
    this.refreshData();
    
    console.log(`날짜 필터 변경: ${startDate} ~ ${endDate} (ETA 기준)`);
  }
  
  /**
   * 필터 변경 핸들러 - 즉시 적용
   */
  handleFilterChange() {
    this.filters.status = this.elements.statusFilter.value;
    this.filters.department = this.elements.departmentFilter.value;
    this.filters.warehouse = this.elements.warehouseFilter.value;
    this.currentPage = 1;
    this.refreshData();
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
    
    // handleSearch 함수 대신 refreshData 호출
    this.currentPage = 1;
    this.refreshData();
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
      
      // 상태에 따른 스타일
      if (item.delivery_status === 'COMPLETE') {
        row.classList.add('row-completed');
      } else if (item.delivery_status === 'ISSUE') {
        row.classList.add('row-issue');
      }
      
      const statusClass = statusUtils.getStatusClass(item.delivery_status);
      const statusText = statusUtils.getStatusText(item.delivery_status);
      
      const typeLabel = item.type === 'DELIVERY' ? '배송' : '회수';
      const typeClass = item.type === 'DELIVERY' ? 'bg-blue' : 'bg-purple';
      
      row.innerHTML = `
        <td class="checkbox-cell">
          <input type="checkbox" class="item-checkbox" value="${item.dashboard_id}">
        </td>
        <td>${item.order_no}</td>
        <td>${item.customer}</td>
        <td><span class="status-badge ${typeClass}">${typeLabel}</span></td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
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
   */
  updateSummary() {
    // 상태별 카운트 조회
    const counts = dataManager.getStatusCounts();
    
    // 요약 카드 업데이트
    this.elements.totalOrders.textContent = this.totalItems + '건';
    this.elements.inProgressOrders.textContent = counts.IN_PROGRESS + '건';
    this.elements.completedOrders.textContent = counts.COMPLETE + '건';
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
    
    // 상세 정보 채우기
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
    document.getElementById('detailCreatedAt').textContent = dashboard.created_at;
    document.getElementById('detailUpdatedAt').textContent = dashboard.updated_at;
    document.getElementById('detailRemark').textContent = dashboard.remark || '-';
    
    // 상태 변경 드롭다운 초기화
    this.elements.detailNewStatus.value = '';
    
    // 모달 표시
    modalUtils.openModal('detailModal');
  }
  
  /**
   * 상세정보 모달에서 상태 변경 제출 핸들러
   */
  handleDetailStatusSubmit() {
    if (!this.currentDetailId) {
      messageUtils.error('선택된 항목이 없습니다.');
      return;
    }
    
    const newStatus = this.elements.detailNewStatus.value;
    
    if (!newStatus) {
      messageUtils.warning('새 상태를 선택해주세요.');
      return;
    }
    
    try {
      // 상태 변경 처리
      const updatedDashboard = dataManager.updateDashboardStatus(this.currentDetailId, newStatus);
      
      if (updatedDashboard) {
        // 상세 정보 모달 업데이트
        const statusClass = statusUtils.getStatusClass(updatedDashboard.delivery_status);
        const statusText = statusUtils.getStatusText(updatedDashboard.delivery_status);
        
        document.getElementById('detailStatus').textContent = statusText;
        document.getElementById('detailStatus').className = `status-badge ${statusClass}`;
        document.getElementById('detailUpdatedAt').textContent = updatedDashboard.updated_at;
        
        // 상태 변경 드롭다운 초기화
        this.elements.detailNewStatus.value = '';
        
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
   * 배차 모달 열기
   */
  openAssignModal() {
    if (this.selectedItems.size === 0) {
      messageUtils.warning('배차할 항목을 선택해주세요.');
      return;
    }
    
    // 선택 항목 개수 표시
    this.elements.selectedCount.textContent = `${this.selectedItems.size}개 항목 선택됨`;
    
    // 드라이버 선택 초기화
    this.elements.driverSelect.value = '';
    this.elements.driverContact.value = '';
    this.elements.vehicleInfo.value = '';
    
    // 모달 표시
    modalUtils.openModal('assignModal');
  }
  
  /**
   * 드라이버 선택 핸들러
   */
  handleDriverSelect() {
    const driverId = this.elements.driverSelect.value;
    
    if (!driverId) {
      this.elements.driverContact.value = '';
      this.elements.vehicleInfo.value = '';
      return;
    }
    
    const driver = dataManager.getDriverById(driverId);
    if (driver) {
      this.elements.driverContact.value = driver.contact;
      this.elements.vehicleInfo.value = `${driver.vehicle_type} (${driver.vehicle_no})`;
    }
  }
  
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
    const driverId = this.elements.driverSelect.value;
    
    if (!driverId) {
      messageUtils.warning('배송기사를 선택해주세요.');
      return;
    }
    
    try {
      // 배차 처리
      const updatedDashboards = dataManager.assignDriver(
        Array.from(this.selectedItems),
        driverId
      );
      
      if (updatedDashboards.length > 0) {
        modalUtils.closeModal('assignModal');
        messageUtils.success(`${updatedDashboards.length}건의 배차 처리가 완료되었습니다.`);
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
      remark: document.getElementById('newRemark').value
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

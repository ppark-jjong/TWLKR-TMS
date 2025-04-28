/**
 * 대시보드 페이지 스크립트
 * 주문 목록 조회, 필터링, 모달 처리 등을 담당합니다.
 */

// 대시보드 네임스페이스
const Dashboard = {
  /**
   * 설정
   */
  config: {
    dateFormat: 'YYYY-MM-DD',
    defaultPageSize: 10,
    orderTableId: 'orderTable',
    orderDetailModalId: 'orderDetailModal',
    createOrderModalId: 'createOrderModal'
  },
  
  /**
   * 상태 변수
   */
  state: {
    startDate: null,
    endDate: null,
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    filters: {
      status: '',
      department: '',
      warehouse: ''
    },
    search: {
      orderNo: ''
    },
    columnSettings: null,
    currentOrderId: null,
    hasLock: false
  },
  
  /**
   * 초기화
   */
  init: function() {
    console.log('[Dashboard] 초기화 시작');
    
    // 날짜 피커 초기화
    this.initDatePicker();
    
    // 필터 초기화
    this.initFilters();
    
    // 테이블 초기화
    this.initTable();
    
    // 컬럼 선택기 초기화
    this.initColumnSelector();
    
    // 페이지네이션 초기화
    this.initPagination();
    
    // 버튼 이벤트 연결
    this.initButtons();
    
    // 모달 초기화
    this.initModals();
    
    console.log('[Dashboard] 초기화 완료');
  },
  
  /**
   * 날짜 피커 초기화
   */
  initDatePicker: function() {
    const dateRangePicker = document.getElementById('dateRangePicker');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (!dateRangePicker) return;
    
    // Air Datepicker 초기화
    new AirDatepicker(dateRangePicker, {
      range: true,
      multipleDates: true,
      multipleDatesSeparator: ' ~ ',
      autoClose: true,
      locale: window.AirDatepickerLocaleKO,
      onSelect: ({ formattedDate }) => {
        if (Array.isArray(formattedDate) && formattedDate.length === 2) {
          this.state.startDate = formattedDate[0];
          this.state.endDate = formattedDate[1];
          
          if (startDateInput) startDateInput.value = formattedDate[0];
          if (endDateInput) endDateInput.value = formattedDate[1];
        }
      }
    });
    
    // 오늘 버튼 이벤트
    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        const today = new Date();
        const formattedDate = TMS.formatDate(today);
        
        this.state.startDate = formattedDate;
        this.state.endDate = formattedDate;
        
        if (startDateInput) startDateInput.value = formattedDate;
        if (endDateInput) endDateInput.value = formattedDate;
        
        if (dateRangePicker) {
          dateRangePicker.value = formattedDate;
        }
        
        // 오늘 데이터 조회
        this.loadOrders();
      });
    }
    
    // 검색 버튼 이벤트
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        this.loadOrders();
      });
    }
  },
  
  /**
   * 필터 초기화
   */
  initFilters: function() {
    // 상태 필터
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.state.filters.status = statusFilter.value;
        this.applyFilters();
      });
    }
    
    // 부서 필터
    const departmentFilter = document.getElementById('departmentFilter');
    if (departmentFilter) {
      departmentFilter.addEventListener('change', () => {
        this.state.filters.department = departmentFilter.value;
        this.applyFilters();
      });
    }
    
    // 창고 필터
    const warehouseFilter = document.getElementById('warehouseFilter');
    if (warehouseFilter) {
      warehouseFilter.addEventListener('change', () => {
        this.state.filters.warehouse = warehouseFilter.value;
        this.applyFilters();
      });
    }
    
    // 초기화 버튼
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }
    
    // 주문번호 검색
    const orderSearchBtn = document.getElementById('orderSearchBtn');
    const orderNoSearch = document.getElementById('orderNoSearch');
    
    if (orderSearchBtn && orderNoSearch) {
      orderSearchBtn.addEventListener('click', () => {
        this.state.search.orderNo = orderNoSearch.value.trim();
        this.loadOrders();
      });
      
      // 엔터 키 이벤트
      orderNoSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.state.search.orderNo = orderNoSearch.value.trim();
          this.loadOrders();
        }
      });
    }
  },
  
  /**
   * 테이블 초기화
   */
  initTable: function() {
    const orderTable = document.getElementById(this.config.orderTableId);
    
    if (orderTable) {
      // 행 클릭 이벤트
      orderTable.querySelector('tbody').addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row || row.classList.contains('no-data-row')) return;
        
        const orderId = row.getAttribute('data-id');
        if (orderId) {
          this.openOrderDetail(orderId);
        }
      });
    }
    
    // 페이지 크기 선택 이벤트
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', () => {
        this.state.pageSize = parseInt(pageSizeSelect.value, 10);
        this.state.currentPage = 1;
        this.applyFilters();
      });
    }
  },
  
  /**
   * 컬럼 선택기 초기화
   */
  initColumnSelector: function() {
    const columnSelectorBtn = document.getElementById('columnSelectorBtn');
    const columnSelectorDropdown = document.getElementById('columnSelectorDropdown');
    const columnSelectorContent = document.getElementById('columnSelectorContent');
    
    if (!columnSelectorBtn || !columnSelectorDropdown || !columnSelectorContent) return;
    
    // 컬럼 설정 불러오기
    this.loadColumnSettings();
    
    // 드롭다운 토글
    columnSelectorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      columnSelectorDropdown.style.display = 
        columnSelectorDropdown.style.display === 'none' ? 'block' : 'none';
    });
    
    // 컬럼 체크박스 생성
    const columns = [
      { name: 'department', label: '부서' },
      { name: 'type', label: '유형' },
      { name: 'warehouse', label: '창고' },
      { name: 'order-no', label: '주문번호' },
      { name: 'eta', label: 'ETA' },
      { name: 'status', label: '상태' },
      { name: 'region', label: '도착지' },
      { name: 'customer', label: '고객명' },
      { name: 'driver', label: '기사명' }
    ];
    
    columnSelectorContent.innerHTML = '';
    
    columns.forEach(col => {
      const isVisible = this.state.columnSettings === null || 
                        this.state.columnSettings[col.name] !== false;
      
      const checkbox = document.createElement('div');
      checkbox.className = 'column-checkbox';
      checkbox.innerHTML = `
        <label>
          <input type="checkbox" name="column-${col.name}" 
                 ${isVisible ? 'checked' : ''}>
          ${col.label}
        </label>
      `;
      
      columnSelectorContent.appendChild(checkbox);
      
      // 체크박스 이벤트
      const input = checkbox.querySelector('input');
      input.addEventListener('change', () => {
        this.toggleColumn(col.name, input.checked);
      });
    });
    
    // 문서 클릭 시 드롭다운 닫기
    document.addEventListener('click', (e) => {
      if (!columnSelectorDropdown.contains(e.target) && 
          e.target !== columnSelectorBtn) {
        columnSelectorDropdown.style.display = 'none';
      }
    });
    
    // 초기 컬럼 가시성 적용
    this.applyColumnSettings();
  },
  
  /**
   * 컬럼 설정 불러오기
   */
  loadColumnSettings: function() {
    const settings = localStorage.getItem('dashboard-columns');
    if (settings) {
      this.state.columnSettings = JSON.parse(settings);
    } else {
      this.state.columnSettings = {};
    }
  },
  
  /**
   * 컬럼 토글
   * @param {string} columnName - 컬럼 이름
   * @param {boolean} visible - 표시 여부
   */
  toggleColumn: function(columnName, visible) {
    if (!this.state.columnSettings) {
      this.state.columnSettings = {};
    }
    
    this.state.columnSettings[columnName] = visible;
    localStorage.setItem('dashboard-columns', JSON.stringify(this.state.columnSettings));
    
    // 컬럼 가시성 변경
    const columns = document.querySelectorAll(`.column-${columnName}`);
    columns.forEach(col => {
      col.style.display = visible ? '' : 'none';
    });
  },
  
  /**
   * 컬럼 설정 적용
   */
  applyColumnSettings: function() {
    if (!this.state.columnSettings) return;
    
    Object.keys(this.state.columnSettings).forEach(columnName => {
      const visible = this.state.columnSettings[columnName];
      const columns = document.querySelectorAll(`.column-${columnName}`);
      
      columns.forEach(col => {
        col.style.display = visible ? '' : 'none';
      });
    });
  },
  
  /**
   * 페이지네이션 초기화
   */
  initPagination: function() {
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageNumberContainer = document.getElementById('pageNumberContainer');
    
    if (!prevPageBtn || !nextPageBtn || !pageNumberContainer) return;
    
    // 이전 페이지 버튼
    prevPageBtn.addEventListener('click', () => {
      if (this.state.currentPage > 1) {
        this.state.currentPage--;
        this.applyFilters();
        this.updatePagination();
      }
    });
    
    // 다음 페이지 버튼
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(this.state.totalItems / this.state.pageSize);
      if (this.state.currentPage < totalPages) {
        this.state.currentPage++;
        this.applyFilters();
        this.updatePagination();
      }
    });
  },
  
  /**
   * 페이지네이션 업데이트
   */
  updatePagination: function() {
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageNumberContainer = document.getElementById('pageNumberContainer');
    const paginationInfo = document.querySelector('.pagination-info');
    
    if (!prevPageBtn || !nextPageBtn || !pageNumberContainer || !paginationInfo) return;
    
    // 총 페이지 수 계산
    const totalPages = Math.ceil(this.state.totalItems / this.state.pageSize);
    
    // 이전/다음 버튼 비활성화 상태 설정
    prevPageBtn.disabled = this.state.currentPage <= 1;
    nextPageBtn.disabled = this.state.currentPage >= totalPages;
    
    // 페이지 번호 버튼 생성
    pageNumberContainer.innerHTML = '';
    
    // 표시할 페이지 범위 계산
    let startPage = Math.max(1, this.state.currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    startPage = Math.max(1, endPage - 4);
    
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = 'pagination-btn';
      pageBtn.textContent = i.toString();
      
      if (i === this.state.currentPage) {
        pageBtn.classList.add('current');
      }
      
      pageBtn.addEventListener('click', () => {
        this.state.currentPage = i;
        this.applyFilters();
        this.updatePagination();
      });
      
      pageNumberContainer.appendChild(pageBtn);
    }
    
    // 페이지네이션 정보 업데이트
    const startItem = (this.state.currentPage - 1) * this.state.pageSize + 1;
    const endItem = Math.min(this.state.currentPage * this.state.pageSize, this.state.totalItems);
    
    paginationInfo.textContent = `총 ${this.state.totalItems}개 항목 중 ${startItem}-${endItem} 표시`;
  },
  
  /**
   * 버튼 이벤트 초기화
   */
  initButtons: function() {
    // 새로고침 버튼
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadOrders();
      });
    }
    
    // 신규 등록 버튼
    const createOrderBtn = document.getElementById('createOrderBtn');
    if (createOrderBtn) {
      createOrderBtn.addEventListener('click', () => {
        this.openCreateOrderModal();
      });
    }
  },
  
  /**
   * 모달 초기화
   */
  initModals: function() {
    // 주문 상세 모달 초기화
    const orderDetailModal = document.getElementById(this.config.orderDetailModalId);
    if (orderDetailModal) {
      // 모달 내 닫기 버튼
      const closeBtn = orderDetailModal.querySelector('.modal-close, .close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          TMS.modal.close(this.config.orderDetailModalId);
        });
      }
      
      // 수정 버튼
      const editBtn = orderDetailModal.querySelector('.edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          this.enableOrderEdit();
        });
      }
      
      // 저장 버튼
      const saveBtn = orderDetailModal.querySelector('.save-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          this.saveOrderChanges();
        });
      }
      
      // 취소 버튼
      const cancelBtn = orderDetailModal.querySelector('.cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          this.disableOrderEdit();
          // 현재 데이터 다시 로드
          this.loadOrderDetail(this.state.currentOrderId);
        });
      }
      
      // 삭제 버튼 (관리자만)
      const deleteBtn = orderDetailModal.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          this.confirmDeleteOrder();
        });
      }
    }
    
    // 신규 주문 모달 초기화
    const createOrderModal = document.getElementById(this.config.createOrderModalId);
    if (createOrderModal) {
      // 모달 내 닫기 버튼
      const closeBtn = createOrderModal.querySelector('.modal-close, .close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          TMS.modal.close(this.config.createOrderModalId);
        });
      }
      
      // 주문 생성 폼 제출
      const createOrderForm = createOrderModal.querySelector('form');
      if (createOrderForm) {
        createOrderForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.createOrder(new FormData(createOrderForm));
        });
      }
      
      // 우편번호 입력 필드
      const postalCodeInput = createOrderModal.querySelector('input[name="postalCode"]');
      if (postalCodeInput) {
        postalCodeInput.addEventListener('blur', () => {
          postalCodeInput.value = TMS.formatPostalCode(postalCodeInput.value);
        });
      }
    }
  },
  
  /**
   * 주문 목록 로드
   */
  loadOrders: function() {
    // 로딩 표시
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    // 조회 조건
    const params = new URLSearchParams();
    
    if (this.state.startDate) {
      params.append('start_date', this.state.startDate);
    }
    
    if (this.state.endDate) {
      params.append('end_date', this.state.endDate);
    }
    
    if (this.state.search.orderNo) {
      params.append('order_no', this.state.search.orderNo);
    }
    
    // API 호출
    TMS.api.get(`/api/v1/orders?${params.toString()}`)
      .then(response => {
        if (response && response.success) {
          // 주문 데이터 저장
          this.orders = response.data.orders;
          this.state.totalItems = this.orders.length;
          
          // 필터 적용
          this.applyFilters();
          
          // 성공 알림
          TMS.notify('success', '주문 목록을 성공적으로 불러왔습니다.');
        } else {
          TMS.notify('error', '주문 목록을 불러오는데 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('주문 목록 로드 오류:', error);
        TMS.notify('error', '주문 목록을 불러오는데 실패했습니다.');
      })
      .finally(() => {
        // 로딩 숨김
        if (loadingOverlay) loadingOverlay.style.display = 'none';
      });
  },
  
  /**
   * 필터 적용
   */
  applyFilters: function() {
    // 필터링된 주문 목록
    let filteredOrders = this.orders || [];
    
    // 상태 필터
    if (this.state.filters.status) {
      filteredOrders = filteredOrders.filter(order => 
        order.status === this.state.filters.status);
    }
    
    // 부서 필터
    if (this.state.filters.department) {
      filteredOrders = filteredOrders.filter(order => 
        order.department === this.state.filters.department);
    }
    
    // 창고 필터
    if (this.state.filters.warehouse) {
      filteredOrders = filteredOrders.filter(order => 
        order.warehouse === this.state.filters.warehouse);
    }
    
    // 페이지네이션
    this.state.totalItems = filteredOrders.length;
    const start = (this.state.currentPage - 1) * this.state.pageSize;
    const end = start + this.state.pageSize;
    const pageOrders = filteredOrders.slice(start, end);
    
    // 테이블 업데이트
    this.updateOrderTable(pageOrders);
    
    // 페이지네이션 업데이트
    this.updatePagination();
  },
  
  /**
   * 필터 초기화
   */
  resetFilters: function() {
    // 필터 초기화
    const statusFilter = document.getElementById('statusFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    const warehouseFilter = document.getElementById('warehouseFilter');
    
    if (statusFilter) statusFilter.value = '';
    if (departmentFilter) departmentFilter.value = '';
    if (warehouseFilter) warehouseFilter.value = '';
    
    // 상태 업데이트
    this.state.filters = {
      status: '',
      department: '',
      warehouse: ''
    };
    
    // 필터 재적용
    this.applyFilters();
    
    // 알림
    TMS.notify('info', '필터가 초기화되었습니다.');
  },
  
  /**
   * 주문 테이블 업데이트
   * @param {Array} orders - 주문 목록
   */
  updateOrderTable: function(orders) {
    const table = document.getElementById(this.config.orderTableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    // 테이블 내용 초기화
    tbody.innerHTML = '';
    
    // 데이터가 없는 경우
    if (!orders || orders.length === 0) {
      const noDataRow = document.createElement('tr');
      noDataRow.className = 'no-data-row';
      noDataRow.innerHTML = `
        <td colspan="9" class="no-data-cell">데이터가 없습니다</td>
      `;
      tbody.appendChild(noDataRow);
      return;
    }
    
    // 주문 목록 표시
    orders.forEach(order => {
      const row = document.createElement('tr');
      row.className = `clickable-row status-row-${order.status}`;
      row.setAttribute('data-id', order.dashboardId);
      
      row.innerHTML = `
        <td class="column-department">${order.department}</td>
        <td class="column-type">${order.type_label}</td>
        <td class="column-warehouse">${order.warehouse}</td>
        <td class="column-order-no">${order.orderNo}</td>
        <td class="column-eta">${order.eta}</td>
        <td class="column-status">
          <span class="status-badge status-${order.status}">${order.status_label}</span>
        </td>
        <td class="column-region">${order.region || '-'}</td>
        <td class="column-customer">${order.customer}</td>
        <td class="column-driver">${order.driverName || '-'}</td>
      `;
      
      tbody.appendChild(row);
    });
    
    // 컬럼 설정 적용
    this.applyColumnSettings();
  },
  
  /**
   * 주문 상세 정보 모달 열기
   * @param {string} orderId - 주문 ID
   */
  openOrderDetail: function(orderId) {
    this.state.currentOrderId = orderId;
    
    // 주문 상세 정보 로드
    this.loadOrderDetail(orderId);
    
    // 모달 열기
    TMS.modal.open(this.config.orderDetailModalId);
  },
  
  /**
   * 주문 상세 정보 로드
   * @param {string} orderId - 주문 ID
   */
  loadOrderDetail: function(orderId) {
    // 로딩 표시
    const modalContent = document.querySelector(`#${this.config.orderDetailModalId} .modal-content`);
    if (modalContent) {
      modalContent.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <div class="spinner-text">주문 정보를 불러오는 중...</div>
        </div>
      `;
    }
    
    // API 호출
    TMS.api.get(`/api/v1/orders/${orderId}`)
      .then(response => {
        if (response && response.success) {
          // 주문 상세 정보 표시
          this.displayOrderDetail(response.data);
          
          // 락 상태 확인
          this.state.hasLock = response.data.hasLock || false;
        } else {
          // 오류 표시
          if (modalContent) {
            modalContent.innerHTML = `
              <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h3>주문 정보를 불러올 수 없습니다</h3>
                <p>${response.message || '서버에서 오류가 발생했습니다.'}</p>
                <div class="error-actions">
                  <button class="btn primary-btn" onclick="TMS.modal.close('${this.config.orderDetailModalId}')">
                    닫기
                  </button>
                </div>
              </div>
            `;
          }
        }
      })
      .catch(error => {
        console.error('주문 상세 로드 오류:', error);
        
        // 오류 표시
        if (modalContent) {
          modalContent.innerHTML = `
            <div class="error-message">
              <i class="fas fa-exclamation-circle"></i>
              <h3>주문 정보를 불러올 수 없습니다</h3>
              <p>${error.message || '서버 연결에 실패했습니다.'}</p>
              <div class="error-actions">
                <button class="btn primary-btn" onclick="TMS.modal.close('${this.config.orderDetailModalId}')">
                  닫기
                </button>
              </div>
            </div>
          `;
        }
      });
  },
  
  /**
   * 주문 상세 정보 표시
   * @param {Object} data - 주문 상세 정보
   */
  displayOrderDetail: function(data) {
    const modal = document.getElementById(this.config.orderDetailModalId);
    if (!modal) return;
    
    // 모달 콘텐츠 생성
    const content = `
      <div class="modal-header">
        <h2 class="modal-title">주문 상세 정보</h2>
        <span class="modal-close">&times;</span>
      </div>
      
      <div class="modal-body">
        ${data.hasLock ? 
          `<div class="lock-info">
            <i class="fas fa-lock"></i>
            <span>현재 이 주문을 편집 중입니다.</span>
          </div>` : 
          data.lockedBy ? 
          `<div class="lock-info">
            <i class="fas fa-user-lock"></i>
            <span>${data.lockedBy}님이 이 주문을 편집 중입니다.</span>
          </div>` : ''
        }
        
        <div class="form-section">
          <h3 class="section-title">기본 정보</h3>
          <div class="form-row">
            <div class="form-group">
              <label>주문번호</label>
              <input type="text" value="${data.orderNo}" readonly>
            </div>
            <div class="form-group">
              <label>유형</label>
              <select name="type" disabled>
                <option value="NORMAL" ${data.type === 'NORMAL' ? 'selected' : ''}>일반</option>
                <option value="URGENT" ${data.type === 'URGENT' ? 'selected' : ''}>긴급</option>
                <option value="RETURN" ${data.type === 'RETURN' ? 'selected' : ''}>반품</option>
              </select>
            </div>
            <div class="form-group">
              <label>부서</label>
              <select name="department" disabled>
                <option value="LOGISTICS" ${data.department === 'LOGISTICS' ? 'selected' : ''}>물류팀</option>
                <option value="SALES" ${data.department === 'SALES' ? 'selected' : ''}>영업팀</option>
                <option value="ADMIN" ${data.department === 'ADMIN' ? 'selected' : ''}>관리팀</option>
              </select>
            </div>
            <div class="form-group">
              <label>창고</label>
              <select name="warehouse" disabled>
                <option value="SEOUL" ${data.warehouse === 'SEOUL' ? 'selected' : ''}>서울창고</option>
                <option value="INCHEON" ${data.warehouse === 'INCHEON' ? 'selected' : ''}>인천창고</option>
                <option value="BUSAN" ${data.warehouse === 'BUSAN' ? 'selected' : ''}>부산창고</option>
              </select>
            </div>
            <div class="form-group">
              <label>SLA</label>
              <input type="text" name="sla" value="${data.sla || ''}" disabled>
            </div>
            <div class="form-group">
              <label>ETA</label>
              <input type="text" name="eta" value="${data.eta || ''}" disabled>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3 class="section-title">배송 정보</h3>
          <div class="form-row">
            <div class="form-group">
              <label>우편번호</label>
              <input type="text" name="postalCode" value="${data.postalCode || ''}" maxlength="5" disabled>
            </div>
            <div class="form-group full-width">
              <label>주소</label>
              <input type="text" name="address" value="${data.address || ''}" disabled>
            </div>
            <div class="form-group">
              <label>고객명</label>
              <input type="text" name="customer" value="${data.customer || ''}" disabled>
            </div>
            <div class="form-group">
              <label>연락처</label>
              <input type="text" name="contact" value="${data.contact || ''}" disabled>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3 class="section-title">상태 정보</h3>
          <div class="form-row">
            <div class="form-group">
              <label>상태</label>
              <select name="status" disabled>
                <option value="WAITING" ${data.status === 'WAITING' ? 'selected' : ''}>대기</option>
                <option value="IN_PROGRESS" ${data.status === 'IN_PROGRESS' ? 'selected' : ''}>진행</option>
                <option value="COMPLETE" ${data.status === 'COMPLETE' ? 'selected' : ''}>완료</option>
                <option value="ISSUE" ${data.status === 'ISSUE' ? 'selected' : ''}>이슈</option>
                <option value="CANCEL" ${data.status === 'CANCEL' ? 'selected' : ''}>취소</option>
              </select>
            </div>
            <div class="form-group">
              <label>출발 시간</label>
              <input type="text" value="${data.departTime || '-'}" readonly>
            </div>
            <div class="form-group">
              <label>완료 시간</label>
              <input type="text" value="${data.completeTime || '-'}" readonly>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3 class="section-title">배차 정보</h3>
          <div class="form-row">
            <div class="form-group">
              <label>기사명</label>
              <input type="text" name="driverName" value="${data.driverName || ''}" disabled>
            </div>
            <div class="form-group">
              <label>기사 연락처</label>
              <input type="text" name="driverContact" value="${data.driverContact || ''}" disabled>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3 class="section-title">기타 정보</h3>
          <div class="form-row">
            <div class="form-group full-width">
              <label>비고</label>
              <textarea name="remark" rows="3" disabled>${data.remark || ''}</textarea>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <div class="form-row">
            <div class="form-group">
              <label>마지막 수정자</label>
              <input type="text" value="${data.updatedBy || '-'}" readonly>
            </div>
            <div class="form-group">
              <label>수정 시간</label>
              <input type="text" value="${data.updatedAt || '-'}" readonly>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <div class="modal-footer-left">
          ${data.isAdmin ? 
            `<button type="button" class="btn delete-btn">삭제</button>` : 
            ''
          }
        </div>
        <div class="modal-footer-right">
          <button type="button" class="btn secondary-btn" data-dismiss="modal">닫기</button>
          ${!data.lockedBy || data.hasLock ? 
            `<button type="button" class="btn edit-btn primary-btn">수정</button>
             <button type="button" class="btn save-btn primary-btn" style="display: none;">저장</button>
             <button type="button" class="btn cancel-btn" style="display: none;">취소</button>` : 
            ''
          }
        </div>
      </div>
    `;
    
    // 모달 내용 업데이트
    modal.innerHTML = content;
    
    // 버튼 이벤트 다시 연결
    this.initModals();
  },
  
  /**
   * 주문 편집 활성화
   */
  enableOrderEdit: function() {
    const modal = document.getElementById(this.config.orderDetailModalId);
    if (!modal) return;
    
    // 수정 가능한 필드 활성화
    const editableInputs = modal.querySelectorAll('input:not([readonly]), select:not([readonly]), textarea');
    editableInputs.forEach(input => {
      input.disabled = false;
      input.classList.add('editing');
    });
    
    // 버튼 표시 변경
    const editBtn = modal.querySelector('.edit-btn');
    const saveBtn = modal.querySelector('.save-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const closeBtn = modal.querySelector('.secondary-btn[data-dismiss="modal"]');
    
    if (editBtn) editBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = '';
    if (cancelBtn) cancelBtn.style.display = '';
    if (closeBtn) closeBtn.style.display = 'none';
    
    // 락 획득 요청
    this.acquireLock();
  },
  
  /**
   * 주문 편집 비활성화
   */
  disableOrderEdit: function() {
    const modal = document.getElementById(this.config.orderDetailModalId);
    if (!modal) return;
    
    // 필드 비활성화
    const editableInputs = modal.querySelectorAll('input.editing, select.editing, textarea.editing');
    editableInputs.forEach(input => {
      input.disabled = true;
      input.classList.remove('editing');
    });
    
    // 버튼 표시 변경
    const editBtn = modal.querySelector('.edit-btn');
    const saveBtn = modal.querySelector('.save-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const closeBtn = modal.querySelector('.secondary-btn[data-dismiss="modal"]');
    
    if (editBtn) editBtn.style.display = '';
    if (saveBtn) saveBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (closeBtn) closeBtn.style.display = '';
    
    // 락 해제 요청
    this.releaseLock();
  },
  
  /**
   * 락 획득
   */
  acquireLock: function() {
    if (!this.state.currentOrderId) return;
    
    TMS.api.post(`/api/v1/orders/${this.state.currentOrderId}/lock`)
      .then(response => {
        if (response && response.success) {
          this.state.hasLock = true;
          console.log('락 획득 성공');
        } else {
          this.disableOrderEdit();
          TMS.notify('error', '편집 락을 획득할 수 없습니다. 다른 사용자가 이미 편집 중일 수 있습니다.');
        }
      })
      .catch(error => {
        console.error('락 획득 오류:', error);
        this.disableOrderEdit();
        TMS.notify('error', '편집 락을 획득할 수 없습니다.');
      });
  },
  
  /**
   * 락 해제
   */
  releaseLock: function() {
    if (!this.state.currentOrderId || !this.state.hasLock) return;
    
    TMS.api.delete(`/api/v1/orders/${this.state.currentOrderId}/lock`)
      .then(response => {
        if (response && response.success) {
          this.state.hasLock = false;
          console.log('락 해제 성공');
        }
      })
      .catch(error => {
        console.error('락 해제 오류:', error);
      });
  },
  
  /**
   * 주문 변경사항 저장
   */
  saveOrderChanges: function() {
    if (!this.state.currentOrderId || !this.state.hasLock) {
      TMS.notify('error', '편집 권한이 없습니다.');
      return;
    }
    
    const modal = document.getElementById(this.config.orderDetailModalId);
    if (!modal) return;
    
    // 폼 데이터 수집
    const formData = {
      type: modal.querySelector('select[name="type"]').value,
      department: modal.querySelector('select[name="department"]').value,
      warehouse: modal.querySelector('select[name="warehouse"]').value,
      sla: modal.querySelector('input[name="sla"]').value,
      eta: modal.querySelector('input[name="eta"]').value,
      postalCode: TMS.formatPostalCode(modal.querySelector('input[name="postalCode"]').value),
      address: modal.querySelector('input[name="address"]').value,
      customer: modal.querySelector('input[name="customer"]').value,
      contact: modal.querySelector('input[name="contact"]').value,
      status: modal.querySelector('select[name="status"]').value,
      driverName: modal.querySelector('input[name="driverName"]').value,
      driverContact: modal.querySelector('input[name="driverContact"]').value,
      remark: modal.querySelector('textarea[name="remark"]').value
    };
    
    // 필수 입력 확인
    const requiredFields = ['type', 'department', 'warehouse', 'eta', 'postalCode', 'address', 'customer', 'contact'];
    let isValid = true;
    
    requiredFields.forEach(field => {
      const input = modal.querySelector(`[name="${field}"]`);
      
      if (!formData[field]) {
        input.classList.add('invalid');
        isValid = false;
      } else {
        input.classList.remove('invalid');
      }
    });
    
    if (!isValid) {
      TMS.notify('warning', '필수 항목을 모두 입력해주세요.');
      return;
    }
    
    // API 호출
    TMS.api.put(`/api/v1/orders/${this.state.currentOrderId}`, formData)
      .then(response => {
        if (response && response.success) {
          TMS.notify('success', '주문이 성공적으로 업데이트되었습니다.');
          
          // 편집 모드 비활성화
          this.disableOrderEdit();
          
          // 주문 목록 새로고침
          this.loadOrders();
          
          // 상세 정보 새로고침
          this.loadOrderDetail(this.state.currentOrderId);
        } else {
          TMS.notify('error', response.message || '주문 업데이트에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('주문 업데이트 오류:', error);
        TMS.notify('error', '주문 업데이트에 실패했습니다.');
      });
  },
  
  /**
   * 주문 삭제 확인
   */
  confirmDeleteOrder: function() {
    if (!this.state.currentOrderId) return;
    
    if (confirm('이 주문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      this.deleteOrder();
    }
  },
  
  /**
   * 주문 삭제
   */
  deleteOrder: function() {
    if (!this.state.currentOrderId) return;
    
    TMS.api.delete(`/api/v1/orders/${this.state.currentOrderId}`)
      .then(response => {
        if (response && response.success) {
          TMS.notify('success', '주문이 성공적으로 삭제되었습니다.');
          
          // 모달 닫기
          TMS.modal.close(this.config.orderDetailModalId);
          
          // 주문 목록 새로고침
          this.loadOrders();
        } else {
          TMS.notify('error', response.message || '주문 삭제에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('주문 삭제 오류:', error);
        TMS.notify('error', '주문 삭제에 실패했습니다.');
      });
  },
  
  /**
   * 주문 생성 모달 열기
   */
  openCreateOrderModal: function() {
    TMS.modal.open(this.config.createOrderModalId);
  },
  
  /**
   * 새 주문 생성
   * @param {FormData} formData - 폼 데이터
   */
  createOrder: function(formData) {
    // 폼 데이터를 객체로 변환
    const orderData = {};
    for (const [key, value] of formData.entries()) {
      orderData[key] = value;
    }
    
    // 우편번호 포맷팅
    orderData.postalCode = TMS.formatPostalCode(orderData.postalCode);
    
    // API 호출
    TMS.api.post('/api/v1/orders', orderData)
      .then(response => {
        if (response && response.success) {
          TMS.notify('success', '주문이 성공적으로 생성되었습니다.');
          
          // 모달 닫기
          TMS.modal.close(this.config.createOrderModalId);
          
          // 폼 초기화
          const form = document.querySelector(`#${this.config.createOrderModalId} form`);
          if (form) form.reset();
          
          // 주문 목록 새로고침
          this.loadOrders();
        } else {
          TMS.notify('error', response.message || '주문 생성에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('주문 생성 오류:', error);
        TMS.notify('error', '주문 생성에 실패했습니다.');
      });
  }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  Dashboard.init();
});

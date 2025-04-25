/**
 * 대시보드 테이블 모듈
 * 주문 테이블 상호작용 및 행 선택 기능 제공
 */
window.DashboardTable = {
  /**
   * 선택된 행 ID 목록
   * @type {Array<string>}
   */
  selectedRows: [],
  
  /**
   * 컬럼 구성
   * @type {Object}
   */
  columns: {
    department: { label: '부서', visible: true },
    type: { label: '유형', visible: true },
    warehouse: { label: '창고', visible: true },
    orderNo: { label: '주문번호', visible: true },
    eta: { label: 'ETA', visible: true },
    status: { label: '상태', visible: true },
    region: { label: '도착지', visible: true },
    customer: { label: '고객명', visible: true },
    driver: { label: '기사명', visible: true }
  },
  
  /**
   * 테이블 모듈을 초기화합니다.
   */
  init: function() {
    this.loadColumnVisibility();
    this.setupEventListeners();
    this.initColumnSelector();
  },
  
  /**
   * 이벤트 리스너를 설정합니다.
   */
  setupEventListeners: function() {
    const table = document.getElementById('orderTable');
    if (!table) return;
    
    // 전체 선택 체크박스
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (event) => {
        this.selectAll(event.target.checked);
      });
    }
    
    // 행 체크박스 이벤트 위임
    const tbody = table.querySelector('tbody');
    if (tbody) {
      tbody.addEventListener('click', (event) => {
        // 체크박스 클릭
        const checkbox = event.target.closest('.row-checkbox');
        if (checkbox) {
          event.stopPropagation(); // 행 클릭 이벤트 전파 중지
          this.selectRow(checkbox.dataset.id, checkbox.checked);
          return;
        }
        
        // 행 클릭 (체크박스 영역 제외)
        const row = event.target.closest('tr[data-id]');
        if (row && !event.target.closest('.checkbox-column')) {
          this.onRowClick(row.dataset.id);
        }
      });
    }
    
    // 새로고침 버튼
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (window.DashboardFilter) {
          DashboardFilter.refreshData();
        } else {
          window.location.reload();
        }
      });
    }
    
    // 컬럼 선택기 토글 버튼
    const columnSelectorBtn = document.getElementById('columnSelectorBtn');
    if (columnSelectorBtn) {
      columnSelectorBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleColumnSelector();
      });
      
      // 컬럼 선택기 외부 클릭 시 닫기
      document.addEventListener('click', (event) => {
        if (!event.target.closest('.column-selector')) {
          this.closeColumnSelector();
        }
      });
    }
  },
  
  /**
   * 컬럼 선택기를 초기화합니다.
   */
  initColumnSelector: function() {
    const columnSelectorContent = document.getElementById('columnSelectorContent');
    if (!columnSelectorContent) return;
    
    // 컬럼 선택기 내용 초기화
    columnSelectorContent.innerHTML = '';
    
    // 각 컬럼에 대한 체크박스 생성
    Object.entries(this.columns).forEach(([key, column]) => {
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'column-checkbox-container';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `column-${key}`;
      checkbox.className = 'column-checkbox';
      checkbox.dataset.column = key;
      checkbox.checked = column.visible;
      
      const label = document.createElement('label');
      label.htmlFor = `column-${key}`;
      label.textContent = column.label;
      
      // 체크박스 변경 이벤트
      checkbox.addEventListener('change', (event) => {
        this.toggleColumnVisibility(key, event.target.checked);
      });
      
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);
      columnSelectorContent.appendChild(checkboxContainer);
    });
  },
  
  /**
   * 컬럼 선택기를 토글합니다.
   */
  toggleColumnSelector: function() {
    const columnSelectorDropdown = document.getElementById('columnSelectorDropdown');
    if (columnSelectorDropdown) {
      const isVisible = columnSelectorDropdown.style.display !== 'none';
      columnSelectorDropdown.style.display = isVisible ? 'none' : 'block';
    }
  },
  
  /**
   * 컬럼 선택기를 닫습니다.
   */
  closeColumnSelector: function() {
    const columnSelectorDropdown = document.getElementById('columnSelectorDropdown');
    if (columnSelectorDropdown) {
      columnSelectorDropdown.style.display = 'none';
    }
  },
  
  /**
   * 로컬 스토리지에서 컬럼 가시성 설정을 로드합니다.
   */
  loadColumnVisibility: function() {
    const savedColumns = Utils.getFromStorage('dashboardColumns');
    if (savedColumns) {
      Object.keys(this.columns).forEach(key => {
        if (savedColumns[key] !== undefined) {
          this.columns[key].visible = savedColumns[key];
          this.updateColumnVisibility(key, savedColumns[key]);
        }
      });
    }
  },
  
  /**
   * 특정 컬럼의 가시성을 토글합니다.
   * @param {string} columnKey - 컬럼 키
   * @param {boolean} visible - 가시성 여부
   */
  toggleColumnVisibility: function(columnKey, visible) {
    this.columns[columnKey].visible = visible;
    this.updateColumnVisibility(columnKey, visible);
    
    // 설정 저장
    const columnSettings = {};
    Object.keys(this.columns).forEach(key => {
      columnSettings[key] = this.columns[key].visible;
    });
    Utils.saveToStorage('dashboardColumns', columnSettings);
  },
  
  /**
   * 특정 컬럼의 가시성을 업데이트합니다.
   * @param {string} columnKey - 컬럼 키
   * @param {boolean} visible - 가시성 여부
   */
  updateColumnVisibility: function(columnKey, visible) {
    const table = document.getElementById('orderTable');
    if (!table) return;
    
    // 컬럼 헤더 업데이트
    const headerCells = table.querySelectorAll(`th.column-${columnKey}`);
    headerCells.forEach(cell => {
      cell.style.display = visible ? '' : 'none';
    });
    
    // 컬럼 데이터 셀 업데이트
    const dataCells = table.querySelectorAll(`td.column-${columnKey}`);
    dataCells.forEach(cell => {
      cell.style.display = visible ? '' : 'none';
    });
  },
  
  /**
   * 행 선택 상태를 토글합니다.
   * @param {string} rowId - 행 ID
   * @param {boolean} selected - 선택 여부
   */
  selectRow: function(rowId, selected) {
    if (!rowId) return;
    
    // 선택된 행 목록 업데이트
    if (selected) {
      if (!this.selectedRows.includes(rowId)) {
        this.selectedRows.push(rowId);
      }
    } else {
      this.selectedRows = this.selectedRows.filter(id => id !== rowId);
    }
    
    // 행 선택 스타일 업데이트
    const row = document.querySelector(`tr[data-id="${rowId}"]`);
    if (row) {
      if (selected) {
        row.classList.add('selected');
      } else {
        row.classList.remove('selected');
      }
    }
    
    // 전체 선택 체크박스 상태 업데이트
    this.updateSelectAllCheckbox();
    
    // 선택된 행 수 업데이트
    this.updateSelectedCount();
  },
  
  /**
   * 모든 행의 선택 상태를 설정합니다.
   * @param {boolean} selected - 선택 여부
   */
  selectAll: function(selected) {
    const table = document.getElementById('orderTable');
    if (!table) return;
    
    // 현재 페이지의 체크박스만 선택
    const checkboxes = table.querySelectorAll('tbody .row-checkbox');
    
    checkboxes.forEach(checkbox => {
      // 체크박스가 있는 행만 처리 (숨겨진 행 제외)
      const row = checkbox.closest('tr');
      if (row && row.style.display !== 'none') {
        checkbox.checked = selected;
        this.selectRow(checkbox.dataset.id, selected);
      }
    });
  },
  
  /**
   * 전체 선택 체크박스 상태를 업데이트합니다.
   */
  updateSelectAllCheckbox: function() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (!selectAllCheckbox) return;
    
    // 현재 페이지의 표시된 체크박스만 고려
    const checkboxes = document.querySelectorAll('#orderTable tbody tr:not([style*="display: none"]) .row-checkbox');
    
    if (checkboxes.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else {
      const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
      
      if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      } else if (checkedCount === checkboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
      } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
      }
    }
  },
  
  /**
   * 선택된 행 수를 업데이트합니다.
   */
  updateSelectedCount: function() {
    const selectedCount = document.getElementById('selectedCount');
    const selectedActions = document.getElementById('selectedActions');
    
    if (selectedCount && selectedActions) {
      const count = this.selectedRows.length;
      
      selectedCount.textContent = `${count}개 선택됨`;
      
      if (count > 0) {
        selectedActions.classList.add('active');
      } else {
        selectedActions.classList.remove('active');
      }
    }
    
    // 상태 변경 버튼에 선택된 행 수 업데이트
    const statusChangeCount = document.getElementById('statusChangeCount');
    if (statusChangeCount) {
      statusChangeCount.textContent = this.selectedRows.length;
    }
    
    // 배차 버튼에 선택된 행 수 업데이트
    const driverAssignCount = document.getElementById('driverAssignCount');
    if (driverAssignCount) {
      driverAssignCount.textContent = this.selectedRows.length;
    }
    
    // 삭제 모달에 선택된 행 수 업데이트
    const deleteOrderCount = document.getElementById('deleteOrderCount');
    if (deleteOrderCount) {
      deleteOrderCount.textContent = this.selectedRows.length;
    }
  },
  
  /**
   * 행 클릭 이벤트를 처리합니다.
   * @param {string} rowId - 행 ID
   */
  onRowClick: function(rowId) {
    if (!rowId) return;
    
    // 상세 정보 모달 표시
    if (window.DashboardModals) {
      DashboardModals.showOrderDetail(rowId);
    }
  },
  
  /**
   * 선택된 행 ID 목록을 반환합니다.
   * @returns {Array<string>} - 선택된 행 ID 목록
   */
  getSelectedRows: function() {
    return [...this.selectedRows];
  },
  
  /**
   * 선택된 행의 상태를 반환합니다.
   * @returns {Object} - 상태별 행 수
   */
  getSelectedRowsStatus: function() {
    const statusCount = {
      waiting: 0,
      in_progress: 0,
      complete: 0,
      issue: 0,
      cancel: 0
    };
    
    this.selectedRows.forEach(rowId => {
      const checkbox = document.querySelector(`.row-checkbox[data-id="${rowId}"]`);
      if (checkbox) {
        const status = checkbox.dataset.status;
        if (status && statusCount[status] !== undefined) {
          statusCount[status]++;
        }
      }
    });
    
    return statusCount;
  },
  
  /**
   * 선택된 행을 초기화합니다.
   */
  clearSelection: function() {
    this.selectedRows.forEach(rowId => {
      const checkbox = document.querySelector(`.row-checkbox[data-id="${rowId}"]`);
      if (checkbox) {
        checkbox.checked = false;
      }
      
      const row = document.querySelector(`tr[data-id="${rowId}"]`);
      if (row) {
        row.classList.remove('selected');
      }
    });
    
    this.selectedRows = [];
    this.updateSelectAllCheckbox();
    this.updateSelectedCount();
  }
};

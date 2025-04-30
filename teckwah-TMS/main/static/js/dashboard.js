/**
 * 대시보드 페이지 스크립트 (하이브리드 방식으로 개선)
 * - SSR: 초기 데이터 로드, 날짜 검색, 주문번호 검색
 * - CSR: 클라이언트 필터링(상태/부서/창고), 컬럼 커스터마이징
 */
document.addEventListener('DOMContentLoaded', function() {
  // 대시보드 모듈
  const Dashboard = {
    // 상태 데이터 (간소화)
    state: {
      orders: [],          // 현재 페이지에 표시할 데이터
      allOrders: [],       // 필터링에 사용할 원본 데이터
      filters: {
        status: '',
        department: '',
        warehouse: ''
      }
    },

    /**
     * 초기화 함수
     */
    init() {
      // DOM 요소 참조 설정
      this.initDomRefs();
      
      // 서버에서 전달받은 초기 데이터 설정
      if (typeof initialData !== 'undefined') {
        console.log('서버에서 받은 초기 데이터 사용');
        
        // 상태에 초기 데이터 설정
        this.state.allOrders = initialData.orders || [];
        this.state.orders = initialData.orders || [];
      }
      
      // 저장된 컬럼 설정 로드
      this.loadColumnSettings();
      
      // 이벤트 리스너 설정
      this.initEventListeners();
    },
    
    /**
     * 저장된 컬럼 설정 로드
     */
    loadColumnSettings() {
      try {
        // 로컬 스토리지에서 컬럼 설정 로드
        const savedColumns = localStorage.getItem('dashboard_columns');
        
        if (savedColumns) {
          // 저장된 설정 파싱
          const columns = JSON.parse(savedColumns);
          
          // 체크박스 상태 업데이트
          columns.forEach(column => {
            const checkbox = document.getElementById(`col_${column}`);
            if (checkbox) {
              checkbox.checked = true;
            }
          });
          
          // 컬럼 설정 적용
          this.updateTableColumns(columns);
          console.log('저장된 컬럼 설정 로드됨:', columns);
        }
      } catch (error) {
        console.error('컬럼 설정 로드 오류:', error);
      }
    },

    /**
     * DOM 요소 참조 초기화
     */
    initDomRefs() {
      // 필터 요소
      this.els = {
        statusFilter: document.getElementById('statusFilter'),
        departmentFilter: document.getElementById('departmentFilter'),
        warehouseFilter: document.getElementById('warehouseFilter'),
        
        // 버튼
        applyFilterBtn: document.getElementById('applyFilterBtn'),
        resetFilterBtn: document.getElementById('resetFilterBtn'),
        
        // 테이블
        tableBody: document.getElementById('dashboardTableBody')
      };
    },

    /**
     * 이벤트 리스너 설정 (간소화)
     */
    initEventListeners() {
      // 컬럼 커스터마이징 관련 이벤트
      this.initColumnSettingsEvents();
      
      // 필터 이벤트 (클라이언트 측 필터링만 담당)
      this.initFilterEvents();
      
      // 테이블 행 클릭 이벤트
      this.initTableRowEvents();
    },
    
    /**
     * 컬럼 설정 관련 이벤트 초기화
     */
    initColumnSettingsEvents() {
      // 컬럼 커스터마이징 버튼 이벤트
      const customizeColumnsBtn = document.getElementById('customizeColumnsBtn');
      if (customizeColumnsBtn) {
        customizeColumnsBtn.addEventListener('click', () => {
          this.showColumnDialog();
        });
      }
      
      // 컬럼 설정 취소 버튼
      const cancelColumnsBtn = document.getElementById('cancelColumnsBtn');
      if (cancelColumnsBtn) {
        cancelColumnsBtn.addEventListener('click', () => {
          this.hideColumnDialog();
        });
      }
      
      // 컬럼 적용 버튼
      const applyColumnsBtn = document.getElementById('applyColumnsBtn');
      if (applyColumnsBtn) {
        applyColumnsBtn.addEventListener('click', () => {
          this.applyColumnSettings();
        });
      }
      
      // 각 컬럼 체크박스의 변경 이벤트 (즉시 미리보기)
      const columnCheckboxes = document.querySelectorAll('#columnSettingsGrid input[type="checkbox"]');
      columnCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          this.previewColumnSettings();
        });
      });
    },
    
    /**
     * 필터 관련 이벤트 초기화 (클라이언트 측 필터링)
     */
    initFilterEvents() {
      // 필터 적용 이벤트 (클라이언트 필터링)
      if (this.els.applyFilterBtn) {
        this.els.applyFilterBtn.addEventListener('click', () => {
          // 필터 값 업데이트 
          this.state.filters.status = this.els.statusFilter.value;
          this.state.filters.department = this.els.departmentFilter.value;
          this.state.filters.warehouse = this.els.warehouseFilter.value;
          
          // 클라이언트 측 필터링 수행
          this.applyClientSideFilters();
        });
      }
      
      // 필터 초기화 이벤트
      if (this.els.resetFilterBtn) {
        this.els.resetFilterBtn.addEventListener('click', () => {
          // 필터 UI 초기화
          this.els.statusFilter.value = '';
          this.els.departmentFilter.value = '';
          this.els.warehouseFilter.value = '';
          
          // 필터 상태 초기화
          this.state.filters.status = '';
          this.state.filters.department = '';
          this.state.filters.warehouse = '';
          
          // 필터 초기화 후 테이블 표시
          this.resetClientFilters();
        });
      }
    },
    
    /**
     * 테이블 행 클릭 이벤트 
     */
    initTableRowEvents() {
      if (this.els.tableBody) {
        this.els.tableBody.addEventListener('click', (e) => {
          const row = e.target.closest('tr');
          if (!row) return;
          
          // 이미 링크를 클릭한 경우 무시 (기본 동작 유지)
          if (e.target.tagName === 'A' || e.target.closest('a')) {
            return;
          }
          
          // 데이터 ID 속성 가져오기
          const dashboardId = row.getAttribute('data-id');
          if (dashboardId) {
            // 상세 페이지로 이동
            window.location.href = `/orders/${dashboardId}`;
          }
        });
      }
    },

    /**
     * 클라이언트 측 필터링 적용
     * 서버에서 로드한 데이터를 상태/부서/창고 필터로 필터링
     */
    applyClientSideFilters() {
      // 필터링 될 원본 데이터
      const originalData = this.state.allOrders || [];
      
      // 필터 상태 가져오기
      const statusFilter = this.state.filters.status;
      const departmentFilter = this.state.filters.department;
      const warehouseFilter = this.state.filters.warehouse;
      
      // 필터가 모두 비어있으면 필터링 건너뛰기
      if (!statusFilter && !departmentFilter && !warehouseFilter) {
        this.resetClientFilters();
        return;
      }
      
      // 필터링 수행
      const filteredData = originalData.filter(order => {
        // 상태 필터
        if (statusFilter && order.status !== statusFilter) {
          return false;
        }
        
        // 부서 필터
        if (departmentFilter && order.department !== departmentFilter) {
          return false;
        }
        
        // 창고 필터
        if (warehouseFilter && order.warehouse !== warehouseFilter) {
          return false;
        }
        
        return true;
      });
      
      // 필터링된 결과 저장
      this.state.orders = filteredData;
      
      // 필터 활성화 상태 표시
      this.updateActiveFilters();
      
      // 테이블 업데이트
      this.renderFilteredTable(filteredData);
    },
    
    /**
     * 필터 초기화 및 전체 데이터 표시
     */
    resetClientFilters() {
      // 모든 데이터 복원
      this.state.orders = this.state.allOrders;
      
      // 필터 버튼 비활성화
      this.updateActiveFilters();
      
      // 전체 테이블 표시
      const allRows = document.querySelectorAll('#dashboardTableBody tr');
      allRows.forEach(row => {
        row.style.display = '';
      });
      
      // 필터링 결과가 없을 때 메시지 처리
      const emptyRow = document.querySelector('#dashboardTableBody .empty-data-row');
      if (emptyRow) {
        emptyRow.style.display = 'none';
      }
      
      // 데이터가 없을 때 처리
      if (this.state.allOrders.length === 0) {
        this.renderEmptyTable();
      }
    },
    
    /**
     * 필터링된 테이블 렌더링 (기존 DOM 구조 활용)
     */
    renderFilteredTable(filteredData) {
      if (!this.els.tableBody) return;
      
      // 각 행 순회하며 필터 조건에 맞는지 확인
      const rows = this.els.tableBody.querySelectorAll('tr:not(.empty-data-row)');
      
      // 모든 행 숨김
      rows.forEach(row => {
        row.style.display = 'none';
      });
      
      // 결과 없음 메시지 초기화
      let emptyRow = this.els.tableBody.querySelector('.empty-data-row');
      if (emptyRow) {
        emptyRow.remove();
      }
      
      // 필터링된 데이터가 없는 경우 결과 없음 메시지 표시
      if (filteredData.length === 0) {
        this.renderEmptyFilterMessage();
        return;
      }
      
      // ID 기준으로 행 표시
      const visibleIds = new Set(filteredData.map(item => item.dashboardId));
      
      rows.forEach(row => {
        const rowId = parseInt(row.getAttribute('data-id'), 10);
        if (visibleIds.has(rowId)) {
          row.style.display = '';
        }
      });
    },
    
    /**
     * 필터 결과 없음 메시지 렌더링
     */
    renderEmptyFilterMessage() {
      if (!this.els.tableBody) return;
      
      // 이미 결과 없음 행이 있으면 내용만 변경
      let emptyRow = this.els.tableBody.querySelector('.empty-data-row');
      
      if (!emptyRow) {
        emptyRow = document.createElement('tr');
        emptyRow.className = 'empty-data-row';
        
        const cell = document.createElement('td');
        cell.colSpan = 9;
        cell.className = 'empty-table';
        
        emptyRow.appendChild(cell);
        this.els.tableBody.appendChild(emptyRow);
      }
      
      const cell = emptyRow.querySelector('td');
      cell.innerHTML = `
        <div class="empty-placeholder">
          <i class="fa-solid fa-filter-circle-xmark"></i>
          <p>필터 조건에 맞는 주문이 없습니다</p>
        </div>
      `;
      
      emptyRow.style.display = '';
    },
    
    /**
     * 빈 테이블 렌더링
     */
    renderEmptyTable() {
      if (!this.els.tableBody) return;
      
      this.els.tableBody.innerHTML = `
        <tr class="empty-data-row">
          <td colspan="9" class="empty-table">
            <div class="empty-placeholder">
              <i class="fa-solid fa-inbox"></i>
              <p>조건에 맞는 주문이 없습니다</p>
            </div>
          </td>
        </tr>
      `;
    },
    
    /**
     * 활성화된 필터 상태 업데이트 (UI 표시만 담당)
     */
    updateActiveFilters() {
      // 필터 상태
      const statusFilter = this.state.filters.status;
      const departmentFilter = this.state.filters.department;
      const warehouseFilter = this.state.filters.warehouse;
      
      // 필터 선택 요소에 활성화 클래스 적용
      const statusEl = this.els.statusFilter;
      if (statusEl) {
        statusEl.classList.toggle('filter-active', Boolean(statusFilter));
      }
      
      const departmentEl = this.els.departmentFilter;
      if (departmentEl) {
        departmentEl.classList.toggle('filter-active', Boolean(departmentFilter));
      }
      
      const warehouseEl = this.els.warehouseFilter;
      if (warehouseEl) {
        warehouseEl.classList.toggle('filter-active', Boolean(warehouseFilter));
      }
      
      // 초기화 버튼 활성화/비활성화
      const resetFilterBtn = this.els.resetFilterBtn;
      if (resetFilterBtn) {
        resetFilterBtn.disabled = !(statusFilter || departmentFilter || warehouseFilter);
      }
    },
    
    /**
     * 컬럼 설정 대화상자 표시
     */
    showColumnDialog() {
      const dialog = document.getElementById('columnDialog');
      if (dialog) {
        dialog.classList.add('active');
      }
    },

    /**
     * 컬럼 설정 대화상자 숨김
     */
    hideColumnDialog() {
      const dialog = document.getElementById('columnDialog');
      if (dialog) {
        dialog.classList.remove('active');
      }
    },

    /**
     * 컬럼 설정 미리보기 (체크박스 변경 시 즉시 적용)
     */
    previewColumnSettings() {
      // 체크된 컬럼 수집
      const selectedColumns = Array.from(document.querySelectorAll('#columnSettingsGrid input[type="checkbox"]:checked'))
        .map(input => input.value);
      
      // 테이블 헤더 업데이트
      this.updateTableColumns(selectedColumns, true);
    },
    
    /**
     * 컬럼 설정 적용 (버튼 클릭 시 최종 적용)
     */
    applyColumnSettings() {
      try {
        // 체크된 컬럼 수집
        const selectedColumns = Array.from(document.querySelectorAll('#columnSettingsGrid input[type="checkbox"]:checked'))
          .map(input => input.value);
        
        // 적어도 1개 이상 선택했는지 검증
        if (selectedColumns.length < 1) {
          alert('최소 1개 이상의 컬럼을 선택해야 합니다.');
          return;
        }
        
        // 로컬 스토리지에 컬럼 설정 저장
        localStorage.setItem('dashboard_columns', JSON.stringify(selectedColumns));
        
        // 테이블 헤더와 데이터 업데이트
        this.updateTableColumns(selectedColumns);
        
        // 대화상자 닫기
        this.hideColumnDialog();
      } catch (error) {
        console.error('컬럼 설정 적용 오류:', error);
        alert('컬럼 설정을 적용하는 중 오류가 발생했습니다.');
      }
    },
    
    /**
     * 테이블 컬럼 업데이트 - 컬럼 표시/숨김 처리
     * @param {Array} columns - 표시할 컬럼 배열
     * @param {boolean} previewOnly - 미리보기 모드 여부
     */
    updateTableColumns(columns, previewOnly = false) {
      // 컬럼 정의 객체
      const columnDefs = [
        {id: 'customer', index: 1, label: '고객'},
        {id: 'type', index: 2, label: '유형'},
        {id: 'status', index: 3, label: '상태'},
        {id: 'department', index: 4, label: '부서'},
        {id: 'warehouse', index: 5, label: '창고'},
        {id: 'eta', index: 6, label: 'ETA'},
        {id: 'region', index: 7, label: '지역'},
        {id: 'driver', index: 8, label: '배송기사'}
      ];
      
      // 테이블 헤더와 본문 참조
      const tableHeader = document.querySelector('#dashboardTable thead tr');
      const tableBody = document.querySelector('#dashboardTable tbody');
      
      if (!tableHeader || !tableBody) return;
      
      // 헤더 셀과 본문 행의 모든 셀 가져오기
      const headerCells = tableHeader.querySelectorAll('th');
      const rows = tableBody.querySelectorAll('tr');
      
      // 각 컬럼 정의 순회
      columnDefs.forEach(col => {
        // 표시 여부 결정
        const visible = columns.includes(col.id);
        
        // 헤더셀 표시/숨김 처리
        if (headerCells[col.index]) {
          headerCells[col.index].style.display = visible ? '' : 'none';
        }
        
        // 미리보기 모드가 아닐 때만 본문 셀 처리
        if (!previewOnly) {
          // 각 행의 해당 셀 표시/숨김 처리
          rows.forEach(row => {
            if (row.cells[col.index]) {
              row.cells[col.index].style.display = visible ? '' : 'none';
            }
          });
        }
      });
    }
  };

  // 대시보드 초기화
  Dashboard.init();

  // 글로벌 스코프에 노출 (디버깅용)
  window.Dashboard = Dashboard;
});
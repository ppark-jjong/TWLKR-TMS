/**
 * 대시보드 페이지 스크립트
 * 통합 버전: 초기 데이터 로드 및 모든 UI 관련 기능을 포함
 */
document.addEventListener('DOMContentLoaded', function () {
  // 대시보드 모듈
  const Dashboard = {
    // 설정 및 상수
    CONFIG: {
      COLUMN_STORAGE_KEY: 'dashboard_columns',
      DEFAULT_COLUMNS: [
        'customer',
        'type',
        'status',
        'department',
        'warehouse',
        'eta',
        'region',
        'driver',
      ],
      SELECTOR: {
        LOADING_OVERLAY: '.loading-overlay',
        DATA_CONTAINER: '#dashboardDataContainer',
        TABLE_BODY: '#dashboardTableBody',
        COLUMN_DIALOG: '#columnDialog',
        COLUMN_CHECKBOXES: '#columnSettingsGrid input[type="checkbox"]',
      },
    },

    // 상태 데이터
    state: {
      orders: [], // 현재 페이지에 표시할 데이터
      allOrders: [], // 필터링에 사용할 원본 데이터
      filters: {
        status: '',
        department: '',
        warehouse: '',
      },
      columns: [], // 표시할 컬럼
      isLoading: true, // 로딩 상태
    },

    // DOM 요소 참조
    els: {},

    /**
     * 초기화 함수
     */
    init() {
      console.log('대시보드 초기화 시작...');

      // 로딩 오버레이 표시
      this.showLoading();

      // DOM 요소 참조 설정
      this.initDomRefs();

      // 초기 데이터 로드
      this.loadInitialData();

      // 저장된 컬럼 설정 로드
      this.loadColumnSettings();

      // 이벤트 리스너 설정
      this.initEventListeners();

      console.log('대시보드 초기화 완료');
    },

    /**
     * DOM 요소 참조 초기화
     */
    initDomRefs() {
      // 필터 요소
      this.els.statusFilter = document.getElementById('statusFilter');
      this.els.departmentFilter = document.getElementById('departmentFilter');
      this.els.warehouseFilter = document.getElementById('warehouseFilter');
      this.els.applyFilterBtn = document.getElementById('applyFilterBtn');
      this.els.resetFilterBtn = document.getElementById('resetFilterBtn');

      // 테이블 요소
      this.els.tableBody = document.querySelector(
        this.CONFIG.SELECTOR.TABLE_BODY
      );
      this.els.tableContainer = document.querySelector('.table-container');

      // 컬럼 설정 요소
      this.els.columnDialog = document.querySelector(
        this.CONFIG.SELECTOR.COLUMN_DIALOG
      );
      this.els.customizeColumnsBtn = document.getElementById(
        'customizeColumnsBtn'
      );
      this.els.cancelColumnsBtn = document.getElementById('cancelColumnsBtn');
      this.els.applyColumnsBtn = document.getElementById('applyColumnsBtn');

      // 기타 요소
      this.els.loadingOverlay = document.querySelector(
        this.CONFIG.SELECTOR.LOADING_OVERLAY
      );
      this.els.refreshBtn = document.getElementById('refreshBtn');
    },

    /**
     * 초기 데이터 로드
     */
    loadInitialData() {
      // 데이터 컨테이너에서 초기 데이터 로드
      const dataContainer = document.querySelector(
        this.CONFIG.SELECTOR.DATA_CONTAINER
      );
      let initialData = {};

      if (dataContainer && dataContainer.dataset.initial) {
        try {
          // 간단하게 JSON 파싱
          initialData = JSON.parse(dataContainer.dataset.initial);
          console.log('초기 데이터 로드 완료');

          // 데이터 유효성 검사
          if (!initialData.orders || !Array.isArray(initialData.orders)) {
            console.warn('유효한 주문 데이터가 없습니다');
            initialData.orders = [];
          }

          // 상태에 초기 데이터 설정
          this.state.allOrders = initialData.orders;
          this.state.orders = initialData.orders;

          // 데이터 렌더링
          this.renderData();
        } catch (e) {
          console.error('초기 데이터 파싱 오류:', e);
          
          // 오류 발생 시 디버깅 정보
          console.error('오류 내용:', e.message);
          console.error('데이터 샘플:', dataContainer.dataset.initial.substring(0, 100));
          
          this.renderEmptyTable('데이터 로드 중 오류가 발생했습니다.');
        }
      } else {
        console.log('초기 데이터가 없습니다');
        this.renderEmptyTable('데이터가 없습니다');
      }

      // 로딩 화면 숨기기
      this.hideLoading();
    },

    /**
     * 데이터 렌더링
     */
    renderData() {
      if (this.state.orders.length === 0) {
        this.renderEmptyTable();
      } else {
        this.renderTable(this.state.orders);
      }
    },

    /**
     * 테이블 렌더링
     * @param {Array} data - 표시할 데이터 배열
     */
    renderTable(data) {
      if (!this.els.tableBody) return;

      // 테이블 본문 비우기
      this.els.tableBody.innerHTML = '';

      // 데이터로 행 생성
      data.forEach((order) => {
        if (!order.dashboardId || !order.status) {
          console.warn('데이터 무결성 문제: 필수 필드 누락', order);
          return;
        }

        const row = document.createElement('tr');
        row.className = `status-${order.status.toLowerCase()}`;
        row.dataset.id = order.dashboardId;
        row.style.cursor = 'pointer';

        row.innerHTML = `
          <td>
            <a href="/orders/${order.dashboardId}" class="order-number">${
          order.orderNo || '번호 없음'
        }</a>
          </td>
          <td>${order.customer || ''}</td>
          <td>${order.typeLabel || ''}</td>
          <td>
            <span class="status-badge status-${order.status.toLowerCase()}">${
          order.statusLabel || order.status
        }</span>
          </td>
          <td>${order.department || ''}</td>
          <td>${order.warehouse || ''}</td>
          <td>${order.eta || ''}</td>
          <td>${order.region || ''}</td>
          <td>${order.driverName || ''}</td>
        `;

        this.els.tableBody.appendChild(row);
      });

      // 열 설정 적용
      if (this.state.columns.length > 0) {
        this.updateTableColumns(this.state.columns);
      }
    },

    /**
     * 빈 테이블 상태 렌더링
     * @param {string} message - 표시할 메시지 (기본값 제공)
     */
    renderEmptyTable(message) {
      if (!this.els.tableBody) return;

      const defaultMessage = '해당 날짜에 주문 데이터가 없습니다';
      const displayMessage = message || defaultMessage;

      // 테이블 본문 비우기
      this.els.tableBody.innerHTML = '';

      // 데이터 없음 메시지 행 생성
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-data-row';
      emptyRow.innerHTML = `
        <td colspan="9" class="empty-table">
          <div class="empty-placeholder">
            <i class="fa-solid fa-inbox"></i>
            <p>${displayMessage}</p>
          </div>
        </td>
      `;

      this.els.tableBody.appendChild(emptyRow);
      
      // 디버깅 정보 표시 (개발 환경에서만 표시)
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('docker')) {
        console.log('디버그 정보: 빈 테이블 렌더링됨', { message: displayMessage });
      }
    },

    /**
     * 필터 적용 시 데이터 없음 상태 렌더링
     */
    renderEmptyFilterMessage() {
      if (!this.els.tableBody) return;

      // 테이블 본문 비우기
      this.els.tableBody.innerHTML = '';

      // 필터 조건 없음 메시지 행 생성
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-data-row';
      emptyRow.innerHTML = `
        <td colspan="9" class="empty-table">
          <div class="empty-placeholder">
            <i class="fa-solid fa-filter"></i>
            <p>필터 조건에 맞는 주문이 없습니다</p>
            <button class="btn secondary-btn reset-filter-btn">
              <i class="fa-solid fa-rotate-left"></i> 필터 초기화
            </button>
          </div>
        </td>
      `;

      // 필터 초기화 버튼 이벤트 핸들러 등록
      const resetBtn = emptyRow.querySelector('.reset-filter-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => this.resetFilters());
      }

      this.els.tableBody.appendChild(emptyRow);
    },

    /**
     * 이벤트 리스너 설정
     */
    initEventListeners() {
      // 새로고침 버튼
      if (this.els.refreshBtn) {
        this.els.refreshBtn.addEventListener('click', () => {
          window.location.reload();
        });
      }

      // 컬럼 설정 관련 이벤트
      this.initColumnEvents();

      // 필터 이벤트
      this.initFilterEvents();

      // 테이블 행 클릭 이벤트
      this.initTableRowEvents();
    },

    /**
     * 컬럼 설정 관련 이벤트 초기화
     */
    initColumnEvents() {
      // 컬럼 설정 버튼
      if (this.els.customizeColumnsBtn) {
        this.els.customizeColumnsBtn.addEventListener('click', () => {
          this.showColumnDialog();
        });
      }

      // 취소 버튼
      if (this.els.cancelColumnsBtn) {
        this.els.cancelColumnsBtn.addEventListener('click', () => {
          this.hideColumnDialog();
        });
      }

      // 적용 버튼
      if (this.els.applyColumnsBtn) {
        this.els.applyColumnsBtn.addEventListener('click', () => {
          this.applyColumnSettings();
        });
      }

      // 각 체크박스 변경 이벤트 (미리보기)
      const checkboxes = document.querySelectorAll(
        this.CONFIG.SELECTOR.COLUMN_CHECKBOXES
      );
      checkboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
          this.previewColumnSettings();
        });
      });
    },

    /**
     * 저장된 컬럼 설정 로드
     */
    loadColumnSettings() {
      try {
        const savedColumns = localStorage.getItem(
          this.CONFIG.COLUMN_STORAGE_KEY
        );

        if (savedColumns) {
          // 저장된 설정 파싱
          const columns = JSON.parse(savedColumns);
          
          // 유효성 검사
          if (!Array.isArray(columns)) {
            throw new Error('저장된 컬럼 설정이 배열이 아님');
          }
          
          // 체크박스 상태 업데이트
          let validColumnCount = 0;
          columns.forEach((column) => {
            const checkbox = document.getElementById(`col_${column}`);
            if (checkbox) {
              checkbox.checked = true;
              validColumnCount++;
            } else {
              console.warn(`컬럼 체크박스를 찾을 수 없음: ${column}`);
            }
          });
          
          // 최소 1개 이상의 유효한 컬럼이 있는지 확인
          if (validColumnCount > 0) {
            this.state.columns = columns;
            console.log('저장된 컬럼 설정 로드됨:', columns);
          } else {
            throw new Error('유효한 컬럼 설정 없음');
          }
        } else {
          // 기본 컬럼 설정 사용
          this.state.columns = this.CONFIG.DEFAULT_COLUMNS;
        }
      } catch (error) {
        console.error('컬럼 설정 로드 오류:', error);
        // 오류 발생 시 기본값 사용
        this.state.columns = this.CONFIG.DEFAULT_COLUMNS;
      }
    },

    /**
     * 컬럼 설정 대화상자 표시
     */
    showColumnDialog() {
      if (this.els.columnDialog) {
        this.els.columnDialog.classList.add('active');
      }
    },

    /**
     * 컬럼 설정 대화상자 숨김
     */
    hideColumnDialog() {
      if (this.els.columnDialog) {
        this.els.columnDialog.classList.remove('active');
      }
    },

    /**
     * 컬럼 설정 미리보기
     */
    previewColumnSettings() {
      const checkboxes = document.querySelectorAll(
        this.CONFIG.SELECTOR.COLUMN_CHECKBOXES + ':checked'
      );
      const selectedColumns = Array.from(checkboxes).map((cb) => cb.value);

      this.updateTableColumns(selectedColumns, true);
    },

    /**
     * 컬럼 설정 적용
     */
    applyColumnSettings() {
      try {
        const checkboxes = document.querySelectorAll(
          this.CONFIG.SELECTOR.COLUMN_CHECKBOXES + ':checked'
        );
        const selectedColumns = Array.from(checkboxes).map((cb) => cb.value);

        // 최소 1개 컬럼 체크 확인
        if (selectedColumns.length < 1) {
          alert('최소 1개 이상의 컬럼을 선택해야 합니다.');
          return;
        }

        // 저장 및 적용
        localStorage.setItem(
          this.CONFIG.COLUMN_STORAGE_KEY,
          JSON.stringify(selectedColumns)
        );
        this.state.columns = selectedColumns;
        this.updateTableColumns(selectedColumns);

        // 대화상자 닫기
        this.hideColumnDialog();
      } catch (error) {
        console.error('컬럼 설정 적용 오류:', error);
        alert('컬럼 설정을 적용하는 중 오류가 발생했습니다.');
      }
    },

    /**
     * 필터 이벤트 초기화
     */
    initFilterEvents() {
      // 필터 적용 버튼
      if (this.els.applyFilterBtn) {
        this.els.applyFilterBtn.addEventListener('click', () => {
          this.state.filters.status = this.els.statusFilter.value;
          this.state.filters.department = this.els.departmentFilter.value;
          this.state.filters.warehouse = this.els.warehouseFilter.value;

          this.applyFilters();
        });
      }

      // 필터 초기화 버튼
      if (this.els.resetFilterBtn) {
        this.els.resetFilterBtn.addEventListener('click', () => {
          this.resetFilters();
        });
      }
    },

    /**
     * 필터 적용
     */
    applyFilters() {
      const { status, department, warehouse } = this.state.filters;

      // 모든 필터가 비어있으면 전체 데이터 표시
      if (!status && !department && !warehouse) {
        this.resetFilters();
        return;
      }

      // 원본 데이터 확인
      if (!this.state.allOrders || !Array.isArray(this.state.allOrders)) {
        console.error('원본 데이터가 유효하지 않음:', typeof this.state.allOrders);
        return;
      }

      // 필터링 수행
      const filtered = this.state.allOrders.filter((order) => {
        if (status && order.status !== status) return false;
        if (department && order.department !== department) return false;
        if (warehouse && order.warehouse !== warehouse) return false;
        return true;
      });

      // 필터링 결과 저장 및 표시
      this.state.orders = filtered;

      if (filtered.length === 0) {
        this.renderEmptyFilterMessage();
      } else {
        this.renderTable(filtered);
      }

      // 필터 UI 업데이트
      this.updateActiveFilters();
    },

    /**
     * 필터 초기화
     */
    resetFilters() {
      // 필터 UI 초기화
      if (this.els.statusFilter) this.els.statusFilter.value = '';
      if (this.els.departmentFilter) this.els.departmentFilter.value = '';
      if (this.els.warehouseFilter) this.els.warehouseFilter.value = '';

      // 필터 상태 초기화
      this.state.filters = {
        status: '',
        department: '',
        warehouse: '',
      };

      // 원본 데이터로 복원
      this.state.orders = this.state.allOrders;
      this.renderData();

      // 필터 UI 업데이트
      this.updateActiveFilters();
    },

    /**
     * 필터 UI 상태 업데이트
     */
    updateActiveFilters() {
      const { status, department, warehouse } = this.state.filters;

      // 필터 선택 요소에 활성화 클래스 적용
      if (this.els.statusFilter) {
        this.els.statusFilter.classList.toggle(
          'filter-active',
          Boolean(status)
        );
      }

      if (this.els.departmentFilter) {
        this.els.departmentFilter.classList.toggle(
          'filter-active',
          Boolean(department)
        );
      }

      if (this.els.warehouseFilter) {
        this.els.warehouseFilter.classList.toggle(
          'filter-active',
          Boolean(warehouse)
        );
      }

      // 초기화 버튼 활성화/비활성화
      if (this.els.resetFilterBtn) {
        this.els.resetFilterBtn.disabled = !(status || department || warehouse);
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

          // 이미 링크를 클릭한 경우 무시
          if (e.target.tagName === 'A' || e.target.closest('a')) {
            return;
          }

          // 데이터 ID 속성이 있으면 상세 페이지로 이동
          const dashboardId = row.getAttribute('data-id');
          if (dashboardId) {
            window.location.href = `/orders/${dashboardId}`;
          }
        });
      }
    },

    /**
     * 테이블 컬럼 업데이트
     * @param {Array} columns - 표시할 컬럼 배열
     * @param {boolean} previewOnly - 미리보기 모드 여부
     */
    updateTableColumns(columns, previewOnly = false) {
      // 컬럼 정의 객체
      const columnDefs = [
        { id: 'customer', index: 1, label: '고객' },
        { id: 'type', index: 2, label: '유형' },
        { id: 'status', index: 3, label: '상태' },
        { id: 'department', index: 4, label: '부서' },
        { id: 'warehouse', index: 5, label: '창고' },
        { id: 'eta', index: 6, label: 'ETA' },
        { id: 'region', index: 7, label: '지역' },
        { id: 'driver', index: 8, label: '배송기사' },
      ];

      // 테이블 헤더와 본문 참조
      const tableHeader = document.querySelector('#dashboardTable thead tr');
      const tableRows = document.querySelectorAll('#dashboardTable tbody tr');

      if (!tableHeader) return;

      // 각 컬럼 정의 순회
      columnDefs.forEach((col) => {
        // 표시 여부 결정
        const visible = columns.includes(col.id);

        // 헤더셀 표시/숨김 처리
        const headerCell = tableHeader.cells[col.index];
        if (headerCell) {
          headerCell.style.display = visible ? '' : 'none';
        }

        // 미리보기 모드가 아닐 때만 본문 셀 처리
        if (!previewOnly) {
          // 각 행의 해당 셀 표시/숨김 처리
          tableRows.forEach((row) => {
            if (row.cells && row.cells[col.index]) {
              row.cells[col.index].style.display = visible ? '' : 'none';
            }
          });
        }
      });
    },

    /**
     * 로딩 오버레이 표시
     */
    showLoading() {
      this.state.isLoading = true;
      if (this.els.loadingOverlay) {
        this.els.loadingOverlay.classList.add('active');
      }
    },

    /**
     * 로딩 오버레이 숨기기
     */
    hideLoading() {
      this.state.isLoading = false;
      if (this.els.loadingOverlay) {
        this.els.loadingOverlay.classList.remove('active');
      }
    },
  };

  // 대시보드 초기화
  Dashboard.init();

  // 전역 접근을 위해 window에 노출 (개발용)
  window.Dashboard = Dashboard;
});
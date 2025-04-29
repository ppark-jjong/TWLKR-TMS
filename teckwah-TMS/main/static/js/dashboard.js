/**
 * 대시보드 페이지 스크립트
 */
document.addEventListener('DOMContentLoaded', function() {
  // 대시보드 모듈
  const Dashboard = {
    // 상태 데이터
    state: {
      orders: [],
      currentPage: 1,
      totalPages: 1,
      pageSize: 10,
      filters: {
        status: '',
        department: '',
        warehouse: '',
        startDate: '',
        endDate: '',
        keyword: ''
      },
      stats: {
        total: 0,
        waiting: 0,
        in_progress: 0,
        complete: 0,
        others: 0
      },
      selectedOrders: new Set()
    },

    /**
     * 초기화 함수
     */
    init() {
      // DOM 요소 참조 설정
      this.initDomRefs();
      
      // 기본 날짜 설정
      this.initDateRange();
      
      // 저장된 컬럼 설정 로드
      this.loadColumnSettings();
      
      // 이벤트 리스너 설정
      this.initEventListeners();
      
      // 초기 데이터 로드
      this.loadData();
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
          
          // 로그만 남기고 테이블 렌더링은 loadData에서 수행
          console.log('저장된 컬럼 설정 로드됨:', columns);
        }
      } catch (error) {
        console.error('컬럼 설정 로드 오류:', error);
        // 오류 발생 시 기본 컬럼으로 계속 진행
      }
    },

    /**
     * DOM 요소 참조 초기화
     */
    initDomRefs() {
      // 필터 요소
      this.els = {
        startDate: document.getElementById('startDate'),
        endDate: document.getElementById('endDate'),
        searchOrderNo: document.getElementById('searchOrderNo'),
        statusFilter: document.getElementById('statusFilter'),
        departmentFilter: document.getElementById('departmentFilter'),
        warehouseFilter: document.getElementById('warehouseFilter'),
        pageSize: document.getElementById('pageSize'),
        
        // 버튼
        searchDateBtn: document.getElementById('searchDateBtn'),
        todayBtn: document.getElementById('todayBtn'),
        searchOrderBtn: document.getElementById('searchOrderBtn'),
        applyFilterBtn: document.getElementById('applyFilterBtn'),
        resetFilterBtn: document.getElementById('resetFilterBtn'),
        refreshBtn: document.getElementById('refreshBtn'),
        newOrderBtn: document.getElementById('newOrderBtn'),
        
        // 테이블
        tableBody: document.getElementById('dashboardTableBody'),
        selectAll: document.getElementById('selectAll'),
        
        // 페이지네이션
        pagination: document.getElementById('pagination'),
        pageInfo: document.getElementById('pageInfo'),
        
        // 통계
        totalOrders: document.getElementById('totalOrders'),
        pendingOrders: document.getElementById('pendingOrders'),
        progressOrders: document.getElementById('progressOrders'),
        completedOrders: document.getElementById('completedOrders'),
        otherOrders: document.getElementById('otherOrders')
      };
    },

    /**
     * 날짜 범위 초기화
     */
    initDateRange() {
      // 오늘 날짜
      const today = Utils.date.today();
      
      // 과거 7일
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = Utils.date.format(sevenDaysAgo);
      
      // 날짜 입력 필드 설정
      if (this.els.startDate) this.els.startDate.value = startDate;
      if (this.els.endDate) this.els.endDate.value = today;
      
      // 상태 업데이트
      this.state.filters.startDate = startDate;
      this.state.filters.endDate = today;
    },

    /**
     * 이벤트 리스너 설정
     */
    initEventListeners() {
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
    
      // 날짜 검색 이벤트 (서버 요청)
      if (this.els.searchDateBtn) {
        this.els.searchDateBtn.addEventListener('click', () => {
          this.state.filters.startDate = this.els.startDate.value;
          this.state.filters.endDate = this.els.endDate.value;
          this.state.currentPage = 1;
          this.loadData(); // 서버 API 호출
        });
      }
      
      // 오늘 버튼 이벤트 (서버 요청)
      if (this.els.todayBtn) {
        this.els.todayBtn.addEventListener('click', () => {
          const today = Utils.date.today();
          this.els.startDate.value = today;
          this.els.endDate.value = today;
          this.state.filters.startDate = today;
          this.state.filters.endDate = today;
          this.state.currentPage = 1;
          this.loadData(); // 서버 API 호출
        });
      }
      
      // 주문번호 검색 이벤트 (서버 요청)
      if (this.els.searchOrderBtn) {
        this.els.searchOrderBtn.addEventListener('click', () => {
          this.state.filters.keyword = this.els.searchOrderNo.value.trim();
          this.state.currentPage = 1;
          this.loadData(); // 서버 API 호출
        });
      }
      
      // 검색어 입력 필드 엔터 이벤트
      if (this.els.searchOrderNo) {
        this.els.searchOrderNo.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.els.searchOrderBtn.click();
          }
        });
      }
      
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
          this.els.searchOrderNo.value = '';
          
          // 필터 상태 초기화
          this.state.filters.status = '';
          this.state.filters.department = '';
          this.state.filters.warehouse = '';
          
          // 검색어가 있었다면 초기화하고 서버 요청
          if (this.state.filters.keyword) {
            this.state.filters.keyword = '';
            this.state.currentPage = 1;
            this.loadData(); // 서버 데이터 새로 로드
          } else {
            // 검색어가 없었다면 클라이언트 필터링만 초기화
            this.applyClientSideFilters();
          }
        });
      }
      
      // 새로고침 버튼 이벤트
      if (this.els.refreshBtn) {
        this.els.refreshBtn.addEventListener('click', () => {
          this.loadData();
        });
      }
      
      // 신규 등록 버튼 이벤트
      if (this.els.newOrderBtn) {
        this.els.newOrderBtn.addEventListener('click', () => {
          // 권한 확인 (일반 사용자도 생성 가능하므로 기본 'USER' 권한 체크)
          if (Utils.auth && Utils.auth.checkPermission('USER')) {
            window.location.href = '/orders/create';
          }
        });
      }
      
      // 페이지 크기 변경 이벤트
      if (this.els.pageSize) {
        this.els.pageSize.addEventListener('change', () => {
          this.state.pageSize = parseInt(this.els.pageSize.value, 10);
          this.state.currentPage = 1;
          this.loadData();
        });
      }
      
      // 전체 선택 체크박스 이벤트
      if (this.els.selectAll) {
        this.els.selectAll.addEventListener('change', () => {
          const isChecked = this.els.selectAll.checked;
          
          // 모든 체크박스 상태 변경
          const checkboxes = this.els.tableBody.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
            
            // 상태 업데이트
            const orderId = checkbox.getAttribute('data-id');
            if (isChecked) {
              this.state.selectedOrders.add(orderId);
            } else {
              this.state.selectedOrders.delete(orderId);
            }
          });
        });
      }
      
      // 페이지네이션 이벤트
      if (this.els.pagination) {
        this.els.pagination.addEventListener('click', (e) => {
          const pageBtn = e.target.closest('.page-btn');
          if (pageBtn) {
            const page = pageBtn.getAttribute('data-page');
            
            if (page === 'prev' && this.state.currentPage > 1) {
              this.state.currentPage--;
              this.loadData();
            } else if (page === 'next' && this.state.currentPage < this.state.totalPages) {
              this.state.currentPage++;
              this.loadData();
            }
          }
        });
      }
    },

    /**
     * 주문 데이터 로드 (서버 API 호출)
     */
    async loadData() {
      try {
        // 로딩 표시
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        
        // API 파라미터 구성
        const params = new URLSearchParams();
        
        // 페이지네이션 파라미터
        params.append('page', this.state.currentPage);
        params.append('page_size', this.state.pageSize);
        
        // 필터 파라미터 (날짜 범위만 서버로 전송)
        if (this.state.filters.startDate) params.append('start_date', this.state.filters.startDate);
        if (this.state.filters.endDate) params.append('end_date', this.state.filters.endDate);
        
        // API 요청
        let url = '/orders?' + params.toString();
        let result;
        
        // 키워드 검색일 경우
        if (this.state.filters.keyword) {
          url = `/search?order_no=${encodeURIComponent(this.state.filters.keyword)}&page=${this.state.currentPage}&page_size=${this.state.pageSize}`;
        }
        
        try {
          // Utils.http 사용하여 API 요청 (세션 관리, 오류 처리 등이 포함됨)
          result = await Utils.http.get(url, { showLoading: false });
        } catch (apiError) {
          // HTTP 유틸이 오류 처리를 담당하므로, 오류 메시지만 상위로 전달
          throw new Error(apiError.message);
        }
        
        // 데이터 처리
        if (result.success) {
          // 서버에서 받은 전체 데이터 저장
          this.state.allOrders = result.data || [];
          
          // 페이지네이션 정보 업데이트
          if (result.pagination) {
            this.state.currentPage = result.pagination.current_page || 1;
            this.state.totalPages = result.pagination.total_pages || 1;
          }
          
          // 통계 정보 업데이트
          if (result.stats) {
            this.state.stats = {
              total: result.stats.total || 0,
              waiting: result.stats.waiting || 0,
              in_progress: result.stats.in_progress || 0,
              complete: result.stats.complete || 0,
              others: result.stats.others || 0
            };
          }
          
          // 클라이언트 측 필터 적용
          this.applyClientSideFilters();
        } else {
          Utils.message.error(result.message || '데이터 로드 실패');
        }
      } catch (error) {
        console.error('주문 데이터 로드 오류:', error);
        Utils.message.error('주문 데이터를 불러오는 중 오류가 발생했습니다.');
        
        // 빈 행으로 테이블 렌더링
        this.renderEmptyTable();
      } finally {
        // 로딩 숨김
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
      }
    },

    /**
     * 테이블 렌더링
     */
    /**
     * 클라이언트 측 필터링 적용
     * 서버에서 로드한 데이터를 상태/부서/창고 필터로 필터링
     */
    applyClientSideFilters() {
      // 필터링 될 원본 데이터
      const originalData = this.state.allOrders || [];
      
      // 필터링 수행
      const filteredData = originalData.filter(order => {
        // 상태 필터
        if (this.state.filters.status && order.status !== this.state.filters.status) {
          return false;
        }
        
        // 부서 필터
        if (this.state.filters.department && order.department !== this.state.filters.department) {
          return false;
        }
        
        // 창고 필터
        if (this.state.filters.warehouse && order.warehouse !== this.state.filters.warehouse) {
          return false;
        }
        
        return true;
      });
      
      // 필터링된 결과 저장
      this.state.orders = filteredData;
      
      // UI 업데이트
      this.renderTable();
      this.updatePagination();
    },
    
    renderTable() {
      if (!this.els.tableBody) return;
      
      // 선택 항목 초기화
      this.state.selectedOrders.clear();
      if (this.els.selectAll) this.els.selectAll.checked = false;
      
      // 주문 데이터가 없는 경우
      if (!this.state.orders || this.state.orders.length === 0) {
        this.renderEmptyTable();
        return;
      }
      
      // 저장된 컬럼 설정 로드
      let columns = [];
      try {
        const savedColumns = localStorage.getItem('dashboard_columns');
        if (savedColumns) {
          columns = JSON.parse(savedColumns);
        }
      } catch (error) {
        console.error('컬럼 설정 로드 오류:', error);
      }
      
      // 저장된 설정이 없으면 기본 컬럼 사용
      if (!columns || columns.length === 0) {
        columns = ['customer', 'type', 'status', 'department', 'warehouse', 'eta', 'driver'];
      }
      
      // 테이블 헤더 업데이트
      this.updateTableColumns(columns);
      
      // 테이블 데이터 렌더링
      this.renderTableWithColumns(columns);
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
     * 통계 정보 업데이트
     */
    updateStats() {
      // 통계 요소 업데이트
      if (this.els.totalOrders) this.els.totalOrders.textContent = `${this.state.stats.total}건`;
      if (this.els.pendingOrders) this.els.pendingOrders.textContent = `${this.state.stats.waiting}건`;
      if (this.els.progressOrders) this.els.progressOrders.textContent = `${this.state.stats.in_progress}건`;
      if (this.els.completedOrders) this.els.completedOrders.textContent = `${this.state.stats.complete}건`;
      if (this.els.otherOrders) this.els.otherOrders.textContent = `${this.state.stats.others}건`;
    },

    /**
     * 페이지네이션 업데이트
     */
    updatePagination() {
      // 페이지 정보 업데이트
      if (this.els.pageInfo) {
        this.els.pageInfo.textContent = `${this.state.currentPage} / ${this.state.totalPages}`;
      }
      
      // 버튼 활성화/비활성화
      const prevBtn = this.els.pagination.querySelector('[data-page="prev"]');
      const nextBtn = this.els.pagination.querySelector('[data-page="next"]');
      
      if (prevBtn) {
        prevBtn.disabled = this.state.currentPage <= 1;
      }
      
      if (nextBtn) {
        nextBtn.disabled = this.state.currentPage >= this.state.totalPages;
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
          Utils.message.error('최소 1개 이상의 컬럼을 선택해야 합니다.');
          return;
        }
        
        // 로컬 스토리지에 컬럼 설정 저장
        localStorage.setItem('dashboard_columns', JSON.stringify(selectedColumns));
        
        // 테이블 헤더와 데이터 업데이트
        this.updateTableColumns(selectedColumns);
        
        // 성공 메시지
        Utils.message.success('컬럼 설정이 적용되었습니다.');
        
        // 대화상자 닫기
        this.hideColumnDialog();
      } catch (error) {
        console.error('컬럼 설정 적용 오류:', error);
        Utils.message.error('컬럼 설정을 적용하는 중 오류가 발생했습니다.');
      }
    },
    
    /**
     * 테이블 컬럼 업데이트
     * @param {Array} columns - 표시할 컬럼 배열
     * @param {boolean} previewOnly - 미리보기 모드 여부
     */
    updateTableColumns(columns, previewOnly = false) {
      // 테이블 헤더 업데이트
      const tableHeader = document.querySelector('#dashboardTable thead tr');
      if (!tableHeader) return;
      
      // 체크박스와 주문번호 컬럼은 항상 표시 (첫 번째, 두 번째 셀)
      const checkboxCell = tableHeader.cells[0];
      const orderNoCell = tableHeader.cells[1];
      
      // 헤더 재구성
      tableHeader.innerHTML = '';
      tableHeader.appendChild(checkboxCell);
      tableHeader.appendChild(orderNoCell);
      
      // 선택된 컬럼 추가
      if (columns.includes('customer')) {
        const cell = document.createElement('th');
        cell.textContent = '고객';
        tableHeader.appendChild(cell);
      }
      
      if (columns.includes('type')) {
        const cell = document.createElement('th');
        cell.textContent = '유형';
        tableHeader.appendChild(cell);
      }
      
      if (columns.includes('status')) {
        const cell = document.createElement('th');
        cell.textContent = '상태';
        tableHeader.appendChild(cell);
      }
      
      if (columns.includes('department')) {
        const cell = document.createElement('th');
        cell.textContent = '부서';
        tableHeader.appendChild(cell);
      }
      
      if (columns.includes('warehouse')) {
        const cell = document.createElement('th');
        cell.textContent = '창고';
        tableHeader.appendChild(cell);
      }
      
      if (columns.includes('eta')) {
        const cell = document.createElement('th');
        cell.textContent = 'ETA';
        tableHeader.appendChild(cell);
      }
      
      if (columns.includes('driver')) {
        const cell = document.createElement('th');
        cell.textContent = '배송기사';
        tableHeader.appendChild(cell);
      }
      
      if (columns.includes('address')) {
        const cell = document.createElement('th');
        cell.textContent = '주소';
        tableHeader.appendChild(cell);
      }
      
      if (columns.includes('contact')) {
        const cell = document.createElement('th');
        cell.textContent = '연락처';
        tableHeader.appendChild(cell);
      }
      
      // 미리보기 모드가 아닌 경우에만 데이터 행 업데이트
      if (!previewOnly) {
        this.renderTableWithColumns(columns);
      }
    },
    
    /**
     * 선택된 컬럼으로 테이블 데이터 렌더링
     * @param {Array} columns - 표시할 컬럼 배열
     */
    renderTableWithColumns(columns) {
      if (!this.els.tableBody) return;
      
      // 선택 항목 초기화
      this.state.selectedOrders.clear();
      if (this.els.selectAll) this.els.selectAll.checked = false;
      
      // 주문 데이터가 없는 경우
      if (!this.state.orders || this.state.orders.length === 0) {
        this.renderEmptyTable();
        return;
      }
      
      let html = '';
      
      // 각 주문에 대한 행 생성
      this.state.orders.forEach(order => {
        const statusClass = `status-${order.status.toLowerCase()}`;
        const statusText = Utils.status.getText(order.status);
        
        let row = `
          <tr class="${statusClass}">
            <td class="checkbox-cell">
              <input type="checkbox" data-id="${order.dashboardId}">
            </td>
            <td>
              <a href="/orders/${order.dashboardId}" class="order-number">${order.orderNo}</a>
            </td>`;
            
        // 선택된 컬럼만 추가
        if (columns.includes('customer')) {
          row += `<td>${order.customer || '-'}</td>`;
        }
        
        if (columns.includes('type')) {
          row += `<td>${order.typeLabel || order.type}</td>`;
        }
        
        if (columns.includes('status')) {
          row += `
            <td>
              <span class="status-badge ${statusClass}">${statusText}</span>
            </td>`;
        }
        
        if (columns.includes('department')) {
          row += `<td>${order.department || '-'}</td>`;
        }
        
        if (columns.includes('warehouse')) {
          row += `<td>${order.warehouse || '-'}</td>`;
        }
        
        if (columns.includes('eta')) {
          row += `<td>${order.eta || '-'}</td>`;
        }
        
        if (columns.includes('driver')) {
          row += `<td>${order.driverName || '-'}</td>`;
        }
        
        if (columns.includes('address')) {
          row += `<td>${order.address || '-'}</td>`;
        }
        
        if (columns.includes('contact')) {
          row += `<td>${order.contact || '-'}</td>`;
        }
        
        row += `</tr>`;
        html += row;
      });
      
      // 테이블 업데이트
      this.els.tableBody.innerHTML = html;
      
      // 행 체크박스 이벤트 바인딩
      this.els.tableBody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          const orderId = checkbox.getAttribute('data-id');
          
          if (checkbox.checked) {
            this.state.selectedOrders.add(orderId);
          } else {
            this.state.selectedOrders.delete(orderId);
            
            // 전체 선택 해제
            if (this.els.selectAll) this.els.selectAll.checked = false;
          }
        });
      });
      
      // 행 클릭 이벤트 (상세 페이지로 이동)
      this.els.tableBody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', (e) => {
          // 체크박스 클릭은 제외
          if (e.target.type === 'checkbox' || e.target.closest('.checkbox-cell')) {
            return;
          }
          
          // 이미 링크를 클릭한 경우 무시 (기본 동작 유지)
          if (e.target.tagName === 'A' || e.target.closest('a')) {
            return;
          }
          
          // 주문 ID 추출
          const checkbox = row.querySelector('input[type="checkbox"]');
          if (checkbox) {
            const orderId = checkbox.getAttribute('data-id');
            // 상세 페이지로 이동
            window.location.href = `/orders/${orderId}`;
          }
        });
        
        // 행에 커서 스타일 추가
        row.style.cursor = 'pointer';
      });
    }
  };

  // 대시보드 초기화
  Dashboard.init();

  // 글로벌 스코프에 노출
  window.Dashboard = Dashboard;
});

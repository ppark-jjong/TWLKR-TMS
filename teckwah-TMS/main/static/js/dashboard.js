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
      
      // 이벤트 리스너 설정
      this.initEventListeners();
      
      // 초기 데이터 로드
      this.loadData();
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
      // 날짜 검색 이벤트
      if (this.els.searchDateBtn) {
        this.els.searchDateBtn.addEventListener('click', () => {
          this.state.filters.startDate = this.els.startDate.value;
          this.state.filters.endDate = this.els.endDate.value;
          this.state.currentPage = 1;
          this.loadData();
        });
      }
      
      // 오늘 버튼 이벤트
      if (this.els.todayBtn) {
        this.els.todayBtn.addEventListener('click', () => {
          const today = Utils.date.today();
          this.els.startDate.value = today;
          this.els.endDate.value = today;
          this.state.filters.startDate = today;
          this.state.filters.endDate = today;
          this.state.currentPage = 1;
          this.loadData();
        });
      }
      
      // 주문번호 검색 이벤트
      if (this.els.searchOrderBtn) {
        this.els.searchOrderBtn.addEventListener('click', () => {
          this.state.filters.keyword = this.els.searchOrderNo.value.trim();
          this.state.currentPage = 1;
          this.loadData();
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
      
      // 필터 적용 이벤트
      if (this.els.applyFilterBtn) {
        this.els.applyFilterBtn.addEventListener('click', () => {
          this.state.filters.status = this.els.statusFilter.value;
          this.state.filters.department = this.els.departmentFilter.value;
          this.state.filters.warehouse = this.els.warehouseFilter.value;
          this.state.currentPage = 1;
          this.loadData();
        });
      }
      
      // 필터 초기화 이벤트
      if (this.els.resetFilterBtn) {
        this.els.resetFilterBtn.addEventListener('click', () => {
          this.els.statusFilter.value = '';
          this.els.departmentFilter.value = '';
          this.els.warehouseFilter.value = '';
          this.els.searchOrderNo.value = '';
          
          this.state.filters.status = '';
          this.state.filters.department = '';
          this.state.filters.warehouse = '';
          this.state.filters.keyword = '';
          this.state.currentPage = 1;
          this.loadData();
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
          window.location.href = '/orders/create';
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
     * 주문 데이터 로드
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
        
        // 필터 파라미터
        if (this.state.filters.startDate) params.append('start_date', this.state.filters.startDate);
        if (this.state.filters.endDate) params.append('end_date', this.state.filters.endDate);
        if (this.state.filters.status) params.append('status', this.state.filters.status);
        if (this.state.filters.department) params.append('department', this.state.filters.department);
        if (this.state.filters.warehouse) params.append('warehouse', this.state.filters.warehouse);
        
        // API 요청
        let url = '/orders?' + params.toString();
        
        // 키워드 검색일 경우
        if (this.state.filters.keyword) {
          url = `/search?order_no=${encodeURIComponent(this.state.filters.keyword)}&page=${this.state.currentPage}&page_size=${this.state.pageSize}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`데이터 로드 오류: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // 데이터 처리
        if (result.success) {
          this.state.orders = result.data || [];
          
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
          
          // UI 업데이트
          this.renderTable();
          this.updateStats();
          this.updatePagination();
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
      
      let html = '';
      
      // 각 주문에 대한 행 생성
      this.state.orders.forEach(order => {
        const statusClass = Utils.status.getClass(order.status);
        const statusText = Utils.status.getText(order.status);
        
        html += `
          <tr class="${statusClass}">
            <td class="checkbox-cell">
              <input type="checkbox" data-id="${order.dashboardId}">
            </td>
            <td>
              <a href="/orders/${order.dashboardId}" class="order-number">${order.orderNo}</a>
            </td>
            <td>${order.customer || '-'}</td>
            <td>${order.typeLabel || order.type}</td>
            <td>
              <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td>${order.department || '-'}</td>
            <td>${order.warehouse || '-'}</td>
            <td>${order.eta || '-'}</td>
            <td>${order.driverName || '-'}</td>
          </tr>
        `;
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
    }
  };

  // 대시보드 초기화
  Dashboard.init();

  // 글로벌 스코프에 노출
  window.Dashboard = Dashboard;
});

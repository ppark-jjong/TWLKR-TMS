/**
 * 대시보드 메인 모듈
 * 여러 하위 모듈을 통합하고 초기화를 담당합니다.
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
    orders: [],
    filteredOrders: [],
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
    
    // 모듈 확장 여부 확인 (각 모듈 파일이 로드되었는지)
    if (!this.datePicker || !this.filters || !this.table || !this.pagination || !this.modal) {
      console.error('[Dashboard] 일부 모듈이 로드되지 않았습니다.');
      // 최소한의 기능만 초기화
      this.initMinimal();
      return;
    }
    
    // 날짜 피커 초기화
    this.datePicker.init();
    
    // 필터 초기화
    this.filters.init();
    
    // 테이블 초기화
    this.table.init();
    
    // 컬럼 선택기 초기화
    this.columnSelector.init();
    
    // 페이지네이션 초기화
    this.pagination.init();
    
    // 버튼 이벤트 연결
    this.initButtons();
    
    // 모달 초기화
    this.modal.init();
    
    console.log('[Dashboard] 초기화 완료');
  },
  
  /**
   * 최소 기능 초기화 (모듈이 없을 경우)
   */
  initMinimal: function() {
    console.log('[Dashboard] 최소 기능으로 초기화합니다.');
    
    // 기본 버튼 이벤트
    this.initButtons();
    
    // 테이블 행 클릭 이벤트
    const orderTable = document.getElementById(this.config.orderTableId);
    if (orderTable) {
      const tbody = orderTable.querySelector('tbody');
      if (tbody) {
        tbody.addEventListener('click', (e) => {
          const row = e.target.closest('tr');
          if (!row || row.classList.contains('no-data-row')) return;
          
          const orderId = row.getAttribute('data-id');
          if (orderId) {
            this.openOrderDetail(orderId);
          }
        });
      }
    }
    
    // 컬럼 선택 버튼
    const columnSelectorBtn = document.getElementById('columnSelectorBtn');
    const columnSelectorDropdown = document.getElementById('columnSelectorDropdown');
    
    if (columnSelectorBtn && columnSelectorDropdown) {
      columnSelectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        columnSelectorDropdown.style.display = 
          columnSelectorDropdown.style.display === 'none' || 
          columnSelectorDropdown.style.display === '' ? 'block' : 'none';
      });
      
      // 문서 클릭 시 드롭다운 닫기
      document.addEventListener('click', (e) => {
        if (!columnSelectorDropdown.contains(e.target) && 
            e.target !== columnSelectorBtn) {
          columnSelectorDropdown.style.display = 'none';
        }
      });
    }
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
    
    // 주문번호 검색인 경우
    if (this.state.search.orderNo) {
      // 주문번호 검색 API 사용
      Api.get(`/search?order_no=${encodeURIComponent(this.state.search.orderNo)}`)
        .then(response => {
          if (response && response.success) {
            // 주문 데이터 저장
            this.state.orders = response.data || [];
            this.state.totalItems = this.state.orders.length;
            
            // 필터 적용
            this.applyFilters();
            
            // 성공 알림
            Notify.success(`검색 결과: ${this.state.orders.length}건의 주문이 조회되었습니다.`);
          } else {
            Notify.error('주문 검색에 실패했습니다.');
          }
        })
        .catch(error => {
          console.error('주문 검색 오류:', error);
          Notify.error('주문 검색에 실패했습니다.');
        })
        .finally(() => {
          if (loadingOverlay) loadingOverlay.style.display = 'none';
        });
      return;
    }
    
    // 일반 조회 API 호출
    Api.get(`/orders?${params.toString()}`)
      .then(response => {
        if (response && response.success) {
          // 주문 데이터 저장
          this.state.orders = response.data || [];
          this.state.totalItems = this.state.orders.length;
          
          // 필터 적용
          this.applyFilters();
          
          // 성공 알림
          Notify.success('주문 목록을 성공적으로 불러왔습니다.');
        } else {
          Notify.error('주문 목록을 불러오는데 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('주문 목록 로드 오류:', error);
        Notify.error('주문 목록을 불러오는데 실패했습니다.');
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
    let filteredOrders = this.state.orders || [];
    
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
    
    // 필터링된 주문 목록 저장
    this.state.filteredOrders = filteredOrders;
    this.state.totalItems = filteredOrders.length;
    
    // 페이지네이션
    const start = (this.state.currentPage - 1) * this.state.pageSize;
    const end = start + this.state.pageSize;
    const pageOrders = filteredOrders.slice(start, end);
    
    // 테이블 업데이트
    this.updateOrderTable(pageOrders);
    
    // 페이지네이션 업데이트
    if (this.pagination) {
      this.pagination.update();
    } else {
      this.updatePagination();
    }
  },
  
  /**
   * 주문 테이블 업데이트
   * @param {Array} orders - 주문 목록
   */
  updateOrderTable: function(orders) {
    const tbody = document.querySelector(`#${this.config.orderTableId} tbody`);
    if (!tbody) return;
    
    // 데이터가 없는 경우 - innerHTML 사용 (최적화)
    if (!orders || orders.length === 0) {
      tbody.innerHTML = `
        <tr class="no-data-row">
          <td colspan="9" class="no-data-cell">데이터가 없습니다</td>
        </tr>
      `;
      return;
    }
    
    // 주문 목록 표시 - HTML 문자열 한 번에 생성 (최적화)
    let html = '';
    
    orders.forEach(order => {
      html += `
        <tr class="clickable-row status-row-${order.status}" data-id="${order.dashboardId}">
          <td class="column-department">${order.department || '-'}</td>
          <td class="column-type">${order.typeLabel || order.type_label || '-'}</td>
          <td class="column-warehouse">${order.warehouse || '-'}</td>
          <td class="column-order-no">${order.orderNo || '-'}</td>
          <td class="column-eta">${order.eta || '-'}</td>
          <td class="column-status">
            <span class="status-badge status-${order.status}">${order.statusLabel || order.status_label || '-'}</span>
          </td>
          <td class="column-region">${order.region || '-'}</td>
          <td class="column-customer">${order.customer || '-'}</td>
          <td class="column-driver">${order.driverName || '-'}</td>
        </tr>
      `;
    });
    
    tbody.innerHTML = html;
    
    // 컬럼 설정 적용
    if (this.columnSelector) {
      this.columnSelector.applySettings();
    } else {
      this.applyColumnSettings();
    }
  },
  
  /**
   * 컬럼 설정 불러오기
   */
  loadColumnSettings: function() {
    const settings = localStorage.getItem('dashboard-columns');
    if (settings) {
      try {
        this.state.columnSettings = JSON.parse(settings);
      } catch (e) {
        console.error('컬럼 설정 파싱 오류:', e);
        this.state.columnSettings = {};
      }
    } else {
      this.state.columnSettings = {};
    }
  },
  
  /**
   * 컬럼 설정 적용
   */
  applyColumnSettings: function() {
    if (!this.state.columnSettings) {
      this.loadColumnSettings();
    }
    
    Object.keys(this.state.columnSettings).forEach(columnName => {
      const visible = this.state.columnSettings[columnName];
      const columns = document.querySelectorAll(`.column-${columnName}`);
      
      columns.forEach(col => {
        col.style.display = visible ? '' : 'none';
      });
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
    
    // 페이지 번호 버튼 생성 - innerHTML 사용 (최적화)
    let pageButtonsHtml = '';
    
    // 표시할 페이지 범위 계산
    let startPage = Math.max(1, this.state.currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    startPage = Math.max(1, endPage - 4);
    
    for (let i = startPage; i <= endPage; i++) {
      const isCurrentPage = i === this.state.currentPage;
      pageButtonsHtml += `
        <button class="pagination-btn ${isCurrentPage ? 'current' : ''}" 
                data-page="${i}">${i}</button>
      `;
    }
    
    pageNumberContainer.innerHTML = pageButtonsHtml;
    
    // 페이지 버튼 클릭 이벤트 - 이벤트 위임 패턴
    pageNumberContainer.addEventListener('click', (e) => {
      const pageBtn = e.target.closest('.pagination-btn');
      if (pageBtn) {
        const page = parseInt(pageBtn.getAttribute('data-page'), 10);
        if (page && page !== this.state.currentPage) {
          this.state.currentPage = page;
          this.applyFilters();
        }
      }
    });
    
    // 페이지네이션 정보 업데이트
    const startItem = this.state.totalItems > 0 ? 
      (this.state.currentPage - 1) * this.state.pageSize + 1 : 0;
    const endItem = Math.min(this.state.currentPage * this.state.pageSize, this.state.totalItems);
    
    paginationInfo.textContent = `총 ${this.state.totalItems}개 항목 중 ${startItem}-${endItem} 표시`;
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
    Modal.show(this.config.orderDetailModalId);
  },
  
  /**
   * 주문 상세 정보 로드
   * @param {string} orderId - 주문 ID
   */
  loadOrderDetail: function(orderId) {
    const modal = document.getElementById(this.config.orderDetailModalId);
    if (!modal) return;
    
    // 로딩 표시 - innerHTML 사용 (적절한 사용 사례)
    modal.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div class="spinner-text">주문 정보를 불러오는 중...</div>
      </div>
    `;
    
    // API 호출
    Api.get(`/orders/${orderId}`)
      .then(response => {
        if (response && response.success) {
          // 주문 상세 정보 표시
          this.displayOrderDetail(response.data);
          
          // 락 상태 확인
          this.state.hasLock = response.data.hasLock || false;
        } else {
          // 오류 표시
          modal.innerHTML = `
            <div class="error-message">
              <i class="fas fa-exclamation-circle"></i>
              <h3>주문 정보를 불러올 수 없습니다</h3>
              <p>${response && response.message || '서버에서 오류가 발생했습니다.'}</p>
              <div class="error-actions">
                <button class="btn primary-btn" data-dismiss="modal">닫기</button>
              </div>
            </div>
          `;
        }
      })
      .catch(error => {
        console.error('주문 상세 로드 오류:', error);
        
        // 오류 표시
        modal.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <h3>주문 정보를 불러올 수 없습니다</h3>
            <p>${error.message || '서버 연결에 실패했습니다.'}</p>
            <div class="error-actions">
              <button class="btn primary-btn" data-dismiss="modal">닫기</button>
            </div>
          </div>
        `;
      });
  },
  
  /**
   * 주문 상세 정보 표시
   * @param {Object} data - 주문 상세 정보
   */
  displayOrderDetail: function(data) {
    const modal = document.getElementById(this.config.orderDetailModalId);
    if (!modal) return;
    
    // 모달 콘텐츠 생성 - innerHTML 사용 (적절한 사용 사례)
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
              <input type="text" value="${data.orderNo || ''}" readonly>
            </div>
            <div class="form-group">
              <label>유형</label>
              <select name="type" disabled>
                <option value="DELIVERY" ${data.type === 'DELIVERY' ? 'selected' : ''}>배송</option>
                <option value="RETURN" ${data.type === 'RETURN' ? 'selected' : ''}>회수</option>
              </select>
            </div>
            <div class="form-group">
              <label>부서</label>
              <select name="department" disabled>
                <option value="CS" ${data.department === 'CS' ? 'selected' : ''}>CS</option>
                <option value="HES" ${data.department === 'HES' ? 'selected' : ''}>HES</option>
                <option value="LENOVO" ${data.department === 'LENOVO' ? 'selected' : ''}>LENOVO</option>
              </select>
            </div>
            <div class="form-group">
              <label>창고</label>
              <select name="warehouse" disabled>
                <option value="SEOUL" ${data.warehouse === 'SEOUL' ? 'selected' : ''}>서울</option>
                <option value="BUSAN" ${data.warehouse === 'BUSAN' ? 'selected' : ''}>부산</option>
                <option value="GWANGJU" ${data.warehouse === 'GWANGJU' ? 'selected' : ''}>광주</option>
                <option value="DAEJEON" ${data.warehouse === 'DAEJEON' ? 'selected' : ''}>대전</option>
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
              <input type="text" value="${data.updateAt || data.updatedAt || '-'}" readonly>
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
    
    // 모달 내 이벤트 처리
    this.initModalEvents(modal);
  },
  
  /**
   * 모달 내 이벤트 초기화
   * @param {HTMLElement} modal - 모달 요소
   */
  initModalEvents: function(modal) {
    if (!modal) return;
    
    // 이벤트 위임으로 모달 내 버튼 이벤트 관리
    modal.addEventListener('click', (e) => {
      // 닫기 버튼
      if (e.target.matches('.modal-close, .close-btn, [data-dismiss="modal"]')) {
        Modal.hide(this.config.orderDetailModalId);
        return;
      }
      
      // 수정 버튼
      if (e.target.matches('.edit-btn')) {
        this.enableOrderEdit();
        return;
      }
      
      // 저장 버튼
      if (e.target.matches('.save-btn')) {
        this.saveOrderChanges();
        return;
      }
      
      // 취소 버튼
      if (e.target.matches('.cancel-btn')) {
        this.disableOrderEdit();
        this.loadOrderDetail(this.state.currentOrderId);
        return;
      }
      
      // 삭제 버튼
      if (e.target.matches('.delete-btn')) {
        this.confirmDeleteOrder();
        return;
      }
    });
  },
  
  /**
   * 주문 편집 활성화
   */
  enableOrderEdit: function() {
    const modal = document.getElementById(this.config.orderDetailModalId);
    if (!modal) return;
    
    // 수정 가능한 필드 활성화 - DOM 조작 (적절한 사용 사례)
    const editableInputs = modal.querySelectorAll('input:not([readonly]), select:not([readonly]), textarea');
    editableInputs.forEach(input => {
      input.disabled = false;
      input.classList.add('editing');
    });
    
    // 버튼 표시 변경 - DOM 조작 (적절한 사용 사례)
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
    
    // 필드 비활성화 - DOM 조작 (적절한 사용 사례)
    const editableInputs = modal.querySelectorAll('input.editing, select.editing, textarea.editing');
    editableInputs.forEach(input => {
      input.disabled = true;
      input.classList.remove('editing');
    });
    
    // 버튼 표시 변경 - DOM 조작 (적절한 사용 사례)
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
    
    Api.post(`/orders/${this.state.currentOrderId}/lock`)
      .then(response => {
        if (response && response.success) {
          this.state.hasLock = true;
          console.log('락 획득 성공');
        } else {
          this.disableOrderEdit();
          Notify.error('편집 락을 획득할 수 없습니다. 다른 사용자가 이미 편집 중일 수 있습니다.');
        }
      })
      .catch(error => {
        console.error('락 획득 오류:', error);
        this.disableOrderEdit();
        Notify.error('편집 락을 획득할 수 없습니다.');
      });
  },
  
  /**
   * 락 해제
   */
  releaseLock: function() {
    if (!this.state.currentOrderId || !this.state.hasLock) return;
    
    Api.delete(`/orders/${this.state.currentOrderId}/lock`)
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
      Notify.error('편집 권한이 없습니다.');
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
      postalCode: Utils.formatPostalCode(modal.querySelector('input[name="postalCode"]').value),
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
      Notify.warning('필수 항목을 모두 입력해주세요.');
      return;
    }
    
    // API 호출
    Api.put(`/orders/${this.state.currentOrderId}`, formData)
      .then(response => {
        if (response && response.success) {
          Notify.success('주문이 성공적으로 업데이트되었습니다.');
          
          // 편집 모드 비활성화
          this.disableOrderEdit();
          
          // 주문 목록 새로고침
          this.loadOrders();
          
          // 상세 정보 새로고침
          this.loadOrderDetail(this.state.currentOrderId);
        } else {
          Notify.error(response.message || '주문 업데이트에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('주문 업데이트 오류:', error);
        Notify.error('주문 업데이트에 실패했습니다.');
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
    
    // 삭제 API 호출
    Api.post('/delete', { ids: [this.state.currentOrderId] })
      .then(response => {
        if (response && response.success) {
          Notify.success('주문이 성공적으로 삭제되었습니다.');
          
          // 모달 닫기
          Modal.hide(this.config.orderDetailModalId);
          
          // 주문 목록 새로고침
          this.loadOrders();
        } else {
          Notify.error(response.message || '주문 삭제에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('주문 삭제 오류:', error);
        Notify.error('주문 삭제에 실패했습니다.');
      });
  },
  
  /**
   * 주문 생성 모달 열기
   */
  openCreateOrderModal: function() {
    Modal.show(this.config.createOrderModalId);
  }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  Dashboard.init();
});

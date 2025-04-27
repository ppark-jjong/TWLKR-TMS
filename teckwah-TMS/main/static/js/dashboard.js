/**
 * 대시보드 메인 모듈 (dashboard-core.js 통합)
 * 대시보드 페이지의 모든 기능을 관리합니다.
 */
window.Dashboard = (function() {
  // 현재 편집 중인 주문 ID 저장 (전역 상태)
  let currentOrderId = null;
  
  /**
   * 초기화 함수
   */
  function init() {
    console.log('[Dashboard] 초기화 시작');
    
    // 1. 모듈 의존성 확인
    if (!checkDependencies()) {
      console.error('[Dashboard] 초기화 실패: 필수 모듈이 로드되지 않았습니다.');
      return;
    }
    
    // 2. 행 클릭 이벤트 등록 (가장 중요)
    initRowClickEvents();
    
    // 3. 필터 이벤트 등록
    initFilterEvents();
    
    // 4. 모달 동작 초기화
    initModalEvents();
    
    // 5. 버튼 액션 초기화
    initActionButtons();
    
    // 6. 기타 초기화
    initMisc();
    
    console.log('[Dashboard] 초기화 완료');
  }
  
  /**
   * 모듈 의존성을 확인합니다.
   * @returns {boolean} - 의존성 확인 결과
   */
  function checkDependencies() {
    const dependencies = [
      { name: 'Utils', module: window.Utils },
      { name: 'API', module: window.API },
      { name: 'Modal', module: window.Modal },
      { name: 'Alerts', module: window.Alerts },
      { name: 'Pagination', module: window.Pagination }
    ];
    
    const missingDependencies = dependencies.filter(dep => !dep.module);
    
    if (missingDependencies.length > 0) {
      console.error('[Dashboard] 누락된 의존성:', missingDependencies.map(dep => dep.name).join(', '));
      
      // 사용자에게 알림
      if (window.Alerts) {
        Alerts.error('일부 필수 스크립트를 로드할 수 없습니다. 페이지를 새로고침하세요.');
      } else {
        alert('일부 필수 스크립트를 로드할 수 없습니다. 페이지를 새로고침하세요.');
      }
      
      return false;
    }
    
    return true;
  }
  
  /**
   * 행 클릭 이벤트 초기화
   */
  function initRowClickEvents() {
    console.log('[Dashboard] 행 클릭 이벤트 초기화');
    
    // 테이블 참조
    const table = document.getElementById('orderTable');
    if (!table) {
      console.warn('[Dashboard] 주문 테이블을 찾을 수 없습니다.');
      return;
    }
    
    // 행 클릭 이벤트 - 직접 등록 방식
    const rows = table.querySelectorAll('tbody tr[data-id]');
    rows.forEach(row => {
      // 행 클릭 이벤트
      row.addEventListener('click', function(event) {
        // 체크박스 영역이 아닌 경우에만 처리
        if (!event.target.closest('.checkbox-column')) {
          const orderId = this.dataset.id;
          console.log('[Dashboard] 행 클릭:', orderId);
          showOrderDetail(orderId);
        }
      });
      
      // 체크박스 클릭 이벤트
      const checkbox = row.querySelector('.row-checkbox');
      if (checkbox) {
        checkbox.addEventListener('click', function(event) {
          event.stopPropagation(); // 상위 이벤트 전파 중지
          const checked = this.checked;
          const orderId = this.dataset.id;
          console.log('[Dashboard] 체크박스 클릭:', orderId, checked);
          selectRow(orderId, checked);
        });
      }
    });
    
    console.log(`[Dashboard] ${rows.length}개 행에 클릭 이벤트 등록 완료`);
    
    // 전체 선택 체크박스
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', function(event) {
        console.log('[Dashboard] 전체 선택:', this.checked);
        selectAll(this.checked);
      });
    }
  }
  
  /**
   * 필터 이벤트 초기화
   */
  function initFilterEvents() {
    console.log('[Dashboard] 필터 이벤트 초기화');
    
    // 상태 필터
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', function() {
        console.log('[Dashboard] 상태 필터 변경:', this.value);
        filterByStatus(this.value);
      });
    }
    
    // 부서 필터
    const departmentFilter = document.getElementById('departmentFilter');
    if (departmentFilter) {
      departmentFilter.addEventListener('change', function() {
        console.log('[Dashboard] 부서 필터 변경:', this.value);
        filterByDepartment(this.value);
      });
    }
    
    // 창고 필터
    const warehouseFilter = document.getElementById('warehouseFilter');
    if (warehouseFilter) {
      warehouseFilter.addEventListener('change', function() {
        console.log('[Dashboard] 창고 필터 변경:', this.value);
        filterByWarehouse(this.value);
      });
    }
    
    // 필터 초기화 버튼
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', function() {
        console.log('[Dashboard] 필터 초기화');
        resetFilters();
      });
    }
    
    // 날짜 검색 버튼
    const searchBtn = document.getElementById('searchBtn');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (searchBtn && startDateInput && endDateInput) {
      // 날짜 필드 초기화 (오늘 날짜)
      if (!startDateInput.value) {
        const today = new Date();
        startDateInput.value = today.toISOString().split('T')[0];
      }
      
      if (!endDateInput.value) {
        const today = new Date();
        endDateInput.value = today.toISOString().split('T')[0];
      }
      
      searchBtn.addEventListener('click', function() {
        console.log('[Dashboard] 날짜 검색:', startDateInput.value, endDateInput.value);
        window.location.href = `/dashboard?startDate=${startDateInput.value}&endDate=${endDateInput.value}`;
      });
    }
    
    // 오늘 버튼
    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
      todayBtn.addEventListener('click', function() {
        console.log('[Dashboard] 오늘 날짜로 이동');
        window.location.href = '/dashboard';
      });
    }
    
    // 주문번호 검색
    const orderNoSearch = document.getElementById('orderNoSearch');
    const orderSearchBtn = document.getElementById('orderSearchBtn');
    
    if (orderNoSearch && orderSearchBtn) {
      // 엔터 키 이벤트
      orderNoSearch.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          searchByOrderNo();
        }
      });
      
      // 검색 버튼 클릭
      orderSearchBtn.addEventListener('click', function() {
        searchByOrderNo();
      });
    }
  }
  
  /**
   * 모달 이벤트 초기화
   */
  function initModalEvents() {
    console.log('[Dashboard] 모달 이벤트 초기화');
    
    // 상세 정보 모달
    initOrderDetailModal();
    
    // 주문 생성 모달
    initCreateOrderModal();
    
    // 상태 변경 모달
    initStatusChangeModal();
    
    // 기사 배정 모달
    initDriverAssignModal();
    
    // 삭제 확인 모달
    initDeleteConfirmModal();
  }
  
  /**
   * 상세 정보 모달 초기화
   */
  function initOrderDetailModal() {
    const orderDetailModal = document.getElementById('orderDetailModal');
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const editOrderBtn = document.getElementById('editOrderBtn');
    const saveOrderBtn = document.getElementById('saveOrderBtn');
    
    if (orderDetailModal) {
      // 닫기 버튼 이벤트
      if (closeDetailModalBtn) {
        closeDetailModalBtn.addEventListener('click', function() {
          hideModal(orderDetailModal);
        });
      }
      
      if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
          hideModal(orderDetailModal);
        });
      }
      
      // 수정하기 버튼 이벤트
      if (editOrderBtn) {
        editOrderBtn.addEventListener('click', function() {
          toggleOrderEditMode(true);
        });
      }
      
      // 저장하기 버튼 이벤트
      if (saveOrderBtn) {
        saveOrderBtn.addEventListener('click', function() {
          saveOrderChanges();
        });
      }
    }
  }
  
  /**
   * 주문 생성 모달 초기화
   */
  function initCreateOrderModal() {
    const createOrderBtn = document.getElementById('createOrderBtn');
    const createOrderModal = document.getElementById('createOrderModal');
    const closeCreateModalBtn = document.getElementById('closeCreateModalBtn');
    const cancelCreateBtn = document.getElementById('cancelCreateBtn');
    const submitCreateBtn = document.getElementById('submitCreateBtn');
    
    if (createOrderBtn && createOrderModal) {
      createOrderBtn.addEventListener('click', function() {
        showModal(createOrderModal);
        
        // ETA 기본값 설정 (내일 12시)
        const createETAInput = document.getElementById('createETA');
        if (createETAInput && !createETAInput.value) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(12, 0, 0, 0);
          createETAInput.value = tomorrow.toISOString().slice(0, 16);
        }
      });
      
      if (closeCreateModalBtn) {
        closeCreateModalBtn.addEventListener('click', function() {
          hideModal(createOrderModal);
        });
      }
      
      if (cancelCreateBtn) {
        cancelCreateBtn.addEventListener('click', function() {
          hideModal(createOrderModal);
        });
      }
      
      if (submitCreateBtn) {
        submitCreateBtn.addEventListener('click', function() {
          submitCreateOrder();
        });
      }
    }
  }
  
  /**
   * 상태 변경 모달 초기화
   */
  function initStatusChangeModal() {
    const selectedStatusBtn = document.getElementById('selectedStatusBtn');
    const statusChangeModal = document.getElementById('statusChangeModal');
    const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
    const cancelStatusBtn = document.getElementById('cancelStatusBtn');
    const submitStatusBtn = document.getElementById('submitStatusBtn');
    
    if (selectedStatusBtn && statusChangeModal) {
      selectedStatusBtn.addEventListener('click', function() {
        const selectedRows = getSelectedRows();
        if (selectedRows.length === 0) {
          Utils.showAlert('변경할 주문을 먼저 선택해주세요.', 'warning');
          return;
        }
        
        updateStatusOptions();
        showModal(statusChangeModal);
        
        // 선택된 행 수 업데이트
        const statusChangeCount = document.getElementById('statusChangeCount');
        if (statusChangeCount) {
          statusChangeCount.textContent = selectedRows.length;
        }
      });
      
      if (closeStatusModalBtn) {
        closeStatusModalBtn.addEventListener('click', function() {
          hideModal(statusChangeModal);
        });
      }
      
      if (cancelStatusBtn) {
        cancelStatusBtn.addEventListener('click', function() {
          hideModal(statusChangeModal);
        });
      }
      
      if (submitStatusBtn) {
        submitStatusBtn.addEventListener('click', function() {
          submitStatusChange();
        });
      }
    }
  }
  
  /**
   * 기사 배정 모달 초기화
   */
  function initDriverAssignModal() {
    const selectedDriverBtn = document.getElementById('selectedDriverBtn');
    const driverAssignModal = document.getElementById('driverAssignModal');
    const closeDriverModalBtn = document.getElementById('closeDriverModalBtn');
    const cancelDriverBtn = document.getElementById('cancelDriverBtn');
    const submitDriverBtn = document.getElementById('submitDriverBtn');
    
    if (selectedDriverBtn && driverAssignModal) {
      selectedDriverBtn.addEventListener('click', function() {
        const selectedRows = getSelectedRows();
        if (selectedRows.length === 0) {
          Utils.showAlert('배차할 주문을 먼저 선택해주세요.', 'warning');
          return;
        }
        
        showModal(driverAssignModal);
        
        // 선택된 행 수 업데이트
        const driverAssignCount = document.getElementById('driverAssignCount');
        if (driverAssignCount) {
          driverAssignCount.textContent = selectedRows.length;
        }
      });
      
      if (closeDriverModalBtn) {
        closeDriverModalBtn.addEventListener('click', function() {
          hideModal(driverAssignModal);
        });
      }
      
      if (cancelDriverBtn) {
        cancelDriverBtn.addEventListener('click', function() {
          hideModal(driverAssignModal);
        });
      }
      
      if (submitDriverBtn) {
        submitDriverBtn.addEventListener('click', function() {
          submitDriverAssign();
        });
      }
    }
  }
  
  /**
   * 삭제 확인 모달 초기화
   */
  function initDeleteConfirmModal() {
    const selectedDeleteBtn = document.getElementById('selectedDeleteBtn');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    if (selectedDeleteBtn && deleteConfirmModal) {
      selectedDeleteBtn.addEventListener('click', function() {
        const selectedRows = getSelectedRows();
        if (selectedRows.length === 0) {
          Utils.showAlert('삭제할 주문을 먼저 선택해주세요.', 'warning');
          return;
        }
        
        showModal(deleteConfirmModal);
        
        // 선택된 행 수 업데이트
        const deleteOrderCount = document.getElementById('deleteOrderCount');
        if (deleteOrderCount) {
          deleteOrderCount.textContent = selectedRows.length;
        }
      });
      
      if (closeDeleteModalBtn) {
        closeDeleteModalBtn.addEventListener('click', function() {
          hideModal(deleteConfirmModal);
        });
      }
      
      if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', function() {
          hideModal(deleteConfirmModal);
        });
      }
      
      if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
          submitOrderDelete();
        });
      }
    }
  }
  
  /**
   * 버튼 액션 초기화
   */
  function initActionButtons() {
    console.log('[Dashboard] 액션 버튼 초기화');
    
    // 새로고침 버튼
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        console.log('[Dashboard] 새로고침');
        window.location.reload();
      });
    }
    
    // 모달 창 닫기 버튼들 (공통)
    document.querySelectorAll('.close-btn, [data-dismiss="modal"]').forEach(btn => {
      btn.addEventListener('click', function() {
        const modal = this.closest('.modal');
        if (modal) {
          hideModal(modal);
        }
      });
    });
  }
  
  /**
   * 기타 초기화 작업
   */
  function initMisc() {
    console.log('[Dashboard] 기타 초기화');
    
    // 우편번호 입력 필드 이벤트 (4자리 → 5자리 변환)
    document.querySelectorAll('input[name="postalCode"]').forEach(input => {
      input.addEventListener('blur', function() {
        const postalCode = this.value.trim();
        if (postalCode.length === 4 && /^\d{4}$/.test(postalCode)) {
          this.value = Utils.formatPostalCode(postalCode);
        }
      });
    });
    
    // 컬럼 가시성 초기화
    initColumnVisibility();
  }
  
  /**
   * 컬럼 가시성을 초기화합니다.
   */
  function initColumnVisibility() {
    const columnSelectorBtn = document.getElementById('columnSelectorBtn');
    const columnSelectorDropdown = document.getElementById('columnSelectorDropdown');
    const columnSelectorContent = document.getElementById('columnSelectorContent');
    
    if (columnSelectorBtn && columnSelectorDropdown && columnSelectorContent) {
      // 칼럼 토글 버튼 이벤트
      columnSelectorBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        columnSelectorDropdown.style.display = columnSelectorDropdown.style.display === 'none' ? 'block' : 'none';
        
        // 첫 클릭 시에만 컬럼 체크박스 생성
        if (columnSelectorContent.children.length === 0) {
          loadColumnOptions();
        }
      });
      
      // 외부 클릭 시 드롭다운 닫기
      document.addEventListener('click', function(e) {
        if (!columnSelectorBtn.contains(e.target) && !columnSelectorDropdown.contains(e.target)) {
          columnSelectorDropdown.style.display = 'none';
        }
      });
    }
    
    // 저장된 컬럼 가시성 설정 로드
    loadColumnVisibility();
  }
  
  /**
   * 컬럼 옵션을 로드합니다.
   */
  function loadColumnOptions() {
    const columnSelectorContent = document.getElementById('columnSelectorContent');
    if (!columnSelectorContent) return;
    
    // 모든 컬럼 헤더에서 컬럼 정보 추출
    const columns = [];
    document.querySelectorAll('#orderTable th').forEach(th => {
      // 첫 번째 체크박스 컬럼은 항상 표시해야 함
      if (th.classList.contains('checkbox-column')) return;
      
      const columnClass = Array.from(th.classList).find(cls => cls.startsWith('column-'));
      if (columnClass) {
        const columnName = columnClass.replace('column-', '');
        const columnLabel = th.textContent.trim();
        
        columns.push({
          name: columnName,
          label: columnLabel,
          class: columnClass
        });
      }
    });
    
    // 저장된 설정 로드
    const savedVisibility = localStorage.getItem('orderTableColumns');
    const visibilitySettings = savedVisibility ? JSON.parse(savedVisibility) : {};
    
    // 컬럼 체크박스 생성
    columns.forEach(column => {
      const isVisible = visibilitySettings[column.name] === undefined ? true : visibilitySettings[column.name];
      
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'column-checkbox-container';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `column-${column.name}`;
      checkbox.className = 'column-checkbox';
      checkbox.dataset.column = column.name;
      checkbox.dataset.class = column.class;
      checkbox.checked = isVisible;
      
      const label = document.createElement('label');
      label.htmlFor = `column-${column.name}`;
      label.textContent = column.label;
      
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);
      columnSelectorContent.appendChild(checkboxContainer);
      
      // 체크박스 변경 이벤트
      checkbox.addEventListener('change', function() {
        toggleColumnVisibility(column.name, column.class, this.checked);
      });
    });
  }
  
  /**
   * 컬럼 가시성 설정을 로드합니다.
   */
  function loadColumnVisibility() {
    const savedVisibility = localStorage.getItem('orderTableColumns');
    if (!savedVisibility) return;
    
    const visibilitySettings = JSON.parse(savedVisibility);
    
    // 각 컬럼에 가시성 설정 적용
    Object.entries(visibilitySettings).forEach(([columnName, isVisible]) => {
      const columnClass = `column-${columnName}`;
      toggleColumnVisibility(columnName, columnClass, isVisible, false);
    });
  }
  
  /**
   * 컬럼 가시성을 토글합니다.
   * @param {string} columnName - 컬럼 이름
   * @param {string} columnClass - 컬럼 클래스
   * @param {boolean} visible - 표시 여부
   * @param {boolean} [save=true] - 설정 저장 여부
   */
  function toggleColumnVisibility(columnName, columnClass, visible, save = true) {
    // 헤더와 셀에 가시성 적용
    document.querySelectorAll(`th.${columnClass}, td.${columnClass}`).forEach(el => {
      el.style.display = visible ? '' : 'none';
    });
    
    // 설정 저장
    if (save) {
      const savedVisibility = localStorage.getItem('orderTableColumns');
      const visibilitySettings = savedVisibility ? JSON.parse(savedVisibility) : {};
      
      visibilitySettings[columnName] = visible;
      localStorage.setItem('orderTableColumns', JSON.stringify(visibilitySettings));
    }
  }
  
  /**
   * 모달 표시
   */
  function showModal(modal) {
    if (!modal) return;
    
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('active');
    }, 10);
  }
  
  /**
   * 모달 숨김
   */
  function hideModal(modal) {
    if (!modal) return;
    
    modal.classList.remove('active');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
  
  /**
   * 주문 상세 정보를 표시합니다.
   * @param {string} orderId - 주문 ID
   */
  async function showOrderDetail(orderId) {
    if (!orderId) return;
    
    console.log('[Dashboard] 주문 상세 정보 표시:', orderId);
    
    // 현재 주문 ID 저장 (전역 상태)
    currentOrderId = orderId;
    
    // 모달 요소 참조
    const modal = document.getElementById('orderDetailModal');
    const modalContent = document.getElementById('orderDetailContent');
    const modalSpinner = document.getElementById('modalLoadingSpinner');
    
    if (!modal || !modalContent) {
      console.error('[Dashboard] 모달 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 초기 상태로 모달 설정
    modalContent.innerHTML = '';
    if (modalSpinner) {
      modalSpinner.style.display = 'flex';
    }
    
    // 모달 표시
    showModal(modal);
    
    try {
      // 주문 상세 정보 로드
      const response = await fetchOrderDetail(orderId);
      
      if (modalSpinner) {
        modalSpinner.style.display = 'none';
      }
      
      if (response.success) {
        // 모달 내용 업데이트
        renderOrderDetail(modalContent, response.data);
        
        // 수정 버튼 상태 업데이트
        const editBtn = document.getElementById('editOrderBtn');
        if (editBtn) {
          // 관리자 또는 락이 없는 경우 수정 가능
          const userRole = document.body.dataset.userRole || 'USER';
          const isAdmin = userRole === 'ADMIN';
          
          editBtn.disabled = !isAdmin && response.data.isLocked;
          editBtn.title = editBtn.disabled ? 
            '다른 사용자가 편집 중이거나 권한이 없습니다' : 
            '주문 정보를 수정합니다';
        }
      } else {
        Utils.showAlert(response.message || '주문 정보를 불러오는 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('[Dashboard] 상세 정보 로드 중 오류:', error);
      Utils.showAlert('주문 정보를 불러오는 중 오류가 발생했습니다.', 'error');
      
      if (modalSpinner) {
        modalSpinner.style.display = 'none';
      }
    }
  }
  
  /**
   * 주문 상세 정보 API 호출
   */
  async function fetchOrderDetail(orderId) {
    try {
      const response = await fetch(`/dashboard/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP 오류: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('[Dashboard] API 오류:', error);
      return { 
        success: false, 
        message: '서버 통신 중 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 주문 상세 정보 렌더링
   */
  function renderOrderDetail(container, orderData) {
    if (!container || !orderData) return;
    
    // 상세 정보 렌더링 로직...
    // (기존 DashboardModals.renderOrderDetail 함수 참조)
    
    // 간단한 예시 구현
    const html = `
      <div class="order-detail">
        <div class="detail-section">
          <h3>기본 정보</h3>
          <div class="detail-row">
            <div class="detail-label">주문번호:</div>
            <div class="detail-value">${orderData.orderNo || '-'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">상태:</div>
            <div class="detail-value">
              <span class="status-badge status-${orderData.status || 'waiting'}">${orderData.statusLabel || '대기'}</span>
            </div>
          </div>
          <!-- 추가 정보 렌더링 -->
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  }
  
  /**
   * 주문 수정 모드 전환
   */
  function toggleOrderEditMode(isEdit) {
    const saveBtn = document.getElementById('saveOrderBtn');
    const editBtn = document.getElementById('editOrderBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    
    if (saveBtn) saveBtn.style.display = isEdit ? 'block' : 'none';
    if (editBtn) editBtn.style.display = isEdit ? 'none' : 'block';
    if (closeBtn) closeBtn.style.display = isEdit ? 'none' : 'block';
    
    // 입력 필드 상태 업데이트
    const form = document.getElementById('orderDetailForm');
    if (form) {
      const inputs = form.querySelectorAll('input:not([type="hidden"]):not([id^="detailCreated"]):not([id^="detailDepart"]):not([id^="detailComplete"]):not([id^="detailStatus"]):not([id^="detailUpdated"])');
      const selects = form.querySelectorAll('select');
      
      inputs.forEach(input => {
        input.readOnly = !isEdit;
        
        // 일부 필드는 편집 불가
        if (['detailOrderNo', 'detailRegion', 'detailDistance'].includes(input.id)) {
          input.readOnly = true;
        }
      });
      
      selects.forEach(select => {
        select.disabled = !isEdit;
      });
    }
  }
  
  /**
   * 주문 변경사항 저장
   */
  async function saveOrderChanges() {
    const form = document.getElementById('orderDetailForm');
    const orderId = currentOrderId;
    
    if (!form || !orderId) return;
    
    // 폼 유효성 검사
    if (!validateForm(form)) {
      Utils.showAlert('필수 항목을 모두 입력해주세요.', 'warning');
      return;
    }
    
    // 폼 데이터 수집
    const formData = Utils.getFormData(form);
    
    try {
      Utils.toggleLoading(true);
      
      // API 호출
      const response = await updateOrder(orderId, formData);
      
      if (response.success) {
        Utils.showAlert('주문 정보가 성공적으로 업데이트되었습니다.', 'success');
        toggleOrderEditMode(false);
        hideModal(document.getElementById('orderDetailModal'));
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        Utils.showAlert(response.message || '주문 수정 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('[Dashboard] 주문 수정 중 오류:', error);
      Utils.showAlert('주문 수정 중 오류가 발생했습니다.', 'error');
    } finally {
      Utils.toggleLoading(false);
    }
  }
  
  /**
   * 주문 수정 API 호출
   */
  async function updateOrder(orderId, data) {
    return API.put(`/dashboard/orders/${orderId}`, data);
  }
  
  /**
   * 주문 생성 제출
   */
  async function submitCreateOrder() {
    const form = document.getElementById('createOrderForm');
    if (!form) return;
    
    // 폼 유효성 검사
    if (!validateForm(form)) {
      Utils.showAlert('필수 항목을 모두 입력해주세요.', 'warning');
      return;
    }
    
    // 폼 데이터 수집
    const formData = Utils.getFormData(form);
    
    // 우편번호 형식 처리
    if (formData.postalCode) {
      formData.postalCode = Utils.formatPostalCode(formData.postalCode);
    }
    
    try {
      Utils.toggleLoading(true);
      
      // API 호출
      const response = await createOrder(formData);
      
      if (response.success) {
        Utils.showAlert('주문이 성공적으로 생성되었습니다.', 'success');
        hideModal(document.getElementById('createOrderModal'));
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        Utils.showAlert(response.message || '주문 생성 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('[Dashboard] 주문 생성 중 오류:', error);
      Utils.showAlert('주문 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      Utils.toggleLoading(false);
    }
  }
  
  /**
   * 주문 생성 API 호출
   */
  async function createOrder(data) {
    return API.post('/dashboard/orders', data);
  }
  
  /**
   * 상태 변경 옵션 업데이트
   */
  function updateStatusOptions() {
    const statusSelect = document.getElementById('changeStatus');
    if (!statusSelect) return;
    
    // 선택된 행의 상태 확인
    const selectedRowsStatus = getSelectedRowsStatus();
    
    // 초기화
    statusSelect.innerHTML = '<option value="">선택하세요</option>';
    
    // 권한 확인
    const userRole = document.body.dataset.userRole || 'USER';
    const isAdmin = userRole === 'ADMIN';
    
    // 가능한 상태 변경 옵션 설정
    const statusOptions = [];
    
    if (isAdmin) {
      // 관리자는 모든 상태로 변경 가능
      statusOptions.push(
        { value: 'WAITING', label: '대기' },
        { value: 'IN_PROGRESS', label: '진행 중' },
        { value: 'COMPLETE', label: '완료' },
        { value: 'ISSUE', label: '이슈' },
        { value: 'CANCEL', label: '취소' }
      );
    } else {
      // 일반 사용자는 제한된 상태 변경만 가능
      
      // 대기 → 진행 중
      if (selectedRowsStatus.WAITING > 0) {
        statusOptions.push({ value: 'IN_PROGRESS', label: '진행 중' });
      }
      
      // 진행 중 → 완료/이슈/취소
      if (selectedRowsStatus.IN_PROGRESS > 0) {
        statusOptions.push(
          { value: 'COMPLETE', label: '완료' },
          { value: 'ISSUE', label: '이슈' },
          { value: 'CANCEL', label: '취소' }
        );
      }
    }
    
    // 옵션 추가
    statusOptions.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      statusSelect.appendChild(optionEl);
    });
  }
  
  /**
   * 상태 변경 제출
   */
  async function submitStatusChange() {
    const form = document.getElementById('statusChangeForm');
    if (!form) return;
    
    // 폼 유효성 검사
    if (!validateForm(form)) {
      Utils.showAlert('변경할 상태를 선택해주세요.', 'warning');
      return;
    }
    
    // 폼 데이터 수집
    const formData = Utils.getFormData(form);
    
    // 선택된 행 ID 목록 추가
    const selectedRows = getSelectedRows();
    formData.orderIds = selectedRows;
    
    try {
      Utils.toggleLoading(true);
      
      // API 호출
      const response = await changeStatus(formData);
      
      if (response.success) {
        Utils.showAlert(`${response.data?.count || 0}건의 주문 상태가 성공적으로 변경되었습니다.`, 'success');
        hideModal(document.getElementById('statusChangeModal'));
        clearSelection();
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        Utils.showAlert(response.message || '상태 변경 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('[Dashboard] 상태 변경 중 오류:', error);
      Utils.showAlert('상태 변경 중 오류가 발생했습니다.', 'error');
    } finally {
      Utils.toggleLoading(false);
    }
  }
  
  /**
   * 상태 변경 API 호출
   * @param {Object} data - 변경 데이터
   */
  async function changeStatus(data) {
    return API.post('/dashboard/status', data);
  }
  
  /**
   * 기사 배정 제출
   */
  async function submitDriverAssign() {
    const form = document.getElementById('driverAssignForm');
    if (!form) return;
    
    // 폼 유효성 검사
    if (!validateForm(form)) {
      Utils.showAlert('기사 이름을 입력해주세요.', 'warning');
      return;
    }
    
    // 폼 데이터 수집
    const formData = Utils.getFormData(form);
    
    // 선택된 행 ID 목록 추가
    const selectedRows = getSelectedRows();
    formData.orderIds = selectedRows;
    
    try {
      Utils.toggleLoading(true);
      
      // API 호출
      const response = await assignDriver(formData);
      
      if (response.success) {
        Utils.showAlert(`${response.data?.count || 0}건의 주문이 성공적으로 배차 처리되었습니다.`, 'success');
        hideModal(document.getElementById('driverAssignModal'));
        clearSelection();
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        Utils.showAlert(response.message || '배차 처리 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('[Dashboard] 배차 처리 중 오류:', error);
      Utils.showAlert('배차 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      Utils.toggleLoading(false);
    }
  }
  
  /**
   * 기사 배정 API 호출
   * @param {Object} data - 배정 데이터
   */
  async function assignDriver(data) {
    return API.post('/dashboard/driver', data);
  }
  
  /**
   * 주문 삭제 제출
   */
  async function submitOrderDelete() {
    // 권한 확인
    const userRole = document.body.dataset.userRole || 'USER';
    const isAdmin = userRole === 'ADMIN';
    
    if (!isAdmin) {
      Utils.showAlert('주문 삭제 권한이 없습니다.', 'error');
      return;
    }
    
    // 선택된 행 ID 목록
    const selectedRows = getSelectedRows();
    if (selectedRows.length === 0) {
      Utils.showAlert('삭제할 주문을 먼저 선택해주세요.', 'warning');
      return;
    }
    
    try {
      Utils.toggleLoading(true);
      
      // API 호출
      const response = await deleteOrders({ orderIds: selectedRows });
      
      if (response.success) {
        Utils.showAlert(`${response.data?.count || 0}건의 주문이 성공적으로 삭제되었습니다.`, 'success');
        hideModal(document.getElementById('deleteConfirmModal'));
        clearSelection();
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        Utils.showAlert(response.message || '주문 삭제 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('[Dashboard] 주문 삭제 중 오류:', error);
      Utils.showAlert('주문 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      Utils.toggleLoading(false);
    }
  }
  
  /**
   * 주문 삭제 API 호출
   * @param {Object} data - 삭제 데이터
   */
  async function deleteOrders(data) {
    return API.post('/dashboard/delete', data);
  }
  
  /**
   * 상태별로 행을 필터링합니다.
   * @param {string} status - 상태 값
   */
  function filterByStatus(status) {
    // 테이블 행 필터링
    const rows = document.querySelectorAll('#orderTable tbody tr[data-id]');
    let visibleCount = 0;
    
    rows.forEach(row => {
      const statusBadge = row.querySelector('.status-badge');
      if (!status || (statusBadge && statusBadge.classList.contains(`status-${status}`))) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });
    
    // 필터 상태 업데이트
    updateFilterState();
    
    // 선택된 행 수 업데이트
    updateSelectedCount();
    
    // 데이터 없음 메시지 처리
    toggleNoDataMessage(visibleCount === 0);
  }
  
  /**
   * 부서별로 행을 필터링합니다.
   * @param {string} department - 부서 값
   */
  function filterByDepartment(department) {
    // 테이블 행 필터링
    const rows = document.querySelectorAll('#orderTable tbody tr[data-id]');
    let visibleCount = 0;
    
    rows.forEach(row => {
      const deptCell = row.querySelector('.column-department');
      if (!department || (deptCell && deptCell.textContent.trim() === department)) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });
    
    // 필터 상태 업데이트
    updateFilterState();
    
    // 선택된 행 수 업데이트
    updateSelectedCount();
    
    // 데이터 없음 메시지 처리
    toggleNoDataMessage(visibleCount === 0);
  }
  
  /**
   * 창고별로 행을 필터링합니다.
   * @param {string} warehouse - 창고 값
   */
  function filterByWarehouse(warehouse) {
    // 테이블 행 필터링
    const rows = document.querySelectorAll('#orderTable tbody tr[data-id]');
    let visibleCount = 0;
    
    rows.forEach(row => {
      const warehouseCell = row.querySelector('.column-warehouse');
      if (!warehouse || (warehouseCell && warehouseCell.textContent.trim() === warehouse)) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });
    
    // 필터 상태 업데이트
    updateFilterState();
    
    // 선택된 행 수 업데이트
    updateSelectedCount();
    
    // 데이터 없음 메시지 처리
    toggleNoDataMessage(visibleCount === 0);
  }
  
  /**
   * 필터 초기화
   */
  function resetFilters() {
    // 필터 UI 초기화
    const statusFilter = document.getElementById('statusFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    const warehouseFilter = document.getElementById('warehouseFilter');
    
    if (statusFilter) statusFilter.value = '';
    if (departmentFilter) departmentFilter.value = '';
    if (warehouseFilter) warehouseFilter.value = '';
    
    // 모든 행 표시
    const rows = document.querySelectorAll('#orderTable tbody tr[data-id]');
    rows.forEach(row => {
      row.style.display = '';
    });
    
    // 필터 상태 초기화
    updateFilterState();
    
    // 선택된 행 수 업데이트
    updateSelectedCount();
    
    // 데이터 없음 메시지 처리
    toggleNoDataMessage(rows.length === 0);
  }
  
  /**
   * 필터 상태 업데이트
   */
  function updateFilterState() {
    // 상태 필터 값
    const statusFilter = document.getElementById('statusFilter');
    const statusValue = statusFilter ? statusFilter.value : '';
    
    // 부서 필터 값
    const departmentFilter = document.getElementById('departmentFilter');
    const departmentValue = departmentFilter ? departmentFilter.value : '';
    
    // 창고 필터 값
    const warehouseFilter = document.getElementById('warehouseFilter');
    const warehouseValue = warehouseFilter ? warehouseFilter.value : '';
    
    // URL 매개변수 업데이트 (페이지 새로고침 없음)
    const url = new URL(window.location.href);
    
    if (statusValue) {
      url.searchParams.set('status', statusValue);
    } else {
      url.searchParams.delete('status');
    }
    
    if (departmentValue) {
      url.searchParams.set('department', departmentValue);
    } else {
      url.searchParams.delete('department');
    }
    
    if (warehouseValue) {
      url.searchParams.set('warehouse', warehouseValue);
    } else {
      url.searchParams.delete('warehouse');
    }
    
    window.history.pushState({}, '', url);
  }
  
  /**
   * 주문번호로 검색
   */
  function searchByOrderNo() {
    const orderNoSearch = document.getElementById('orderNoSearch');
    if (!orderNoSearch) return;
    
    const orderNo = orderNoSearch.value.trim();
    
    if (orderNo) {
      // 주문번호 검색은 서버 사이드 렌더링으로 처리
      window.location.href = `/dashboard?orderNo=${encodeURIComponent(orderNo)}`;
    } else {
      // 검색어가 비어있으면 기본 페이지로 이동
      window.location.href = '/dashboard';
    }
  }
  
  /**
   * 행 선택 처리
   * @param {string} rowId - 행 ID
   * @param {boolean} selected - 선택 여부
   */
  function selectRow(rowId, selected) {
    if (!rowId) return;
    
    // 행 요소 찾기
    const row = document.querySelector(`tr[data-id="${rowId}"]`);
    if (!row) return;
    
    // 체크박스 요소 찾기
    const checkbox = row.querySelector('.row-checkbox');
    if (checkbox) {
      checkbox.checked = selected;
    }
    
    // 행 선택 스타일 업데이트
    if (selected) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
    
    // 전체 선택 체크박스 상태 업데이트
    updateSelectAllCheckbox();
    
    // 선택된 행 수 업데이트
    updateSelectedCount();
  }
  
  /**
   * 전체 행 선택 처리
   * @param {boolean} selected - 선택 여부
   */
  function selectAll(selected) {
    // 표시된 행만 선택
    const visibleRows = Array.from(document.querySelectorAll('#orderTable tbody tr[data-id]')).filter(
      row => row.style.display !== 'none'
    );
    
    visibleRows.forEach(row => {
      const rowId = row.dataset.id;
      selectRow(rowId, selected);
    });
  }
  
  /**
   * 전체 선택 체크박스 상태 업데이트
   */
  function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (!selectAllCheckbox) return;
    
    // 표시된 행만 고려
    const visibleCheckboxes = Array.from(document.querySelectorAll('#orderTable tbody tr:not([style*="display: none"]) .row-checkbox'));
    
    if (visibleCheckboxes.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else {
      const checkedCount = visibleCheckboxes.filter(cb => cb.checked).length;
      
      if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      } else if (checkedCount === visibleCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
      } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
      }
    }
  }
  
  /**
   * 선택된 행 수 업데이트
   */
  function updateSelectedCount() {
    const selectedCount = document.getElementById('selectedCount');
    const selectedActions = document.getElementById('selectedActions');
    
    if (!selectedCount || !selectedActions) return;
    
    // 선택된 행 수 계산
    const checkedCheckboxes = document.querySelectorAll('#orderTable tbody .row-checkbox:checked');
    const count = checkedCheckboxes.length;
    
    // 텍스트 업데이트
    selectedCount.textContent = `${count}개 선택됨`;
    
    // 선택 액션 패널 표시/숨김
    if (count > 0) {
      selectedActions.classList.add('active');
    } else {
      selectedActions.classList.remove('active');
    }
    
    // 기타 카운터 업데이트
    const statusChangeCount = document.getElementById('statusChangeCount');
    if (statusChangeCount) {
      statusChangeCount.textContent = count;
    }
    
    const driverAssignCount = document.getElementById('driverAssignCount');
    if (driverAssignCount) {
      driverAssignCount.textContent = count;
    }
    
    const deleteOrderCount = document.getElementById('deleteOrderCount');
    if (deleteOrderCount) {
      deleteOrderCount.textContent = count;
    }
  }
  
  /**
   * 데이터 없음 메시지 표시/숨김
   * @param {boolean} show - 표시 여부
   */
  function toggleNoDataMessage(show) {
    const tbody = document.querySelector('#orderTable tbody');
    if (!tbody) return;
    
    // 기존 메시지 찾기
    let noDataRow = tbody.querySelector('.no-data-row');
    
    if (show) {
      // 메시지 표시
      if (!noDataRow) {
        noDataRow = document.createElement('tr');
        noDataRow.className = 'no-data-row';
        
        const noDataCell = document.createElement('td');
        noDataCell.colSpan = '11';
        noDataCell.className = 'no-data-cell';
        noDataCell.textContent = '데이터가 없습니다';
        
        noDataRow.appendChild(noDataCell);
        tbody.appendChild(noDataRow);
      }
      noDataRow.style.display = '';
    } else if (noDataRow) {
      // 메시지 숨김
      noDataRow.style.display = 'none';
    }
  }
  
  /**
   * 선택된 행 ID 배열 반환
   * @returns {Array<string>} - 선택된 행 ID 배열
   */
  function getSelectedRows() {
    const selectedCheckboxes = document.querySelectorAll('#orderTable tbody .row-checkbox:checked');
    return Array.from(selectedCheckboxes).map(checkbox => checkbox.dataset.id);
  }
  
  /**
   * 선택된 행의 상태별 개수 반환
   * @returns {Object} - 상태별 개수
   */
  function getSelectedRowsStatus() {
    const statusCount = {
      WAITING: 0,
      IN_PROGRESS: 0,
      COMPLETE: 0,
      ISSUE: 0,
      CANCEL: 0
    };
    
    const selectedCheckboxes = document.querySelectorAll('#orderTable tbody .row-checkbox:checked');
    selectedCheckboxes.forEach(checkbox => {
      const status = checkbox.dataset.status;
      if (status && statusCount[status] !== undefined) {
        statusCount[status]++;
      }
    });
    
    return statusCount;
  }
  
  /**
   * 행 선택 초기화
   */
  function clearSelection() {
    const checkboxes = document.querySelectorAll('#orderTable tbody .row-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
      const row = checkbox.closest('tr');
      if (row) {
        row.classList.remove('selected');
      }
    });
    
    // 전체 선택 체크박스 상태 업데이트
    updateSelectAllCheckbox();
    
    // 선택된 행 수 업데이트
    updateSelectedCount();
  }
  
  /**
   * 폼 유효성 검사
   * @param {HTMLFormElement} form - 폼 요소
   * @returns {boolean} - 유효성 검사 결과
   */
  function validateForm(form) {
    if (!form || !(form instanceof HTMLFormElement)) {
      return false;
    }
    
    let isValid = true;
    
    // 기존 유효성 검증 상태 제거
    form.querySelectorAll('.is-invalid').forEach(input => {
      input.classList.remove('is-invalid');
    });
    
    form.querySelectorAll('.invalid-feedback').forEach(feedback => {
      feedback.remove();
    });
    
    // required 속성 확인
    form.querySelectorAll('[required]').forEach(input => {
      if (input.disabled || input.hidden) return;
      
      let fieldValue = input.value.trim();
      let isFieldValid = true;
      let errorMessage = '';
      
      // 값 존재 여부 검사
      if (!fieldValue) {
        isFieldValid = false;
        errorMessage = '이 필드는 필수입니다.';
      }
      // 패턴 검사
      else if (input.pattern && !new RegExp(input.pattern).test(fieldValue)) {
        isFieldValid = false;
        errorMessage = input.title || '올바른 형식이 아닙니다.';
      }
      // 유형별 검사
      else if (input.type === 'email' && !/\S+@\S+\.\S+/.test(fieldValue)) {
        isFieldValid = false;
        errorMessage = '유효한 이메일 주소를 입력하세요.';
      }
      
      // 유효하지 않은 필드 표시
      if (!isFieldValid) {
        isValid = false;
        input.classList.add('is-invalid');
        
        // 오류 메시지 추가
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = errorMessage;
        
        if (input.parentNode) {
          input.parentNode.appendChild(feedback);
        }
      }
    });
    
    return isValid;
  }
  
  // 공개 API
  return {
    // 초기화 함수
    init,
    
    // 테이블 관련 함수
    onRowClick: showOrderDetail,
    onCheckboxClick: selectRow,
    
    // 필터 관련 함수
    filterByStatus,
    filterByDepartment,
    filterByWarehouse,
    resetFilters,
    
    // 주문 관련 함수
    showOrderDetail,
    createOrder,
    updateOrder,
    deleteOrders,
    
    // 상태/배차 관련 함수
    changeStatus,
    assignDriver,
    
    // 상태 관리 함수
    initColumnVisibility,
    selectRow,
    selectAll,
    clearSelection
  };
})();

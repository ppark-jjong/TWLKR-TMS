/**
 * 대시보드 모달 관리 모듈
 * 주문 상세, 생성, 수정, 상태 변경, 배차, 삭제 모달 관리
 */
window.DashboardModals = {
  /**
   * 현재 편집 중인 주문 ID
   */
  currentOrderId: null,
  
  /**
   * 모달 모듈을 초기화합니다.
   */
  init: function() {
    this.setupEventListeners();
  },
  
  /**
   * 이벤트 리스너를 설정합니다.
   */
  setupEventListeners: function() {
    // 주문 상세 모달 이벤트
    const orderDetailModal = document.getElementById('orderDetailModal');
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const editOrderBtn = document.getElementById('editOrderBtn');
    const saveOrderBtn = document.getElementById('saveOrderBtn');
    
    if (orderDetailModal) {
      // 닫기 버튼 이벤트
      if (closeDetailModalBtn) {
        closeDetailModalBtn.addEventListener('click', () => {
          this.hideOrderDetail();
        });
      }
      
      if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
          this.hideOrderDetail();
        });
      }
      
      // 수정하기 버튼 이벤트
      if (editOrderBtn) {
        editOrderBtn.addEventListener('click', () => {
          this.toggleOrderDetailEdit(true);
        });
      }
      
      // 저장하기 버튼 이벤트
      if (saveOrderBtn) {
        saveOrderBtn.addEventListener('click', () => {
          this.saveOrderDetail();
        });
      }
    }
    
    // 주문 생성 모달 이벤트
    const createOrderBtn = document.getElementById('createOrderBtn');
    const closeCreateModalBtn = document.getElementById('closeCreateModalBtn');
    const cancelCreateBtn = document.getElementById('cancelCreateBtn');
    const submitCreateBtn = document.getElementById('submitCreateBtn');
    
    if (createOrderBtn) {
      createOrderBtn.addEventListener('click', () => {
        this.showCreateOrderModal();
      });
    }
    
    if (closeCreateModalBtn) {
      closeCreateModalBtn.addEventListener('click', () => {
        this.hideCreateOrderModal();
      });
    }
    
    if (cancelCreateBtn) {
      cancelCreateBtn.addEventListener('click', () => {
        this.hideCreateOrderModal();
      });
    }
    
    if (submitCreateBtn) {
      submitCreateBtn.addEventListener('click', () => {
        this.submitCreateOrder();
      });
    }
    
    // 기사 배정 모달 이벤트
    const selectedDriverBtn = document.getElementById('selectedDriverBtn');
    const closeDriverModalBtn = document.getElementById('closeDriverModalBtn');
    const cancelDriverBtn = document.getElementById('cancelDriverBtn');
    const submitDriverBtn = document.getElementById('submitDriverBtn');
    
    if (selectedDriverBtn) {
      selectedDriverBtn.addEventListener('click', () => {
        this.showDriverAssignModal();
      });
    }
    
    if (closeDriverModalBtn) {
      closeDriverModalBtn.addEventListener('click', () => {
        this.hideDriverAssignModal();
      });
    }
    
    if (cancelDriverBtn) {
      cancelDriverBtn.addEventListener('click', () => {
        this.hideDriverAssignModal();
      });
    }
    
    if (submitDriverBtn) {
      submitDriverBtn.addEventListener('click', () => {
        this.submitDriverAssign();
      });
    }
    
    // 상태 변경 모달 이벤트
    const selectedStatusBtn = document.getElementById('selectedStatusBtn');
    const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
    const cancelStatusBtn = document.getElementById('cancelStatusBtn');
    const submitStatusBtn = document.getElementById('submitStatusBtn');
    
    if (selectedStatusBtn) {
      selectedStatusBtn.addEventListener('click', () => {
        this.showStatusChangeModal();
      });
    }
    
    if (closeStatusModalBtn) {
      closeStatusModalBtn.addEventListener('click', () => {
        this.hideStatusChangeModal();
      });
    }
    
    if (cancelStatusBtn) {
      cancelStatusBtn.addEventListener('click', () => {
        this.hideStatusChangeModal();
      });
    }
    
    if (submitStatusBtn) {
      submitStatusBtn.addEventListener('click', () => {
        this.submitStatusChange();
      });
    }
    
    // 삭제 확인 모달 이벤트
    const selectedDeleteBtn = document.getElementById('selectedDeleteBtn');
    const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    if (selectedDeleteBtn) {
      selectedDeleteBtn.addEventListener('click', () => {
        this.showDeleteConfirmModal();
      });
    }
    
    if (closeDeleteModalBtn) {
      closeDeleteModalBtn.addEventListener('click', () => {
        this.hideDeleteConfirmModal();
      });
    }
    
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', () => {
        this.hideDeleteConfirmModal();
      });
    }
    
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        this.submitOrderDelete();
      });
    }
    
    // 우편번호 입력 필드 이벤트 (4자리 → 5자리 변환)
    const postalCodeInputs = document.querySelectorAll('input[name="postalCode"]');
    postalCodeInputs.forEach(input => {
      input.addEventListener('blur', () => {
        const postalCode = input.value.trim();
        if (postalCode.length === 4 && /^\d{4}$/.test(postalCode)) {
          input.value = Utils.formatPostalCode(postalCode);
        }
      });
    });
  },
  
  /**
   * 주문 상세 정보 모달을 표시합니다.
   * @param {string} orderId - 주문 ID
   */
  showOrderDetail: async function(orderId) {
    if (!orderId) return;
    
    this.currentOrderId = orderId;
    
    // 모달 요소 참조
    const modal = document.getElementById('orderDetailModal');
    const modalContent = document.getElementById('orderDetailContent');
    const modalSpinner = document.getElementById('modalLoadingSpinner');
    const editBtn = document.getElementById('editOrderBtn');
    
    // 초기 상태로 모달 설정
    if (modalContent) {
      modalContent.innerHTML = '';
      if (modalSpinner) {
        modalSpinner.style.display = 'flex';
      }
    }
    
    // 편집 모드 초기화
    this.toggleOrderDetailEdit(false);
    
    // 모달 표시
    Modal.show(modal);
    
    try {
      // 주문 상세 정보 로드
      const response = await API.get(`/dashboard/orders/${orderId}`);
      
      if (response.success) {
        // 락 상태 확인
        const lockResponse = await Utils.checkLock(orderId);
        const canEdit = lockResponse.canEdit || false;
        
        // 수정 버튼 활성화/비활성화
        if (editBtn) {
          editBtn.disabled = !canEdit;
          editBtn.title = canEdit ? 
            '주문 정보를 수정합니다' :
            '다른 사용자가 편집 중이거나 권한이 없습니다';
        }
        
        // 모달 내용 업데이트
        if (modalContent) {
          this.renderOrderDetail(modalContent, response.data, canEdit);
        }
      } else {
        Alerts.error(response.message || '주문 정보를 불러오는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('주문 상세 정보 로드 중 오류:', error);
      Alerts.error('주문 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      // 로딩 스피너 숨김
      if (modalSpinner) {
        modalSpinner.style.display = 'none';
      }
    }
  },
  
  /**
   * 주문 상세 정보를 렌더링합니다.
   * @param {Element} container - 내용을 렌더링할 컨테이너
   * @param {Object} order - 주문 데이터
   * @param {boolean} canEdit - 편집 가능 여부
   */
  renderOrderDetail: function(container, order, canEdit) {
    if (!container || !order) return;
    
    // 상세 정보 HTML 생성
    let html = `
      <div class="order-detail">
        <form id="orderDetailForm" class="order-form">
          <div class="form-section">
            <h3>기본 정보</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="detailOrderNo">주문번호</label>
                <input type="text" id="detailOrderNo" name="orderNo" value="${order.orderNo || ''}" required readonly data-original="${order.orderNo || ''}">
              </div>
              <div class="form-group">
                <label for="detailType">유형</label>
                <select id="detailType" name="type" required disabled data-original="${order.type || ''}">
                  <option value="">선택하세요</option>
                  ${this.renderOptions(window.typeOptions || [], order.type)}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="detailDepartment">부서</label>
                <select id="detailDepartment" name="department" required disabled data-original="${order.department || ''}">
                  <option value="">선택하세요</option>
                  ${this.renderOptions(window.departmentOptions || [], order.department)}
                </select>
              </div>
              <div class="form-group">
                <label for="detailWarehouse">창고</label>
                <select id="detailWarehouse" name="warehouse" required disabled data-original="${order.warehouse || ''}">
                  <option value="">선택하세요</option>
                  ${this.renderOptions(window.warehouseOptions || [], order.warehouse)}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="detailSLA">SLA</label>
                <input type="text" id="detailSLA" name="sla" value="${order.sla || ''}" required readonly data-original="${order.sla || ''}">
              </div>
              <div class="form-group">
                <label for="detailETA">ETA</label>
                <input type="datetime-local" id="detailETA" name="eta" value="${this.formatDatetimeLocal(order.eta)}" required readonly data-original="${this.formatDatetimeLocal(order.eta)}">
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>배송 정보</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="detailPostalCode">우편번호</label>
                <input type="text" id="detailPostalCode" name="postalCode" value="${order.postalCode || ''}" required readonly maxlength="5" data-original="${order.postalCode || ''}">
              </div>
              <div class="form-group full-width">
                <label for="detailAddress">주소</label>
                <input type="text" id="detailAddress" name="address" value="${order.address || ''}" required readonly data-original="${order.address || ''}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="detailRegion">지역</label>
                <input type="text" id="detailRegion" name="region" value="${order.region || ''}" readonly data-original="${order.region || ''}">
              </div>
              <div class="form-group">
                <label for="detailDistance">거리 (km)</label>
                <input type="text" id="detailDistance" name="distance" value="${order.distance || ''}" readonly data-original="${order.distance || ''}">
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>고객 정보</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="detailCustomer">고객명</label>
                <input type="text" id="detailCustomer" name="customer" value="${order.customer || ''}" required readonly data-original="${order.customer || ''}">
              </div>
              <div class="form-group">
                <label for="detailContact">연락처</label>
                <input type="text" id="detailContact" name="contact" value="${order.contact || ''}" required readonly pattern="010-[0-9]{4}-[0-9]{4}" data-original="${order.contact || ''}">
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>상태 정보</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="detailStatus">현재 상태</label>
                <div class="status-badge-container">
                  <span class="status-badge status-${order.status || 'waiting'}">${order.statusLabel || '대기'}</span>
                </div>
              </div>
              <div class="form-group">
                <label for="detailDriverName">기사명</label>
                <input type="text" id="detailDriverName" name="driverName" value="${order.driverName || ''}" readonly data-original="${order.driverName || ''}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="detailDriverContact">기사 연락처</label>
                <input type="text" id="detailDriverContact" name="driverContact" value="${order.driverContact || ''}" readonly pattern="010-[0-9]{4}-[0-9]{4}" data-original="${order.driverContact || ''}">
              </div>
              <div class="form-group">
                <label for="detailVehicleType">차량 유형</label>
                <input type="text" id="detailVehicleType" name="vehicleType" value="${order.vehicleType || ''}" readonly data-original="${order.vehicleType || ''}">
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>시간 기록</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="detailCreatedAt">등록 시간</label>
                <input type="text" id="detailCreatedAt" value="${this.formatDateTime(order.createdAt)}" readonly>
              </div>
              <div class="form-group">
                <label for="detailDepartTime">출발 시간</label>
                <input type="text" id="detailDepartTime" value="${this.formatDateTime(order.departTime)}" readonly>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="detailCompleteTime">완료 시간</label>
                <input type="text" id="detailCompleteTime" value="${this.formatDateTime(order.completeTime)}" readonly>
              </div>
              <div class="form-group">
                <label for="detailStatusTime">상태 업데이트 시간</label>
                <input type="text" id="detailStatusTime" value="${this.formatDateTime(order.updatedAt)}" readonly>
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>마지막 업데이트</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="detailUpdatedBy">최종 처리자</label>
                <input type="text" id="detailUpdatedBy" value="${order.updatedBy || '-'}" readonly>
              </div>
              <div class="form-group">
                <label for="detailUpdatedAt">최종 처리 시간</label>
                <input type="text" id="detailUpdatedAt" value="${this.formatDateTime(order.updatedAt)}" readonly>
              </div>
            </div>
          </div>
        </form>
      </div>
    `;
    
    // 모달 내용 업데이트
    container.innerHTML = html;
  },
  
  /**
   * 주문 상세 정보 편집 모드를 토글합니다.
   * @param {boolean} edit - 편집 모드 여부
   */
  toggleOrderDetailEdit: function(edit) {
    const saveBtn = document.getElementById('saveOrderBtn');
    const editBtn = document.getElementById('editOrderBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    
    if (saveBtn) saveBtn.style.display = edit ? 'block' : 'none';
    if (editBtn) editBtn.style.display = edit ? 'none' : 'block';
    if (closeBtn) closeBtn.style.display = edit ? 'none' : 'block';
    
    // 입력 필드 상태 업데이트
    const form = document.getElementById('orderDetailForm');
    if (form) {
      const inputs = form.querySelectorAll('input:not([type="hidden"]):not([id^="detailCreated"]):not([id^="detailDepart"]):not([id^="detailComplete"]):not([id^="detailStatus"]):not([id^="detailUpdated"])');
      const selects = form.querySelectorAll('select');
      
      inputs.forEach(input => {
        input.readOnly = !edit;
        
        // 일부 필드는 편집 불가
        if (['detailOrderNo', 'detailRegion', 'detailDistance'].includes(input.id)) {
          input.readOnly = true;
        }
      });
      
      selects.forEach(select => {
        select.disabled = !edit;
      });
    }
  },
  
  /**
   * 주문 상세 정보를 저장합니다.
   */
  saveOrderDetail: async function() {
    const form = document.getElementById('orderDetailForm');
    if (!form || !this.currentOrderId) return;
    
    // 폼 유효성 검사
    if (!Modal.validateForm(form)) {
      Alerts.warning('필수 항목을 모두 입력해주세요.');
      return;
    }
    
    // 변경된 필드만 추출
    const formData = Utils.getFormData(form);
    const changedData = {};
    
    Object.entries(formData).forEach(([key, value]) => {
      const input = form.elements[key];
      if (input && input.dataset.original !== value) {
        changedData[key] = value;
      }
    });
    
    // 변경사항이 없으면 편집 모드 종료
    if (Object.keys(changedData).length === 0) {
      this.toggleOrderDetailEdit(false);
      Alerts.info('변경된 내용이 없습니다.');
      return;
    }
    
    // 우편번호 포맷팅
    if (changedData.postalCode) {
      changedData.postalCode = Utils.formatPostalCode(changedData.postalCode);
    }
    
    try {
      Utils.toggleLoading(true);
      
      // 주문 정보 업데이트
      const response = await API.put(`/dashboard/orders/${this.currentOrderId}`, changedData);
      
      if (response.success) {
        // 편집 모드 종료
        this.toggleOrderDetailEdit(false);
        
        // 성공 알림
        Alerts.success('주문 정보가 성공적으로 업데이트되었습니다.');
        
        // 모달 닫기
        this.hideOrderDetail();
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        Alerts.error(response.message || '주문 정보 업데이트 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('주문 정보 저장 중 오류:', error);
      Alerts.error('주문 정보 업데이트 중 오류가 발생했습니다.');
    } finally {
      Utils.toggleLoading(false);
    }
  },
  
  /**
   * 주문 상세 정보 모달을 닫습니다.
   */
  hideOrderDetail: function() {
    const modal = document.getElementById('orderDetailModal');
    Modal.hide(modal);
    this.currentOrderId = null;
  },
  
  /**
   * 주문 생성 모달을 표시합니다.
   */
  showCreateOrderModal: function() {
    const modal = document.getElementById('createOrderModal');
    
    // 폼 초기화
    const form = document.getElementById('createOrderForm');
    if (form) {
      form.reset();
      
      // 현재 날짜로 ETA 설정
      const etaInput = document.getElementById('createETA');
      if (etaInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0);
        etaInput.value = this.formatDatetimeLocal(tomorrow);
      }
    }
    
    // 모달 표시
    Modal.show(modal);
  },
  
  /**
   * 주문 생성 모달을 닫습니다.
   */
  hideCreateOrderModal: function() {
    const modal = document.getElementById('createOrderModal');
    Modal.hide(modal);
  },
  
  /**
   * 주문을 생성합니다.
   */
  submitCreateOrder: async function() {
    const form = document.getElementById('createOrderForm');
    if (!form) return;
    
    // 폼 유효성 검사
    if (!Modal.validateForm(form)) {
      Alerts.warning('필수 항목을 모두 입력해주세요.');
      return;
    }
    
    // 폼 데이터 수집
    const formData = Utils.getFormData(form);
    
    // 우편번호 포맷팅
    if (formData.postalCode) {
      formData.postalCode = Utils.formatPostalCode(formData.postalCode);
    }
    
    try {
      Utils.toggleLoading(true);
      
      // 주문 생성 API 호출
      const response = await API.post('/dashboard/orders', formData);
      
      if (response.success) {
        // 성공 알림
        Alerts.success('주문이 성공적으로 생성되었습니다.');
        
        // 모달 닫기
        this.hideCreateOrderModal();
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        Alerts.error(response.message || '주문 생성 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('주문 생성 중 오류:', error);
      Alerts.error('주문 생성 중 오류가 발생했습니다.');
    } finally {
      Utils.toggleLoading(false);
    }
  },
  
  /**
   * 기사 배정 모달을 표시합니다.
   */
  showDriverAssignModal: function() {
    // 선택된 행이 없으면 알림 표시
    if (!DashboardTable || DashboardTable.selectedRows.length === 0) {
      Alerts.warning('배차 처리할 주문을 선택해주세요.');
      return;
    }
    
    const modal = document.getElementById('driverAssignModal');
    
    // 폼 초기화
    const form = document.getElementById('driverAssignForm');
    if (form) {
      form.reset();
    }
    
    // 선택된 행 수 업데이트
    const driverAssignCount = document.getElementById('driverAssignCount');
    if (driverAssignCount) {
      driverAssignCount.textContent = DashboardTable.selectedRows.length;
    }
    
    // 모달 표시
    Modal.show(modal);
  },
  
  /**
   * 기사 배정 모달을 닫습니다.
   */
  hideDriverAssignModal: function() {
    const modal = document.getElementById('driverAssignModal');
    Modal.hide(modal);
  },
  
  /**
   * 기사 배정을 처리합니다.
   */
  submitDriverAssign: async function() {
    // 선택된 행이 없으면 알림 표시
    if (!DashboardTable || DashboardTable.selectedRows.length === 0) {
      Alerts.warning('배차 처리할 주문을 선택해주세요.');
      return;
    }
    
    const form = document.getElementById('driverAssignForm');
    if (!form) return;
    
    // 폼 유효성 검사
    if (!Modal.validateForm(form)) {
      Alerts.warning('기사 이름을 입력해주세요.');
      return;
    }
    
    // 폼 데이터 수집
    const formData = Utils.getFormData(form);
    
    // 선택된 행 ID 목록 추가
    formData.orderIds = DashboardTable.selectedRows;
    
    try {
      Utils.toggleLoading(true);
      
      // 배차 처리 API 호출
      const response = await API.post('/dashboard/driver', formData);
      
      if (response.success) {
        // 성공 알림
        Alerts.success(`${response.data?.count || 0}건의 주문이 성공적으로 배차 처리되었습니다.`);
        
        // 모달 닫기
        this.hideDriverAssignModal();
        
        // 선택 해제
        DashboardTable.clearSelection();
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        Alerts.error(response.message || '배차 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('배차 처리 중 오류:', error);
      Alerts.error('배차 처리 중 오류가 발생했습니다.');
    } finally {
      Utils.toggleLoading(false);
    }
  },
  
  /**
   * 상태 변경 모달을 표시합니다.
   */
  showStatusChangeModal: function() {
    // 선택된 행이 없으면 알림 표시
    if (!DashboardTable || DashboardTable.selectedRows.length === 0) {
      Alerts.warning('상태를 변경할 주문을 선택해주세요.');
      return;
    }
    
    const modal = document.getElementById('statusChangeModal');
    
    // 폼 초기화
    const form = document.getElementById('statusChangeForm');
    if (form) {
      form.reset();
    }
    
    // 선택된 행 수 업데이트
    const statusChangeCount = document.getElementById('statusChangeCount');
    if (statusChangeCount) {
      statusChangeCount.textContent = DashboardTable.selectedRows.length;
    }
    
    // 가능한 상태 변경 옵션 설정
    this.updateStatusOptions();
    
    // 모달 표시
    Modal.show(modal);
  },
  
  /**
   * 가능한 상태 변경 옵션을 설정합니다.
   */
  updateStatusOptions: function() {
    const statusSelect = document.getElementById('changeStatus');
    if (!statusSelect) return;
    
    // 선택된 행의 상태 확인
    const statusCounts = DashboardTable.getSelectedRowsStatus();
    
    // 초기화
    statusSelect.innerHTML = '<option value="">선택하세요</option>';
    
    // 권한 확인
    const isAdmin = Utils.getUserRole() === 'ADMIN';
    
    // 가능한 상태 변경 옵션 설정
    const statusOptions = [];
    
    if (isAdmin) {
      // 관리자는 모든 상태로 변경 가능
      statusOptions.push(
        { value: 'waiting', label: '대기' },
        { value: 'in_progress', label: '진행 중' },
        { value: 'complete', label: '완료' },
        { value: 'issue', label: '이슈' },
        { value: 'cancel', label: '취소' }
      );
    } else {
      // 일반 사용자는 제한된 상태 변경만 가능
      
      // 대기 → 진행 중
      if (statusCounts.waiting > 0) {
        statusOptions.push({ value: 'in_progress', label: '진행 중' });
      }
      
      // 진행 중 → 완료/이슈/취소
      if (statusCounts.in_progress > 0) {
        statusOptions.push(
          { value: 'complete', label: '완료' },
          { value: 'issue', label: '이슈' },
          { value: 'cancel', label: '취소' }
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
    
    // 옵션이 없으면 비활성화
    if (statusOptions.length === 0) {
      statusSelect.disabled = true;
      
      // 알림
      setTimeout(() => {
        Alerts.warning('현재 선택된 주문에 대해 변경 가능한 상태가 없습니다.');
        this.hideStatusChangeModal();
      }, 300);
    } else {
      statusSelect.disabled = false;
    }
  },
  
  /**
   * 상태 변경 모달을 닫습니다.
   */
  hideStatusChangeModal: function() {
    const modal = document.getElementById('statusChangeModal');
    Modal.hide(modal);
  },
  
  /**
   * 상태 변경을 처리합니다.
   */
  submitStatusChange: async function() {
    // 선택된 행이 없으면 알림 표시
    if (!DashboardTable || DashboardTable.selectedRows.length === 0) {
      Alerts.warning('상태를 변경할 주문을 선택해주세요.');
      return;
    }
    
    const form = document.getElementById('statusChangeForm');
    if (!form) return;
    
    // 폼 유효성 검사
    if (!Modal.validateForm(form)) {
      Alerts.warning('변경할 상태를 선택해주세요.');
      return;
    }
    
    // 폼 데이터 수집
    const formData = Utils.getFormData(form);
    
    // 선택된 행 ID 목록 추가
    formData.orderIds = DashboardTable.selectedRows;
    
    try {
      Utils.toggleLoading(true);
      
      // 상태 변경 API 호출
      const response = await API.post('/dashboard/status', formData);
      
      if (response.success) {
        // 성공 알림
        Alerts.success(`${response.data?.count || 0}건의 주문 상태가 성공적으로 변경되었습니다.`);
        
        // 모달 닫기
        this.hideStatusChangeModal();
        
        // 선택 해제
        DashboardTable.clearSelection();
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        Alerts.error(response.message || '상태 변경 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('상태 변경 중 오류:', error);
      Alerts.error('상태 변경 중 오류가 발생했습니다.');
    } finally {
      Utils.toggleLoading(false);
    }
  },
  
  /**
   * 삭제 확인 모달을 표시합니다.
   */
  showDeleteConfirmModal: function() {
    // 권한 확인
    if (Utils.getUserRole() !== 'ADMIN') {
      Alerts.error('주문 삭제 권한이 없습니다.');
      return;
    }
    
    // 선택된 행이 없으면 알림 표시
    if (!DashboardTable || DashboardTable.selectedRows.length === 0) {
      Alerts.warning('삭제할 주문을 선택해주세요.');
      return;
    }
    
    const modal = document.getElementById('deleteConfirmModal');
    
    // 선택된 행 수 업데이트
    const deleteOrderCount = document.getElementById('deleteOrderCount');
    if (deleteOrderCount) {
      deleteOrderCount.textContent = DashboardTable.selectedRows.length;
    }
    
    // 모달 표시
    Modal.show(modal);
  },
  
  /**
   * 삭제 확인 모달을 닫습니다.
   */
  hideDeleteConfirmModal: function() {
    const modal = document.getElementById('deleteConfirmModal');
    Modal.hide(modal);
  },
  
  /**
   * 주문 삭제를 처리합니다.
   */
  submitOrderDelete: async function() {
    // 권한 확인
    if (Utils.getUserRole() !== 'ADMIN') {
      Alerts.error('주문 삭제 권한이 없습니다.');
      return;
    }
    
    // 선택된 행이 없으면 알림 표시
    if (!DashboardTable || DashboardTable.selectedRows.length === 0) {
      Alerts.warning('삭제할 주문을 선택해주세요.');
      return;
    }
    
    try {
      Utils.toggleLoading(true);
      
      // 삭제 API 호출
      const response = await API.post('/dashboard/delete', {
        orderIds: DashboardTable.selectedRows
      });
      
      if (response.success) {
        // 성공 알림
        Alerts.success(`${response.data?.count || 0}건의 주문이 성공적으로 삭제되었습니다.`);
        
        // 모달 닫기
        this.hideDeleteConfirmModal();
        
        // 선택 해제
        DashboardTable.clearSelection();
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        Alerts.error(response.message || '주문 삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('주문 삭제 중 오류:', error);
      Alerts.error('주문 삭제 중 오류가 발생했습니다.');
    } finally {
      Utils.toggleLoading(false);
    }
  },
  
  /**
   * select 요소의 옵션을 렌더링합니다.
   * @param {Array} options - 옵션 목록 [{value, label}]
   * @param {string} selectedValue - 선택된 값
   * @returns {string} - HTML 문자열
   */
  renderOptions: function(options, selectedValue) {
    if (!Array.isArray(options)) {
      return '';
    }
    
    return options.map(option => {
      const value = option.value || option;
      const label = option.label || option;
      const selected = value === selectedValue ? 'selected' : '';
      
      return `<option value="${value}" ${selected}>${label}</option>`;
    }).join('');
  },
  
  /**
   * datetime-local 입력 필드용 날짜 포맷팅
   * @param {string} dateStr - 날짜 문자열
   * @returns {string} - YYYY-MM-DDThh:mm 형식 문자열
   */
  formatDatetimeLocal: function(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().slice(0, 16);
  },
  
  /**
   * 날짜 시간 포맷팅
   * @param {string} dateStr - 날짜 문자열
   * @returns {string} - YYYY-MM-DD HH:mm 형식 문자열
   */
  formatDateTime: function(dateStr) {
    if (!dateStr) return '-';
    
    return Utils.formatDate(dateStr, 'YYYY-MM-DD HH:mm');
  }
};

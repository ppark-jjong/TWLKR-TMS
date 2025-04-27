console.log('[로드] dashboard/modal.js 로드됨 - ' + new Date().toISOString());

/**
 * 간소화된 모달 시스템 모듈
 * 모든 모달 통합 관리 및 인라인 편집 기능 제공
 */
(function() {
  // 캐시 설정 (주문 상세 정보 캐싱)
  const orderCache = new Map();
  const CACHE_TIMEOUT = 60000; // 1분 캐시
  
  // 현재 편집 중인 필드 관리
  const editingFields = new Set();
  
  /**
   * 초기화 함수
   */
  function init() {
    console.log('[Dashboard.Modal] 모달 모듈 초기화');
    
    // 주문 상세 모달 초기화
    initOrderDetailModal();
    
    // 주문 생성 모달 초기화
    initCreateOrderModal();
    
    // 삭제 확인 모달 초기화
    initDeleteConfirmModal();
    
    // 공통 모달 이벤트 처리
    initCommonModalEvents();
    
    console.log('[Dashboard.Modal] 모달 모듈 초기화 완료');
    return true;
  }
  
  /**
   * 공통 모달 이벤트 처리
   */
  function initCommonModalEvents() {
    // ESC 키 눌렀을 때 모달 닫기
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        const activeModal = document.querySelector('.modal[style*="display: flex"]');
        if (activeModal) {
          hideModal(activeModal);
        }
      }
    });
    
    // 모달 외부 클릭 시 닫기
    document.addEventListener('click', function(event) {
      const activeModal = document.querySelector('.modal[style*="display: flex"]');
      if (activeModal && 
          !event.target.closest('.modal-content') && 
          event.target.closest('.modal')) {
        
        // 상세 모달이나 생성 모달은 외부 클릭으로 닫지 않음
        if (activeModal.id !== 'orderDetailModal' && 
            activeModal.id !== 'createOrderModal') {
          hideModal(activeModal);
        }
      }
    });
  }
  
  /**
   * 주문 상세 모달 초기화
   */
  function initOrderDetailModal() {
    const orderDetailModal = document.getElementById('orderDetailModal');
    const editOrderBtn = document.getElementById('editOrderBtn');
    const saveOrderBtn = document.getElementById('saveOrderBtn');
    const deleteOrderBtn = document.getElementById('deleteOrderBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
    
    // 테이블 행 클릭 이벤트 위임
    document.addEventListener('click', function(event) {
      const viewBtn = event.target.closest('.view-btn');
      if (viewBtn) {
        event.preventDefault();
        const orderId = viewBtn.dataset.id;
        if (orderId) {
          showOrderDetail(orderId);
        }
      }
      
      // 인라인 편집 버튼 클릭 이벤트
      const editFieldBtn = event.target.closest('.inline-edit-btn');
      if (editFieldBtn) {
        const fieldType = editFieldBtn.dataset.field;
        if (fieldType) {
          handleInlineEdit(fieldType);
        }
      }
    });
    
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
    
    // 삭제 버튼 이벤트
    if (deleteOrderBtn) {
      deleteOrderBtn.addEventListener('click', function() {
        const orderId = Dashboard.getCurrentOrderId();
        if (orderId) {
          confirmDeleteOrder(orderId);
        }
      });
    }
    
    // 닫기 버튼 이벤트
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', function() {
        hideModal(orderDetailModal);
      });
    }
    
    if (closeDetailModalBtn) {
      closeDetailModalBtn.addEventListener('click', function() {
        hideModal(orderDetailModal);
      });
    }
  }
  
  /**
   * 주문 생성 모달 초기화
   */
  function initCreateOrderModal() {
    const createOrderBtn = document.getElementById('createOrderBtn');
    const submitCreateBtn = document.getElementById('submitCreateBtn');
    const cancelCreateBtn = document.getElementById('cancelCreateBtn');
    const closeCreateModalBtn = document.getElementById('closeCreateModalBtn');
    const createOrderModal = document.getElementById('createOrderModal');
    
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
    }
    
    if (submitCreateBtn) {
      submitCreateBtn.addEventListener('click', function() {
        submitCreateOrder();
      });
    }
    
    if (cancelCreateBtn) {
      cancelCreateBtn.addEventListener('click', function() {
        hideModal(createOrderModal);
      });
    }
    
    if (closeCreateModalBtn) {
      closeCreateModalBtn.addEventListener('click', function() {
        hideModal(createOrderModal);
      });
    }
  }
  
  /**
   * 삭제 확인 모달 초기화
   */
  function initDeleteConfirmModal() {
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
    
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', function() {
        const orderId = Dashboard.getCurrentOrderId();
        if (orderId) {
          submitOrderDelete(orderId);
        }
      });
    }
    
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', function() {
        hideModal(deleteConfirmModal);
      });
    }
    
    if (closeDeleteModalBtn) {
      closeDeleteModalBtn.addEventListener('click', function() {
        hideModal(deleteConfirmModal);
      });
    }
  }
  
  /**
   * 모달 표시
   * @param {HTMLElement} modal - 모달 요소
   */
  function showModal(modal) {
    if (!modal) return;
    
    // 모달 표시
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    // 애니메이션 효과
    setTimeout(function() {
      modal.classList.add('show');
    }, 10);
  }
  
  /**
   * 모달 숨김
   * @param {HTMLElement} modal - 모달 요소
   */
  function hideModal(modal) {
    if (!modal) return;
    
    // 애니메이션 효과
    modal.classList.remove('show');
    
    // 약간의 지연 후 완전히 숨김
    setTimeout(function() {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }, 300);
  }
  
  /**
   * 주문 상세 정보 표시
   * @param {string} orderId - 주문 ID
   */
  async function showOrderDetail(orderId) {
    if (!orderId) return;
    
    console.log('[Dashboard.Modal] 주문 상세 정보 표시:', orderId);
    
    // 현재 주문 ID 저장 (전역 상태)
    Dashboard.setCurrentOrderId(orderId);
    
    const orderDetailModal = document.getElementById('orderDetailModal');
    const orderDetailContent = document.getElementById('orderDetailContent');
    const modalLoadingSpinner = document.getElementById('modalLoadingSpinner');
    
    if (!orderDetailModal || !orderDetailContent) {
      console.error('[Dashboard.Modal] 모달 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 모달 표시
    showModal(orderDetailModal);
    
    // 초기 상태로 모달 설정
    orderDetailContent.innerHTML = '';
    
    // 로딩 표시
    if (modalLoadingSpinner) {
      modalLoadingSpinner.style.display = 'flex';
    }
    
    try {
      // 캐시 확인
      let orderData;
      const cacheKey = `order_${orderId}`;
      const cachedData = orderCache.get(cacheKey);
      
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TIMEOUT)) {
        // 캐시된 데이터 사용
        console.log('[Dashboard.Modal] 캐시에서 주문 데이터 로드');
        orderData = cachedData.data;
      } else {
        // API에서 데이터 로드
        console.log('[Dashboard.Modal] API에서 주문 데이터 로드');
        const response = await fetchOrderDetail(orderId);
        
        if (!response.success) {
          throw new Error(response.message || '주문 정보를 불러오는 중 오류가 발생했습니다.');
        }
        
        orderData = response.data;
        
        // 캐시에 저장
        orderCache.set(cacheKey, {
          data: orderData,
          timestamp: Date.now()
        });
      }
      
      // 로딩 완료
      if (modalLoadingSpinner) {
        modalLoadingSpinner.style.display = 'none';
      }
      
      // 모달 내용 업데이트
      renderOrderDetail(orderDetailContent, orderData);
      
      // 수정 버튼 상태 업데이트
      const editBtn = document.getElementById('editOrderBtn');
      if (editBtn) {
        // 관리자 또는 락이 없는 경우 수정 가능
        const userRole = document.body.dataset.userRole || 'USER';
        const isAdmin = userRole === 'ADMIN';
        
        editBtn.disabled = !isAdmin && orderData.isLocked;
        editBtn.title = editBtn.disabled ? 
          '다른 사용자가 편집 중이거나 권한이 없습니다' : 
          '주문 정보를 수정합니다';
      }
      
      // 인라인 편집 버튼 표시 설정
      setupInlineEditButtons(orderData);
      
    } catch (error) {
      console.error('[Dashboard.Modal] 상세 정보 로드 중 오류:', error);
      
      // 에러 표시
      if (modalLoadingSpinner) {
        modalLoadingSpinner.style.display = 'none';
      }
      
      orderDetailContent.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <h3>정보 로드 실패</h3>
          <p>${error.message || '주문 정보를 불러오는 중 오류가 발생했습니다.'}</p>
          <button class="btn retry-btn" id="retryLoadBtn">
            <i class="fas fa-sync"></i> 다시 시도
          </button>
        </div>
      `;
      
      // 재시도 버튼
      const retryBtn = document.getElementById('retryLoadBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', function() {
          // 캐시 삭제 후 다시 시도
          orderCache.delete(`order_${orderId}`);
          showOrderDetail(orderId);
        });
      }
      
      showAlert('주문 정보를 불러오는 중 오류가 발생했습니다.', 'error');
    }
  }
  
  /**
   * 인라인 편집 버튼 설정
   * @param {Object} orderData - 주문 데이터
   */
  function setupInlineEditButtons(orderData) {
    // 상태 및 기사 정보를 수정할 수 있는 상태인지 확인
    const userRole = document.body.dataset.userRole || 'USER';
    const isAdmin = userRole === 'ADMIN';
    const canEdit = isAdmin || !orderData.isLocked;
    
    // 각 인라인 편집 버튼 요소
    const statusEditBtn = document.querySelector('.inline-edit-btn[data-field="status"]');
    const driverEditBtn = document.querySelector('.inline-edit-btn[data-field="driver"]');
    
    // 편집 가능 여부에 따라 버튼 표시/숨김
    if (statusEditBtn) {
      statusEditBtn.style.display = canEdit ? 'block' : 'none';
    }
    
    if (driverEditBtn) {
      driverEditBtn.style.display = canEdit ? 'block' : 'none';
    }
  }
  
  /**
   * 인라인 편집 처리
   * @param {string} fieldType - 필드 타입 (status, driver 등)
   */
  function handleInlineEdit(fieldType) {
    const orderId = Dashboard.getCurrentOrderId();
    if (!orderId) return;
    
    // 필드 타입에 따라 다른 필드 요소 참조
    switch (fieldType) {
      case 'status':
        toggleFieldEdit('detailStatus', true);
        break;
        
      case 'driver':
        toggleFieldEdit('detailDriverName', true);
        toggleFieldEdit('detailDriverContact', true);
        break;
        
      default:
        console.warn(`[Dashboard.Modal] 알 수 없는 필드 타입: ${fieldType}`);
    }
    
    // 해당 필드가 편집 중임을 표시
    editingFields.add(fieldType);
    
    // 저장 버튼 표시
    const saveBtn = document.getElementById('saveOrderBtn');
    if (saveBtn) {
      saveBtn.style.display = 'block';
    }
    
    // 수정 버튼 숨김
    const editBtn = document.getElementById('editOrderBtn');
    if (editBtn) {
      editBtn.style.display = 'none';
    }
  }
  
  /**
   * 필드 편집 모드 전환
   * @param {string} fieldId - 필드 ID
   * @param {boolean} editable - 편집 가능 여부
   */
  function toggleFieldEdit(fieldId, editable) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    if (field.tagName === 'INPUT') {
      field.readOnly = !editable;
    } else if (field.tagName === 'SELECT') {
      field.disabled = !editable;
    } else if (field.tagName === 'TEXTAREA') {
      field.readOnly = !editable;
    }
    
    if (editable) {
      field.focus();
      field.classList.add('editing');
    } else {
      field.classList.remove('editing');
    }
  }
  
  /**
   * 주문 정보 수정 모드 전환
   * @param {boolean} isEdit - 수정 모드 여부
   */
  function toggleOrderEditMode(isEdit) {
    const saveBtn = document.getElementById('saveOrderBtn');
    const editBtn = document.getElementById('editOrderBtn');
    
    if (saveBtn) saveBtn.style.display = isEdit ? 'block' : 'none';
    if (editBtn) editBtn.style.display = isEdit ? 'none' : 'block';
    
    // 입력 필드 상태 업데이트
    const form = document.getElementById('orderDetailForm');
    if (form) {
      const inputs = form.querySelectorAll('input:not([type="hidden"]):not([id^="detailCreated"]):not([id^="detailDepart"]):not([id^="detailComplete"]):not([id^="detailUpdated"])');
      const selects = form.querySelectorAll('select');
      const textareas = form.querySelectorAll('textarea');
      
      inputs.forEach(input => {
        input.readOnly = !isEdit;
        
        // 일부 필드는 편집 불가
        if (['detailOrderNo', 'detailRegion'].includes(input.id)) {
          input.readOnly = true;
        }
      });
      
      selects.forEach(select => {
        select.disabled = !isEdit;
      });
      
      textareas.forEach(textarea => {
        textarea.readOnly = !isEdit;
      });
    }
    
    // 인라인 편집 버튼 표시/숨김
    const inlineEditBtns = document.querySelectorAll('.inline-edit-btn');
    inlineEditBtns.forEach(btn => {
      btn.style.display = isEdit ? 'none' : 'block';
    });
  }
  
  /**
   * 주문 상세 정보 API 호출
   * @param {string} orderId - 주문 ID
   */
  async function fetchOrderDetail(orderId) {
    try {
      const response = await fetch(`/dashboard/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP 오류: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('[Dashboard.Modal] API 오류:', error);
      return { 
        success: false, 
        message: '서버 통신 중 오류가 발생했습니다.'
      };
    }
  }
  
  /**
   * 주문 상세 정보 렌더링
   * @param {HTMLElement} container - 컨테이너 요소
   * @param {Object} orderData - 주문 데이터
   */
  function renderOrderDetail(container, orderData) {
    if (!container || !orderData) {
      console.error('[Dashboard.Modal] 상세 정보 렌더링 실패: 컨테이너 또는 데이터 누락');
      container.innerHTML = '<div class="error-message">상세 정보를 표시할 수 없습니다.</div>';
      return;
    }
    
    console.log('[Dashboard.Modal] 상세 정보 렌더링 시작', { orderId: orderData.dashboardId });
    
    // 폼 생성
    const html = `
      <form id="orderDetailForm" class="order-form">
        <div class="detail-header">
          <h3 class="detail-title">주문 #${orderData.orderNo || '-'}</h3>
          <span class="status-badge status-${orderData.status || 'WAITING'}">
            ${orderData.statusLabel || '대기'}
          </span>
        </div>
        
        <!-- 락 정보 (있는 경우) -->
        ${orderData.isLocked && orderData.updatedBy !== document.body.dataset.userId ? 
          `<div class="lock-info">
            <i class="fas fa-lock"></i>
            <span>현재 ${orderData.updatedBy || '다른 사용자'}가 이 주문을 편집 중입니다.</span>
          </div>` : ''
        }
        
        <div class="form-section">
          <h4 class="section-title">기본 정보</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="detailOrderNo">주문번호 *</label>
              <input type="text" id="detailOrderNo" name="orderNo" value="${orderData.orderNo || ''}" required readonly>
            </div>
            <div class="form-group">
              <label for="detailType">유형 *</label>
              <select id="detailType" name="type" required disabled>
                <option value="DELIVERY" ${orderData.type === 'DELIVERY' ? 'selected' : ''}>배송</option>
                <option value="RETURN" ${orderData.type === 'RETURN' ? 'selected' : ''}>회수</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="detailDepartment">부서 *</label>
              <select id="detailDepartment" name="department" required disabled>
                <option value="CS" ${orderData.department === 'CS' ? 'selected' : ''}>CS</option>
                <option value="HES" ${orderData.department === 'HES' ? 'selected' : ''}>HES</option>
                <option value="LENOVO" ${orderData.department === 'LENOVO' ? 'selected' : ''}>LENOVO</option>
              </select>
            </div>
            <div class="form-group">
              <label for="detailWarehouse">창고 *</label>
              <select id="detailWarehouse" name="warehouse" required disabled>
                <option value="SEOUL" ${orderData.warehouse === 'SEOUL' ? 'selected' : ''}>서울</option>
                <option value="BUSAN" ${orderData.warehouse === 'BUSAN' ? 'selected' : ''}>부산</option>
                <option value="GWANGJU" ${orderData.warehouse === 'GWANGJU' ? 'selected' : ''}>광주</option>
                <option value="DAEJEON" ${orderData.warehouse === 'DAEJEON' ? 'selected' : ''}>대전</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="detailSLA">SLA *</label>
              <input type="text" id="detailSLA" name="sla" value="${orderData.sla || ''}" required readonly>
            </div>
            <div class="form-group">
              <label for="detailETA">ETA *</label>
              <input type="datetime-local" id="detailETA" name="eta" 
                value="${orderData.eta ? orderData.eta.replace(' ', 'T') : ''}" required readonly>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h4 class="section-title">배송 정보</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="detailPostalCode">우편번호 *</label>
              <input type="text" id="detailPostalCode" name="postalCode" 
                value="${orderData.postalCode || ''}" maxlength="5" pattern="[0-9]{5}" required readonly>
            </div>
            <div class="form-group">
              <label for="detailRegion">지역</label>
              <input type="text" id="detailRegion" name="region" value="${orderData.region || ''}" readonly>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group full-width">
              <label for="detailAddress">주소 *</label>
              <input type="text" id="detailAddress" name="address" value="${orderData.address || ''}" required readonly>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="detailCustomer">고객명 *</label>
              <input type="text" id="detailCustomer" name="customer" value="${orderData.customer || ''}" required readonly>
            </div>
            <div class="form-group">
              <label for="detailContact">연락처</label>
              <input type="text" id="detailContact" name="contact" value="${orderData.contact || ''}" readonly
                pattern="010-[0-9]{4}-[0-9]{4}">
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h4 class="section-title">상태 정보</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="detailStatus">현재 상태 *</label>
              <div class="field-with-action">
                <select id="detailStatus" name="status" required disabled>
                  <option value="WAITING" ${orderData.status === 'WAITING' ? 'selected' : ''}>대기</option>
                  <option value="IN_PROGRESS" ${orderData.status === 'IN_PROGRESS' ? 'selected' : ''}>진행 중</option>
                  <option value="COMPLETE" ${orderData.status === 'COMPLETE' ? 'selected' : ''}>완료</option>
                  <option value="ISSUE" ${orderData.status === 'ISSUE' ? 'selected' : ''}>이슈</option>
                  <option value="CANCEL" ${orderData.status === 'CANCEL' ? 'selected' : ''}>취소</option>
                </select>
                <button type="button" class="inline-edit-btn" data-field="status" title="상태 변경">
                  <i class="fas fa-edit"></i>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="detailCreatedTime">접수 시간</label>
              <input type="text" id="detailCreatedTime" value="${orderData.createTime || ''}" readonly>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="detailDepartTime">출발 시간</label>
              <input type="text" id="detailDepartTime" value="${orderData.departTime || '-'}" readonly>
            </div>
            <div class="form-group">
              <label for="detailCompleteTime">완료 시간</label>
              <input type="text" id="detailCompleteTime" value="${orderData.completeTime || '-'}" readonly>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h4 class="section-title">배차 정보</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="detailDriverName">기사명</label>
              <div class="field-with-action">
                <input type="text" id="detailDriverName" name="driverName" value="${orderData.driverName || ''}" readonly>
                <button type="button" class="inline-edit-btn" data-field="driver" title="기사 정보 수정">
                  <i class="fas fa-edit"></i>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="detailDriverContact">기사 연락처</label>
              <input type="text" id="detailDriverContact" name="driverContact" value="${orderData.driverContact || ''}" readonly>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h4 class="section-title">기타 정보</h4>
          <div class="form-row">
            <div class="form-group full-width">
              <label for="detailRemark">비고</label>
              <textarea id="detailRemark" name="remark" rows="3" readonly>${orderData.remark || ''}</textarea>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="detailUpdatedBy">마지막 수정자</label>
              <input type="text" id="detailUpdatedBy" value="${orderData.updatedBy || '-'}" readonly>
            </div>
            <div class="form-group">
              <label for="detailUpdatedAt">수정 시간</label>
              <input type="text" id="detailUpdatedAt" value="${orderData.updateAt || '-'}" readonly>
            </div>
          </div>
        </div>
      </form>
    `;
    
    container.innerHTML = html;
  }
  
  /**
   * 주문 변경사항 저장
   */
  async function saveOrderChanges() {
    const form = document.getElementById('orderDetailForm');
    const orderId = Dashboard.getCurrentOrderId();
    
    if (!form || !orderId) {
      console.error('[Dashboard.Modal] 주문 저장 실패: 폼 또는 주문 ID 누락');
      return;
    }
    
    // 폼 유효성 검사
    if (!validateForm(form)) {
      console.warn('[Dashboard.Modal] 유효성 검사 실패');
      showAlert('필수 항목을 모두 입력해주세요.', 'warning');
      return;
    }
    
    // 락 상태 확인 (락이 없거나 만료되었을 수 있음)
    try {
      console.log(`[Dashboard.Modal] 락 상태 확인 시작: 주문 ID=${orderId}`);
      
      // 락 상태 API 호출
      const lockStatus = await fetch(`/dashboard/lock/${orderId}`).then(r => r.json());
      
      if (!lockStatus.editable) {
        console.warn('[Dashboard.Modal] 편집 권한 없음', lockStatus);
        showAlert(lockStatus.message || '현재 이 주문을 편집할 권한이 없습니다.', 'error');
        toggleOrderEditMode(false);
        return;
      }
      
      console.log('[Dashboard.Modal] 락 확인 완료: 편집 가능');
    } catch (error) {
      console.error('[Dashboard.Modal] 락 상태 확인 중 오류', error);
      // 락 확인이 실패해도 일단 계속 진행 (서버에서 최종 검증)
    }
    
    // 폼 데이터 수집
    const formData = getFormData(form);
    
    try {
      console.log('[Dashboard.Modal] 주문 업데이트 시작', { orderId, formData });
      toggleLoading(true);
      
      // API 호출
      const response = await window.API.put(`/dashboard/orders/${orderId}`, formData);
      
      if (response.success) {
        console.log('[Dashboard.Modal] 주문 업데이트 성공', { orderId });
        showAlert('주문 정보가 성공적으로 업데이트되었습니다.', 'success');
        toggleOrderEditMode(false);
        
        // 모달 닫기
        const modal = document.getElementById('orderDetailModal');
        if (modal) {
          hideModal(modal);
        }
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        console.error('[Dashboard.Modal] 주문 업데이트 실패', response);
        showAlert(response.message || '주문 수정 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('[Dashboard.Modal] 주문 수정 중 예외 발생', error);
      showAlert('주문 수정 중 오류가 발생했습니다: ' + error.message, 'error');
    } finally {
      toggleLoading(false);
      
      // 편집 중인 필드 초기화
      editingFields.clear();
    }
  }
  
  /**
   * 주문 생성 제출
   */
  async function submitCreateOrder() {
    const form = document.getElementById('createOrderForm');
    if (!form) return;
    
    // 폼 유효성 검사
    if (!validateForm(form)) {
      showAlert('필수 항목을 모두 입력해주세요.', 'warning');
      return;
    }
    
    // 폼 데이터 수집
    const formData = getFormData(form);
    
    // 우편번호 형식 처리
    if (formData.postalCode) {
      formData.postalCode = formatPostalCode(formData.postalCode);
    }
    
    try {
      toggleLoading(true);
      
      // API 호출
      const response = await window.API.post('/dashboard/orders', formData);
      
      if (response.success) {
        showAlert('주문이 성공적으로 생성되었습니다.', 'success');
        
        // 모달 닫기
        const modal = document.getElementById('createOrderModal');
        if (modal) {
          hideModal(modal);
        }
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        showAlert(response.message || '주문 생성 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('[Dashboard.Modal] 주문 생성 중 오류:', error);
      showAlert('주문 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      toggleLoading(false);
    }
  }
  
  /**
   * 삭제 확인 대화상자 표시
   * @param {string} orderId - 주문 ID
   */
  function confirmDeleteOrder(orderId) {
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    if (!deleteConfirmModal) return;
    
    // 권한 확인
    const userRole = document.body.dataset.userRole || 'USER';
    if (userRole !== 'ADMIN') {
      showAlert('삭제 권한이 없습니다.', 'error');
      return;
    }
    
    // 확인 모달 표시
    showModal(deleteConfirmModal);
  }
  
  /**
   * 주문 삭제 제출
   * @param {string} orderId - 주문 ID
   */
  async function submitOrderDelete(orderId) {
    // 권한 확인
    const userRole = document.body.dataset.userRole || 'USER';
    if (userRole !== 'ADMIN') {
      showAlert('주문 삭제 권한이 없습니다.', 'error');
      return;
    }
    
    if (!orderId) {
      showAlert('삭제할 주문 정보가 없습니다.', 'error');
      return;
    }
    
    try {
      toggleLoading(true);
      
      // API 호출
      const response = await window.API.post('/dashboard/delete', { ids: [orderId] });
      
      if (response.success) {
        showAlert('주문이 성공적으로 삭제되었습니다.', 'success');
        
        // 확인 모달 닫기
        const deleteConfirmModal = document.getElementById('deleteConfirmModal');
        if (deleteConfirmModal) {
          hideModal(deleteConfirmModal);
        }
        
        // 상세 모달 닫기
        const orderDetailModal = document.getElementById('orderDetailModal');
        if (orderDetailModal) {
          hideModal(orderDetailModal);
        }
        
        // 테이블 새로고침
        window.location.reload();
      } else {
        showAlert(response.message || '주문 삭제 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('[Dashboard.Modal] 주문 삭제 중 오류:', error);
      showAlert('주문 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      toggleLoading(false);
    }
  }
  
  /**
   * 폼 유효성 검사
   * @param {HTMLFormElement} form - 폼 요소
   * @returns {boolean} - 유효성 검사 결과
   */
  function validateForm(form) {
    const requiredElements = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredElements.forEach(element => {
      if (!element.value.trim()) {
        element.classList.add('invalid');
        isValid = false;
      } else {
        element.classList.remove('invalid');
      }
    });
    
    return isValid;
  }
  
  /**
   * 폼 데이터 수집
   * @param {HTMLFormElement} form - 폼 요소
   * @returns {Object} - 폼 데이터 객체
   */
  function getFormData(form) {
    const formData = {};
    const elements = form.elements;
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      if (element.name && element.name !== '') {
        formData[element.name] = element.value;
      }
    }
    
    return formData;
  }
  
  /**
   * 우편번호 형식화
   * @param {string} postalCode - 우편번호
   * @returns {string} - 형식화된 우편번호
   */
  function formatPostalCode(postalCode) {
    if (!postalCode) return '';
    
    try {
      // 숫자만 추출
      const digits = postalCode.toString().replace(/\D/g, '');
      
      // 4자리인 경우 앞에 0 추가
      if (digits.length === 4) {
        return '0' + digits;
      }
      
      return digits;
    } catch (error) {
      console.error('[Dashboard.Modal] 우편번호 포맷팅 오류:', error);
      return postalCode; // 오류 시 원본 반환
    }
  }
  
  /**
   * 로딩 표시 토글
   * @param {boolean} isLoading - 로딩 중 여부
   */
  function toggleLoading(isLoading) {
    const loadingSpinner = document.querySelector('.global-loading');
    
    if (loadingSpinner) {
      loadingSpinner.style.display = isLoading ? 'flex' : 'none';
    } else if (isLoading) {
      // 글로벌 로딩 스피너가 없는 경우 생성
      const spinner = document.createElement('div');
      spinner.className = 'global-loading';
      spinner.innerHTML = `
        <div class="spinner-container">
          <div class="spinner"></div>
          <div class="spinner-text">처리 중...</div>
        </div>
      `;
      document.body.appendChild(spinner);
    }
  }
  
  /**
   * 알림 표시
   * @param {string} message - 메시지
   * @param {string} type - 알림 타입 (success, warning, error, info)
   */
  function showAlert(message, type = 'info') {
    if (window.Alerts && typeof window.Alerts[type] === 'function') {
      window.Alerts[type](message);
    } else {
      alert(message);
    }
  }
  
  // 대시보드 모듈에 등록
  Dashboard.registerModule('modal', {
    init: init,
    showModal: showModal,
    hideModal: hideModal,
    showOrderDetail: showOrderDetail,
    toggleOrderEditMode: toggleOrderEditMode,
    handleInlineEdit: handleInlineEdit,
    submitCreateOrder: submitCreateOrder,
    submitOrderDelete: submitOrderDelete
  });
})();

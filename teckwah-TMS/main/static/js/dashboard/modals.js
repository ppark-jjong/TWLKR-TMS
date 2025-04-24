/**
 * 대시보드 모달 관련 기능
 */

/**
 * 모달 이벤트 초기화
 */
function initializeModalEvents() {
  try {
    console.log('모달 이벤트 초기화 시작...');
    
    // 주문 상세 모달
    const orderDetailModal = document.getElementById('orderDetailModal');
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const editOrderBtn = document.getElementById('editOrderBtn');
    const saveOrderBtn = document.getElementById('saveOrderBtn');
    
    if (closeDetailModalBtn) {
      closeDetailModalBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 이벤트 전파 중지
        Modal.close(orderDetailModal);
        console.log('상세 모달 닫기 버튼 클릭됨');
      });
    }
    
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 이벤트 전파 중지
        Modal.close(orderDetailModal);
        console.log('모달 닫기 버튼 클릭됨');
      });
    }
    
    if (editOrderBtn) {
      editOrderBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 이벤트 전파 중지
        const orderId = document.querySelector('#orderDetailContent').getAttribute('data-id');
        if (orderId) {
          console.log('수정 버튼 클릭됨, ID:', orderId);
          openOrderEditModal(orderId);
        } else {
          console.error('수정 버튼 클릭 시 주문 ID를 찾을 수 없음');
        }
      });
    }
    
    if (saveOrderBtn) {
      saveOrderBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 이벤트 전파 중지
        const orderId = document.querySelector('#orderDetailContent').getAttribute('data-id');
        if (orderId) {
          console.log('저장 버튼 클릭됨, ID:', orderId);
          submitOrderUpdate(orderId);
        } else {
          console.error('저장 버튼 클릭 시 주문 ID를 찾을 수 없음');
        }
      });
    }
  
  // 주문 생성 모달
  const createOrderModal = document.getElementById('createOrderModal');
  const closeCreateModalBtn = document.getElementById('closeCreateModalBtn');
  const cancelCreateBtn = document.getElementById('cancelCreateBtn');
  const submitCreateBtn = document.getElementById('submitCreateBtn');
  
  if (closeCreateModalBtn) {
    closeCreateModalBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      Modal.close(createOrderModal);
      console.log('생성 모달 닫기 버튼 클릭됨');
    });
  }
  
  if (cancelCreateBtn) {
    cancelCreateBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      Modal.close(createOrderModal);
      console.log('생성 취소 버튼 클릭됨');
    });
  }
  
  if (submitCreateBtn) {
    submitCreateBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      console.log('생성 제출 버튼 클릭됨');
      submitCreateOrder();
    });
  }
  
  // 기사 배정 모달
  const driverAssignModal = document.getElementById('driverAssignModal');
  const closeDriverModalBtn = document.getElementById('closeDriverModalBtn');
  const cancelDriverBtn = document.getElementById('cancelDriverBtn');
  const submitDriverBtn = document.getElementById('submitDriverBtn');
  
  if (closeDriverModalBtn) {
    closeDriverModalBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      Modal.close(driverAssignModal);
      console.log('기사 배정 모달 닫기 버튼 클릭됨');
    });
  }
  
  if (cancelDriverBtn) {
    cancelDriverBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      Modal.close(driverAssignModal);
      console.log('기사 배정 취소 버튼 클릭됨');
    });
  }
  
  if (submitDriverBtn) {
    submitDriverBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      console.log('기사 배정 제출 버튼 클릭됨');
      submitDriverAssign();
    });
  }
  
  // 상태 변경 모달
  const statusChangeModal = document.getElementById('statusChangeModal');
  const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
  const cancelStatusBtn = document.getElementById('cancelStatusBtn');
  const submitStatusBtn = document.getElementById('submitStatusBtn');
  
  if (closeStatusModalBtn) {
    closeStatusModalBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      Modal.close(statusChangeModal);
      console.log('상태 변경 모달 닫기 버튼 클릭됨');
    });
  }
  
  if (cancelStatusBtn) {
    cancelStatusBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      Modal.close(statusChangeModal);
      console.log('상태 변경 취소 버튼 클릭됨');
    });
  }
  
  if (submitStatusBtn) {
    submitStatusBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      console.log('상태 변경 제출 버튼 클릭됨');
      submitStatusChange();
    });
  }
  
  // 삭제 확인 모달
  const deleteConfirmModal = document.getElementById('deleteConfirmModal');
  const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  
  if (closeDeleteModalBtn) {
    closeDeleteModalBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      Modal.close(deleteConfirmModal);
      console.log('삭제 모달 닫기 버튼 클릭됨');
    });
  }
  
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      Modal.close(deleteConfirmModal);
      console.log('삭제 취소 버튼 클릭됨');
    });
  }
  
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 전파 중지
      console.log('삭제 확인 버튼 클릭됨');
      submitDeleteOrders();
    });
  }
  
  console.log('모든 모달 이벤트 초기화 완료');
  } catch (error) {
    console.error('모달 이벤트 초기화 중 오류 발생:', error);
  }
}

/**
 * 주문 상세 모달 열기
 * @param {number} orderId - 주문 ID
 */
async function openOrderDetailModal(orderId) {
  const modal = document.getElementById('orderDetailModal');
  const spinner = document.getElementById('modalLoadingSpinner');
  const content = document.getElementById('orderDetailContent');
  const editBtn = document.getElementById('editOrderBtn');
  const saveBtn = document.getElementById('saveOrderBtn');
  const modalTitle = document.getElementById('modalTitle');
  
  if (modal && spinner && content) {
    // 모달 열기
    if (typeof Modal !== 'undefined' && Modal.open) {
      Modal.open(modal);
    } else {
      modal.style.display = 'block';
    }
    
    // 모달 제목 설정
    if (modalTitle) modalTitle.textContent = '주문 상세 정보';
    
    // 로딩 표시
    spinner.style.display = 'flex';
    content.innerHTML = '';
    
    // ID 속성 추가 (편집 시 사용)
    content.setAttribute('data-id', orderId);
    
    // 편집/저장 버튼 상태 초기화
    if (editBtn) editBtn.style.display = '';
    if (saveBtn) saveBtn.style.display = 'none';
    
    try {
      // 주문 정보 불러오기
      const response = await Api.getOrderDetail(orderId);
      
      if (!response) {
        throw new Error('데이터를 받아올 수 없습니다.');
      }
      
      const data = response;
      
      // 데이터 표시
      renderOrderDetail(content, data);
      spinner.style.display = 'none';
      
      // 편집 버튼 활성화/비활성화 (락 상태에 따라)
      if (editBtn) {
        if (data.isLocked && !data.editable) {
          editBtn.disabled = true;
          editBtn.title = '다른 사용자가 편집 중입니다';
        } else {
          editBtn.disabled = false;
          editBtn.title = '주문 정보 수정';
          
          // 편집 버튼 이벤트 설정
          editBtn.onclick = function() {
            openOrderEditModal(orderId);
          };
        }
      }
    } catch (error) {
      console.error('주문 상세 정보 불러오기 오류:', error);
      content.innerHTML = `<div class="error-message">주문 정보를 불러오는 중 오류가 발생했습니다.<br>${error.message}</div>`;
      spinner.style.display = 'none';
    }
  }
}

/**
 * 주문 편집 모달 열기
 * @param {number} orderId - 주문 ID
 */
async function openOrderEditModal(orderId) {
  const modal = document.getElementById('orderDetailModal');
  const modalTitle = document.getElementById('modalTitle');
  const spinner = document.getElementById('modalLoadingSpinner');
  const content = document.getElementById('orderDetailContent');
  const editBtn = document.getElementById('editOrderBtn');
  const saveBtn = document.getElementById('saveOrderBtn');
  
  if (modal && spinner && content) {
    // 모달이 이미 열려있지 않다면 열기
    if (modal.style.display !== 'block') {
      if (typeof Modal !== 'undefined' && Modal.open) {
        Modal.open(modal);
      } else {
        modal.style.display = 'block';
      }
    }
    
    // 제목 변경
    if (modalTitle) modalTitle.textContent = '주문 수정';
    
    // 로딩 표시
    spinner.style.display = 'flex';
    content.innerHTML = '';
    
    // 편집/저장 버튼 상태 변경
    if (editBtn) editBtn.style.display = 'none';
    if (saveBtn) {
      saveBtn.style.display = '';
      saveBtn.disabled = false; // 버튼 활성화
    }
    
    try {
      // 주문 정보 불러오기
      const response = await Api.getOrderDetail(orderId);
      
      if (!response) {
        throw new Error('데이터를 받아올 수 없습니다.');
      }
      
      // 락 상태 확인
      const data = response;
      
      if (data.isLocked && !data.editable) {
        throw new Error(`현재 ${data.updatedBy || '다른 사용자'}가 이 주문을 편집 중입니다.`);
      }
      
      // 편집 폼 렌더링
      renderOrderEditForm(content, data);
      spinner.style.display = 'none';
      
      // 저장 버튼 이벤트 설정
      if (saveBtn) {
        saveBtn.onclick = function() {
          submitOrderUpdate(orderId);
        };
      }
    } catch (error) {
      console.error('주문 편집 모달 오류:', error);
      content.innerHTML = `<div class="error-message">주문 수정을 위한 준비 중 오류가 발생했습니다.<br>${error.message}</div>`;
      spinner.style.display = 'none';
      
      // 버튼 상태 복원
      if (editBtn) editBtn.style.display = '';
      if (saveBtn) saveBtn.style.display = 'none';
      
      // 제목 복원
      if (modalTitle) modalTitle.textContent = '주문 상세 정보';
    }
  }
}

/**
 * 주문 생성 모달 열기
 */
function openCreateOrderModal() {
  const modal = document.getElementById('createOrderModal');
  
  if (modal) {
    // 모달 열기
    Modal.open(modal);
    
    // 폼 초기화
    document.getElementById('createOrderForm').reset();
    
    // ETA 기본값 설정 (내일 09:00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    const etaInput = document.getElementById('createETA');
    if (etaInput) {
      etaInput.value = Utils.formatDateTimeForInput(tomorrow);
    }
  }
}

/**
 * 기사 배정 모달 열기
 */
function openDriverAssignModal() {
  const modal = document.getElementById('driverAssignModal');
  
  if (modal) {
    // 모달 열기
    Modal.open(modal);
    
    // 폼 초기화
    document.getElementById('driverAssignForm').reset();
    
    // 선택된 주문 수 업데이트
    const selectedIds = DashboardTable.getSelectedOrderIds();
    document.getElementById('driverAssignCount').textContent = selectedIds.length;
  }
}

/**
 * 상태 변경 모달 열기
 */
function openStatusChangeModal() {
  const modal = document.getElementById('statusChangeModal');
  
  if (modal) {
    // 모달 열기
    Modal.open(modal);
    
    // 폼 초기화
    document.getElementById('statusChangeForm').reset();
    
    // 선택된 주문 수 업데이트
    const selectedIds = DashboardTable.getSelectedOrderIds();
    document.getElementById('statusChangeCount').textContent = selectedIds.length;
  }
}

/**
 * 삭제 확인 모달 열기
 */
function openDeleteConfirmModal() {
  const modal = document.getElementById('deleteConfirmModal');
  
  if (modal) {
    // 모달 열기
    Modal.open(modal);
    
    // 선택된 주문 수 업데이트
    const selectedIds = DashboardTable.getSelectedOrderIds();
    document.getElementById('deleteOrderCount').textContent = selectedIds.length;
  }
}

/**
 * 주문 상세 정보 렌더링
 * @param {HTMLElement} container - 내용을 표시할 컨테이너
 * @param {Object} data - 주문 상세 데이터
 */
function renderOrderDetail(container, data) {
  // 여기에서 주문 정보를 표시하는 HTML 생성
  let html = '<div class="order-detail">';
  
  // 락 정보 표시
  if (data.lockedInfo && !data.lockedInfo.editable) {
    html += `<div class="lock-info">
      <i class="fas fa-lock"></i> 현재 ${data.lockedInfo.lockedBy || '다른 사용자'}가 편집 중입니다.
    </div>`;
  }
  
  // 기본 정보 섹션
  html += `
    <div class="detail-section">
      <h3 class="section-title">기본 정보</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">주문번호</div>
          <div class="detail-value">${data.orderNo || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">상태</div>
          <div class="detail-value">
            <span class="status-badge status-${data.status}">${data.status_label || data.status || '-'}</span>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-label">유형</div>
          <div class="detail-value">
            <span class="type-badge type-${data.type}">${data.type_label || data.type || '-'}</span>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-label">부서</div>
          <div class="detail-value">${data.department || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">창고</div>
          <div class="detail-value">${data.warehouse || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">SLA</div>
          <div class="detail-value">${data.sla || '-'}</div>
        </div>
      </div>
    </div>`;
  
  // 배송 정보 섹션
  html += `
    <div class="detail-section">
      <h3 class="section-title">배송 정보</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">ETA</div>
          <div class="detail-value">${data.eta || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">우편번호</div>
          <div class="detail-value">${data.postalCode || '-'}</div>
        </div>
        <div class="detail-item full-width">
          <div class="detail-label">지역</div>
          <div class="detail-value">${data.region || '-'}</div>
        </div>
        <div class="detail-item full-width">
          <div class="detail-label">주소</div>
          <div class="detail-value">${data.address || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">고객명</div>
          <div class="detail-value">${data.customer || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">연락처</div>
          <div class="detail-value">${data.contact || '-'}</div>
        </div>
      </div>
    </div>`;
  
  // 배차 정보 섹션
  html += `
    <div class="detail-section">
      <h3 class="section-title">배차 정보</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">기사명</div>
          <div class="detail-value">${data.driverName || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">기사 연락처</div>
          <div class="detail-value">${data.driverContact || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">출발 시간</div>
          <div class="detail-value">${data.departTime || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">완료 시간</div>
          <div class="detail-value">${data.completeTime || '-'}</div>
        </div>
      </div>
    </div>`;
  
  // 시스템 정보 섹션
  html += `
    <div class="detail-section">
      <h3 class="section-title">시스템 정보</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">생성 시간</div>
          <div class="detail-value">${data.createTime || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">생성자</div>
          <div class="detail-value">${data.createUser || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">마지막 수정 시간</div>
          <div class="detail-value">${data.updateTime || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">마지막 수정자</div>
          <div class="detail-value">${data.updateUser || '-'}</div>
        </div>
      </div>
    </div>`;
  
  html += '</div>';
  
  container.innerHTML = html;
}

/**
 * 주문 편집 폼 렌더링
 * @param {HTMLElement} container - 내용을 표시할 컨테이너
 * @param {Object} data - 주문 상세 데이터
 */
function renderOrderEditForm(container, data) {
  // 여기에서 주문 편집 폼 HTML 생성
  let html = `
    <form id="orderEditForm" class="order-form">
      <input type="hidden" id="editOrderId" name="dashboardId" value="${data.dashboardId}">
      
      <!-- 기본 정보 -->
      <div class="form-section">
        <h3 class="section-title">기본 정보</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="editOrderNo">주문번호 *</label>
            <input type="text" id="editOrderNo" name="orderNo" value="${data.orderNo || ''}" required>
          </div>
          <div class="form-group">
            <label for="editType">유형 *</label>
            <select id="editType" name="type" required>
              <option value="">선택하세요</option>
              <!-- 유형 옵션은 JavaScript로 동적 추가 -->
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="editDepartment">부서 *</label>
            <select id="editDepartment" name="department" required>
              <option value="">선택하세요</option>
              <!-- 부서 옵션은 JavaScript로 동적 추가 -->
            </select>
          </div>
          <div class="form-group">
            <label for="editWarehouse">창고 *</label>
            <select id="editWarehouse" name="warehouse" required>
              <option value="">선택하세요</option>
              <!-- 창고 옵션은 JavaScript로 동적 추가 -->
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="editSLA">SLA *</label>
            <input type="text" id="editSLA" name="sla" value="${data.sla || ''}" required>
          </div>
          <div class="form-group">
            <label for="editStatus">상태 *</label>
            <select id="editStatus" name="status" required>
              <option value="">선택하세요</option>
              <!-- 상태 옵션은 JavaScript로 동적 추가 -->
            </select>
          </div>
        </div>
      </div>
      
      <!-- 배송 정보 -->
      <div class="form-section">
        <h3 class="section-title">배송 정보</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="editETA">ETA *</label>
            <input type="datetime-local" id="editETA" name="eta" required>
          </div>
          <div class="form-group">
            <label for="editPostalCode">우편번호 *</label>
            <input type="text" id="editPostalCode" name="postalCode" value="${data.postalCode || ''}" required maxlength="5" pattern="[0-9]*">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group full-width">
            <label for="editAddress">주소 *</label>
            <input type="text" id="editAddress" name="address" value="${data.address || ''}" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="editCustomer">고객명 *</label>
            <input type="text" id="editCustomer" name="customer" value="${data.customer || ''}" required>
          </div>
          <div class="form-group">
            <label for="editContact">연락처 *</label>
            <input type="text" id="editContact" name="contact" value="${data.contact || ''}" required pattern="010-[0-9]{4}-[0-9]{4}">
            <small class="form-hint">형식: 010-XXXX-XXXX</small>
          </div>
        </div>
      </div>
      
      <!-- 배차 정보 -->
      <div class="form-section">
        <h3 class="section-title">배차 정보</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="editDriverName">기사명</label>
            <input type="text" id="editDriverName" name="driverName" value="${data.driverName || ''}">
          </div>
          <div class="form-group">
            <label for="editDriverContact">기사 연락처</label>
            <input type="text" id="editDriverContact" name="driverContact" value="${data.driverContact || ''}" pattern="010-[0-9]{4}-[0-9]{4}">
            <small class="form-hint">형식: 010-XXXX-XXXX</small>
          </div>
        </div>
      </div>
    </form>`;
  
  container.innerHTML = html;
  
  // 선택 필드 옵션 설정
  const types = [
    { value: 'DELIVERY', label: '배송' },
    { value: 'PICKUP', label: '수거' },
    { value: 'RETURN', label: '반품' }
  ];
  
  const departments = [
    { value: 'CS', label: 'CS팀' },
    { value: 'HES', label: 'HES팀' },
    { value: 'LENOVO', label: 'LENOVO팀' }
  ];
  
  const warehouses = [
    { value: 'GIMPO', label: '김포창고' },
    { value: 'ANSAN', label: '안산창고' },
    { value: 'HWASEONG', label: '화성창고' }
  ];
  
  const statuses = [
    { value: 'WAITING', label: '대기' },
    { value: 'IN_PROGRESS', label: '진행' },
    { value: 'COMPLETE', label: '완료' },
    { value: 'ISSUE', label: '이슈' },
    { value: 'CANCEL', label: '취소' }
  ];
  
  // 유형 선택 옵션 설정
  const typeSelect = document.getElementById('editType');
  types.forEach(type => {
    const option = document.createElement('option');
    option.value = type.value;
    option.textContent = type.label;
    option.selected = type.value === data.type;
    typeSelect.appendChild(option);
  });
  
  // 부서 선택 옵션 설정
  const departmentSelect = document.getElementById('editDepartment');
  departments.forEach(dept => {
    const option = document.createElement('option');
    option.value = dept.value;
    option.textContent = dept.label;
    option.selected = dept.value === data.department;
    departmentSelect.appendChild(option);
  });
  
  // 창고 선택 옵션 설정
  const warehouseSelect = document.getElementById('editWarehouse');
  warehouses.forEach(warehouse => {
    const option = document.createElement('option');
    option.value = warehouse.value;
    option.textContent = warehouse.label;
    option.selected = warehouse.value === data.warehouse;
    warehouseSelect.appendChild(option);
  });
  
  // 상태 선택 옵션 설정
  const statusSelect = document.getElementById('editStatus');
  statuses.forEach(status => {
    const option = document.createElement('option');
    option.value = status.value;
    option.textContent = status.label;
    option.selected = status.value === data.status;
    statusSelect.appendChild(option);
  });
  
  // ETA 날짜시간 설정
  const etaInput = document.getElementById('editETA');
  if (data.eta) {
    // 서버에서 받은 날짜를 ISO 형식으로 변환
    const etaDate = new Date(data.eta);
    etaInput.value = Utils.formatDateTimeForInput(etaDate);
  }
}

/**
 * 주문 수정 제출
 * @param {number} orderId - 주문 ID
 */
async function submitOrderUpdate(orderId) {
  const form = document.getElementById('orderEditForm');
  
  // 폼 유효성 검사
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  // 폼 데이터 수집
  const formData = new FormData(form);
  const data = Utils.formDataToObject(formData);
  
  try {
    // API 호출
    const result = await Api.updateOrder(orderId, data);
    
    if (result.success) {
      // 락 해제
      await Api.unlockOrder(orderId);
      
      // 성공 메시지 표시
      Modal.alert('주문이 성공적으로 업데이트되었습니다.', 'success');
      
      // 모달 닫기
      Modal.close(document.getElementById('orderDetailModal'));
      
      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      // 오류 메시지 표시
      Modal.alert(result.message || '주문 업데이트 중 오류가 발생했습니다.', 'error');
    }
  } catch (error) {
    console.error('주문 업데이트 오류:', error);
    Modal.alert('서버 통신 중 오류가 발생했습니다.', 'error');
  }
}

/**
 * 주문 생성 제출
 */
async function submitCreateOrder() {
  const form = document.getElementById('createOrderForm');
  
  // 폼 유효성 검사
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  // 폼 데이터 수집
  const formData = new FormData(form);
  const data = {};
  
  // FormData를 객체로 변환
  formData.forEach((value, key) => {
    // 우편번호 자동 보완 (4자리일 경우 앞에 '0' 추가)
    if (key === 'postalCode' && value.length === 4) {
      data[key] = '0' + value;
    } else {
      data[key] = value;
    }
  });
  
  console.log('주문 생성 데이터:', data);
  
  try {
    // API 호출
    const result = await Api.createOrder(data);
    
    if (result.success) {
      // 성공 메시지 표시
      if (typeof Modal !== 'undefined' && Modal.alert) {
        Modal.alert('새 주문이 성공적으로 생성되었습니다.', 'success');
      } else {
        alert('새 주문이 성공적으로 생성되었습니다.');
      }
      
      // 모달 닫기
      const createOrderModal = document.getElementById('createOrderModal');
      if (typeof Modal !== 'undefined' && Modal.close) {
        Modal.close(createOrderModal);
      } else {
        createOrderModal.style.display = 'none';
      }
      
      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      // 오류 메시지 표시
      if (typeof Modal !== 'undefined' && Modal.alert) {
        Modal.alert(result.message || '주문 생성 중 오류가 발생했습니다.', 'error');
      } else {
        alert(result.message || '주문 생성 중 오류가 발생했습니다.');
      }
    }
  } catch (error) {
    console.error('주문 생성 오류:', error);
    if (typeof Modal !== 'undefined' && Modal.alert) {
      Modal.alert('서버 통신 중 오류가 발생했습니다.', 'error');
    } else {
      alert('서버 통신 중 오류가 발생했습니다.');
    }
  }
}

/**
 * 기사 배정 제출
 */
async function submitDriverAssign() {
  const form = document.getElementById('driverAssignForm');
  
  // 폼 유효성 검사
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  // 선택된 주문 ID 수집
  const selectedIds = DashboardTable.getSelectedOrderIds();
  
  if (selectedIds.length === 0) {
    if (typeof Modal !== 'undefined' && Modal.alert) {
      Modal.alert('배차 처리할 주문을 선택해주세요.', 'warning');
    } else {
      alert('배차 처리할 주문을 선택해주세요.');
    }
    return;
  }
  
  // 폼 데이터 수집
  const formData = new FormData(form);
  const driverName = formData.get('driverName');
  const driverContact = formData.get('driverContact');
  
  if (!driverName) {
    if (typeof Modal !== 'undefined' && Modal.alert) {
      Modal.alert('기사 이름을 입력해주세요.', 'warning');
    } else {
      alert('기사 이름을 입력해주세요.');
    }
    return;
  }
  
  console.log('기사 배정 요청:', { ids: selectedIds, driver_name: driverName, driver_contact: driverContact });
  
  try {
    // 기사 배정 버튼 비활성화 및 로딩 표시
    const submitBtn = document.getElementById('submitDriverBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
    }
    
    // API 호출
    const result = await Api.assignDriverToOrders(selectedIds, driverName, driverContact);
    
    // 버튼 상태 복원
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `배차 확인 (<span id="driverAssignCount">${selectedIds.length}</span>건)`;
      
      // 카운트 요소 다시 설정
      const countSpan = submitBtn.querySelector('#driverAssignCount');
      if (countSpan) countSpan.textContent = selectedIds.length;
    }
    
    if (result.success) {
      // 결과 분석
      const totalCount = selectedIds.length;
      const successCount = result.results?.filter(r => r.success).length || 0;
      const failCount = totalCount - successCount;
      
      // 성공 메시지 표시
      let message = `기사 배정 결과:\n- 성공: ${successCount}건`;
      if (failCount > 0) message += `\n- 실패: ${failCount}건`;
      
      if (typeof Modal !== 'undefined' && Modal.alert) {
        Modal.alert(message, 'success');
      } else {
        alert(message);
      }
      
      // 모달 닫기
      const driverAssignModal = document.getElementById('driverAssignModal');
      if (typeof Modal !== 'undefined' && Modal.close) {
        Modal.close(driverAssignModal);
      } else {
        driverAssignModal.style.display = 'none';
      }
      
      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      // 오류 메시지 표시
      if (typeof Modal !== 'undefined' && Modal.alert) {
        Modal.alert(result.message || '기사 배정 중 오류가 발생했습니다.', 'error');
      } else {
        alert(result.message || '기사 배정 중 오류가 발생했습니다.');
      }
    }
  } catch (error) {
    console.error('기사 배정 오류:', error);
    
    // 버튼 상태 복원
    const submitBtn = document.getElementById('submitDriverBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `배차 확인 (<span id="driverAssignCount">${selectedIds.length}</span>건)`;
      
      // 카운트 요소 다시 설정
      const countSpan = submitBtn.querySelector('#driverAssignCount');
      if (countSpan) countSpan.textContent = selectedIds.length;
    }
    
    if (typeof Modal !== 'undefined' && Modal.alert) {
      Modal.alert('서버 통신 중 오류가 발생했습니다.', 'error');
    } else {
      alert('서버 통신 중 오류가 발생했습니다.');
    }
  }
}

/**
 * 상태 변경 제출
 */
async function submitStatusChange() {
  const form = document.getElementById('statusChangeForm');
  
  // 폼 유효성 검사
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  // 선택된 주문 ID 수집
  const selectedIds = DashboardTable.getSelectedOrderIds();
  
  if (selectedIds.length === 0) {
    if (typeof Modal !== 'undefined' && Modal.alert) {
      Modal.alert('상태를 변경할 주문을 선택해주세요.', 'warning');
    } else {
      alert('상태를 변경할 주문을 선택해주세요.');
    }
    return;
  }
  
  // 폼 데이터 수집
  const formData = new FormData(form);
  const status = formData.get('status');
  
  if (!status) {
    if (typeof Modal !== 'undefined' && Modal.alert) {
      Modal.alert('변경할 상태를 선택해주세요.', 'warning');
    } else {
      alert('변경할 상태를 선택해주세요.');
    }
    return;
  }
  
  console.log('상태 변경 요청:', { ids: selectedIds, status: status });
  
  try {
    // 상태 변경 버튼 비활성화 및 로딩 표시
    const submitBtn = document.getElementById('submitStatusBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
    }
    
    // API 호출
    const result = await Api.updateOrdersStatus(selectedIds, status);
    
    // 버튼 상태 복원
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `확인 (<span id="statusChangeCount">${selectedIds.length}</span>건)`;
      
      // 카운트 요소 다시 설정
      const countSpan = submitBtn.querySelector('#statusChangeCount');
      if (countSpan) countSpan.textContent = selectedIds.length;
    }
    
    if (result.success) {
      // 결과 분석
      const totalCount = selectedIds.length;
      const successCount = result.results?.filter(r => r.success).length || 0;
      const failCount = totalCount - successCount;
      
      // 성공 메시지 표시
      let message = `상태 변경 결과:\n- 성공: ${successCount}건`;
      if (failCount > 0) message += `\n- 실패: ${failCount}건`;
      
      if (typeof Modal !== 'undefined' && Modal.alert) {
        Modal.alert(message, 'success');
      } else {
        alert(message);
      }
      
      // 모달 닫기
      const statusChangeModal = document.getElementById('statusChangeModal');
      if (typeof Modal !== 'undefined' && Modal.close) {
        Modal.close(statusChangeModal);
      } else {
        statusChangeModal.style.display = 'none';
      }
      
      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      // 오류 메시지 표시
      if (typeof Modal !== 'undefined' && Modal.alert) {
        Modal.alert(result.message || '상태 변경 중 오류가 발생했습니다.', 'error');
      } else {
        alert(result.message || '상태 변경 중 오류가 발생했습니다.');
      }
    }
  } catch (error) {
    console.error('상태 변경 오류:', error);
    
    // 버튼 상태 복원
    const submitBtn = document.getElementById('submitStatusBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `확인 (<span id="statusChangeCount">${selectedIds.length}</span>건)`;
      
      // 카운트 요소 다시 설정
      const countSpan = submitBtn.querySelector('#statusChangeCount');
      if (countSpan) countSpan.textContent = selectedIds.length;
    }
    
    if (typeof Modal !== 'undefined' && Modal.alert) {
      Modal.alert('서버 통신 중 오류가 발생했습니다.', 'error');
    } else {
      alert('서버 통신 중 오류가 발생했습니다.');
    }
  }
}

/**
 * 주문 삭제 제출
 */
async function submitDeleteOrders() {
  // 선택된 주문 ID 수집
  const selectedIds = DashboardTable.getSelectedOrderIds();
  
  if (selectedIds.length === 0) {
    if (typeof Modal !== 'undefined' && Modal.alert) {
      Modal.alert('삭제할 주문을 선택해주세요.', 'warning');
    } else {
      alert('삭제할 주문을 선택해주세요.');
    }
    return;
  }
  
  console.log('주문 삭제 요청:', { ids: selectedIds });
  
  try {
    // 삭제 버튼 비활성화 및 로딩 표시
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
    }
    
    // API 호출
    const result = await Api.deleteOrders(selectedIds);
    
    // 버튼 상태 복원
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '삭제';
    }
    
    if (result.success) {
      // 결과 분석
      const totalCount = selectedIds.length;
      const successCount = result.results?.filter(r => r.success).length || 0;
      const failCount = totalCount - successCount;
      
      // 성공 메시지 표시
      let message = `주문 삭제 결과:\n- 성공: ${successCount}건`;
      if (failCount > 0) message += `\n- 실패: ${failCount}건`;
      
      if (typeof Modal !== 'undefined' && Modal.alert) {
        Modal.alert(message, 'success');
      } else {
        alert(message);
      }
      
      // 모달 닫기
      const deleteConfirmModal = document.getElementById('deleteConfirmModal');
      if (typeof Modal !== 'undefined' && Modal.close) {
        Modal.close(deleteConfirmModal);
      } else {
        deleteConfirmModal.style.display = 'none';
      }
      
      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      // 오류 메시지 표시
      if (typeof Modal !== 'undefined' && Modal.alert) {
        Modal.alert(result.message || '주문 삭제 중 오류가 발생했습니다.', 'error');
      } else {
        alert(result.message || '주문 삭제 중 오류가 발생했습니다.');
      }
    }
  } catch (error) {
    console.error('주문 삭제 오류:', error);
    
    // 버튼 상태 복원
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '삭제';
    }
    
    if (typeof Modal !== 'undefined' && Modal.alert) {
      Modal.alert('서버 통신 중 오류가 발생했습니다.', 'error');
    } else {
      alert('서버 통신 중 오류가 발생했습니다.');
    }
  }
}

// 전역 namespace에 등록
window.DashboardModals = {
  initializeModalEvents,
  openOrderDetailModal,
  openOrderEditModal,
  openCreateOrderModal,
  openDriverAssignModal,
  openStatusChangeModal,
  openDeleteConfirmModal,
  renderOrderDetail,
  renderOrderEditForm,
  submitOrderUpdate,
  submitCreateOrder,
  submitDriverAssign,
  submitStatusChange,
  submitDeleteOrders
};

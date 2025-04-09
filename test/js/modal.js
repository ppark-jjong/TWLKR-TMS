/**
 * Ant Design 스타일의 모달 관리 모듈
 */

// 현재 활성화된 모달 ID
let activeModal = null;

// 모달 초기화
function initModals() {
  console.log('모달 초기화 중...');
  
  // 모든 모달 숨기기
  document.querySelectorAll('.ant-modal-root').forEach(modal => {
    modal.style.display = 'none';
  });
  
  // 닫기 버튼에 이벤트 추가
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.ant-modal-root');
      if (modal) closeModal(modal.id);
    });
  });
  
  // 모달 마스크 클릭 시 닫기
  document.querySelectorAll('.ant-modal-mask').forEach(mask => {
    mask.addEventListener('click', (e) => {
      if (e.target === mask) {
        const modal = mask.closest('.ant-modal-root');
        if (modal) closeModal(modal.id);
      }
    });
  });
  
  // ESC 키로 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeModal) {
      closeModal(activeModal);
    }
  });
  
  console.log('모달 초기화 완료');
}

// 모달 열기
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`모달을 찾을 수 없음: ${modalId}`);
    return;
  }
  
  // 이미 열린 모달 닫기
  if (activeModal) {
    document.getElementById(activeModal).style.display = 'none';
  }
  
  // 선택한 모달 표시
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden'; // 스크롤 방지
  
  // 활성 모달 ID 저장
  activeModal = modalId;
  
  console.log(`모달 열림: ${modalId}`);
}

// 모달 닫기
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`모달을 찾을 수 없음: ${modalId}`);
    return;
  }
  
  modal.style.display = 'none';
  document.body.style.overflow = ''; // 스크롤 복원
  
  // 활성 모달 초기화
  if (activeModal === modalId) {
    activeModal = null;
  }
  
  // 폼 초기화
  const form = modal.querySelector('form');
  if (form) form.reset();
  
  console.log(`모달 닫힘: ${modalId}`);
}

// 주문 상세 정보 표시
function showOrderDetail(orderId) {
  console.log('주문 상세 정보 표시:', orderId);
  
  // ID로 주문 정보 가져오기
  const order = findOrderById(orderId);
  
  if (!order) {
    showMessage('주문 정보를 찾을 수 없습니다', 'error');
    return;
  }
  
  // 모달 내용 설정
  let content = `
    <div class="order-detail">
      <dl>
        <dt>주문번호</dt>
        <dd>${order.order_no || '-'}</dd>
        
        <dt>고객명</dt>
        <dd>${order.customer || '-'}</dd>
        
        <dt>배송 유형</dt>
        <dd>${order.type === 'DELIVERY' ? '배송' : '회수'}</dd>
        
        <dt>예상도착일</dt>
        <dd>${formatDate(order.eta) || '-'}</dd>
        
        <dt>창고</dt>
        <dd>${getWarehouseText(order.warehouse) || '-'}</dd>
        
        <dt>담당부서</dt>
        <dd>${order.department || '-'}</dd>
        
        <dt>상태</dt>
        <dd><span class="status-badge ${getStatusClass(order.status)}">${getStatusText(order.status) || '-'}</span></dd>
        
        <dt>서비스 수준</dt>
        <dd>${order.sla || '-'}</dd>
        
        <dt>주소</dt>
        <dd>${order.address || '-'}</dd>
        
        <dt>연락처</dt>
        <dd>${order.contact || '-'}</dd>
        
        <dt>메모</dt>
        <dd>${order.remark || '-'}</dd>
        
        <dt>생성 시간</dt>
        <dd>${formatDateTime(order.create_time) || '-'}</dd>
        
        <dt>출발 시간</dt>
        <dd>${formatDateTime(order.depart_time) || '-'}</dd>
        
        <dt>완료 시간</dt>
        <dd>${formatDateTime(order.complete_time) || '-'}</dd>
        
        <dt>최종 업데이트</dt>
        <dd>${formatDateTime(order.update_at) || '-'}</dd>
      </dl>
    </div>
  `;
  
  // 모달 내용 설정
  const modalBody = document.querySelector('#orderDetailModal .ant-modal-body');
  if (modalBody) modalBody.innerHTML = content;
  
  // 모달 타이틀 설정
  const modalTitle = document.querySelector('#orderDetailModal .ant-modal-title');
  if (modalTitle) modalTitle.textContent = `주문 상세정보 (${orderId})`;
  
  // 모달 열기
  openModal('orderDetailModal');
  
  // 수정 버튼 이벤트 설정
  const editBtn = document.getElementById('editOrderBtn');
  if (editBtn) {
    editBtn.onclick = () => {
      closeModal('orderDetailModal');
      showEditOrderModal(orderId);
    };
  }
}

// 주문 수정 모달 표시
function showEditOrderModal(orderId) {
  console.log('주문 수정 모달 표시:', orderId);
  
  // ID로 주문 정보 가져오기
  const order = findOrderById(orderId);
  
  if (!order) {
    showMessage('주문 정보를 찾을 수 없습니다', 'error');
    return;
  }
  
  // 수정 폼 생성
  let formContent = `
    <form id="editOrderForm" class="ant-form ant-form-vertical">
      <input type="hidden" name="order_no" value="${order.order_no}">
      
      <div class="ant-form-item">
        <label class="ant-form-item-label">고객명</label>
        <div class="ant-form-item-control">
          <input type="text" name="customer" value="${order.customer || ''}" class="ant-input" required>
        </div>
      </div>
      
      <div class="ant-form-item">
        <label class="ant-form-item-label">예상도착일</label>
        <div class="ant-form-item-control">
          <input type="date" name="eta" value="${order.eta ? order.eta.split('T')[0] : ''}" class="ant-input" required>
        </div>
      </div>
      
      <div class="ant-form-item">
        <label class="ant-form-item-label">창고</label>
        <div class="ant-form-item-control">
          <select name="warehouse" class="ant-select" required>
            <option value="">선택하세요</option>
            <option value="SEOUL" ${order.warehouse === 'SEOUL' ? 'selected' : ''}>서울</option>
            <option value="BUSAN" ${order.warehouse === 'BUSAN' ? 'selected' : ''}>부산</option>
            <option value="GWANGJU" ${order.warehouse === 'GWANGJU' ? 'selected' : ''}>광주</option>
            <option value="DAEJEON" ${order.warehouse === 'DAEJEON' ? 'selected' : ''}>대전</option>
          </select>
        </div>
      </div>
      
      <div class="ant-form-item">
        <label class="ant-form-item-label">담당부서</label>
        <div class="ant-form-item-control">
          <select name="department" class="ant-select" required>
            <option value="">선택하세요</option>
            <option value="CS" ${order.department === 'CS' ? 'selected' : ''}>CS</option>
            <option value="HES" ${order.department === 'HES' ? 'selected' : ''}>HES</option>
            <option value="LENOVO" ${order.department === 'LENOVO' ? 'selected' : ''}>LENOVO</option>
          </select>
        </div>
      </div>
      
      <div class="ant-form-item">
        <label class="ant-form-item-label">상태</label>
        <div class="ant-form-item-control">
          <select name="status" class="ant-select" required>
            <option value="PENDING" ${order.status === 'PENDING' ? 'selected' : ''}>대기</option>
            <option value="IN_PROGRESS" ${order.status === 'IN_PROGRESS' ? 'selected' : ''}>진행</option>
            <option value="COMPLETE" ${order.status === 'COMPLETE' ? 'selected' : ''}>완료</option>
            <option value="ISSUE" ${order.status === 'ISSUE' ? 'selected' : ''}>이슈</option>
            <option value="CANCEL" ${order.status === 'CANCEL' ? 'selected' : ''}>취소</option>
          </select>
        </div>
      </div>
      
      <div class="ant-form-item">
        <label class="ant-form-item-label">서비스 수준</label>
        <div class="ant-form-item-control">
          <input type="text" name="sla" value="${order.sla || ''}" class="ant-input">
        </div>
      </div>
      
      <div class="ant-form-item">
        <label class="ant-form-item-label">우편번호</label>
        <div class="ant-form-item-control">
          <input type="text" name="postal_code" value="${order.postal_code || ''}" class="ant-input">
        </div>
      </div>
      
      <div class="ant-form-item">
        <label class="ant-form-item-label">주소</label>
        <div class="ant-form-item-control">
          <input type="text" name="address" value="${order.address || ''}" class="ant-input">
        </div>
      </div>
      
      <div class="ant-form-item">
        <label class="ant-form-item-label">연락처</label>
        <div class="ant-form-item-control">
          <input type="text" name="contact" value="${order.contact || ''}" class="ant-input">
        </div>
      </div>
      
      <div class="ant-form-item">
        <label class="ant-form-item-label">메모</label>
        <div class="ant-form-item-control">
          <textarea name="remark" class="ant-input" rows="3">${order.remark || ''}</textarea>
        </div>
      </div>
    </form>
  `;
  
  // 모달 내용 설정
  const modalBody = document.querySelector('#editOrderModal .ant-modal-body');
  if (modalBody) modalBody.innerHTML = formContent;
  
  // 모달 타이틀 설정
  const modalTitle = document.querySelector('#editOrderModal .ant-modal-title');
  if (modalTitle) modalTitle.textContent = `주문 수정 (${orderId})`;
  
  // 모달 열기
  openModal('editOrderModal');
  
  // 저장 버튼 이벤트 설정
  const saveBtn = document.getElementById('saveOrderBtn');
  if (saveBtn) {
    saveBtn.onclick = handleUpdateOrder;
  }
}

// 주문 업데이트 처리
function handleUpdateOrder() {
  const form = document.getElementById('editOrderForm');
  if (!form) return;
  
  // 폼 데이터 수집
  const formData = new FormData(form);
  const orderId = formData.get('order_no');
  
  // 업데이트 데이터 객체 생성
  const updateData = {
    customer: formData.get('customer'),
    department: formData.get('department'),
    warehouse: formData.get('warehouse'),
    status: formData.get('status'),
    eta: formData.get('eta'),
    sla: formData.get('sla'),
    postal_code: formData.get('postal_code'),
    address: formData.get('address'),
    contact: formData.get('contact'),
    remark: formData.get('remark')
  };
  
  // 상태 변경에 따른 시간 업데이트
  const order = findOrderById(orderId);
  if (order) {
    // 대기 -> 진행: 출발 시간 설정
    if (order.status === 'PENDING' && updateData.status === 'IN_PROGRESS') {
      updateData.depart_time = new Date().toISOString();
    }
    
    // 진행 -> 완료/이슈: 완료 시간 설정
    if (order.status === 'IN_PROGRESS' && 
        (updateData.status === 'COMPLETE' || updateData.status === 'ISSUE')) {
      updateData.complete_time = new Date().toISOString();
    }
  }
  
  // 주문 업데이트
  if (updateOrder(orderId, updateData)) {
    showMessage('주문이 성공적으로 업데이트되었습니다', 'success');
    closeModal('editOrderModal');
    renderDashboardTable(); // 테이블 갱신
    updateSummaryCards();
  } else {
    showMessage('주문 업데이트 중 오류가 발생했습니다', 'error');
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initModals);

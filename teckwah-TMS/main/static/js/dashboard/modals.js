/**
 * 대시보드 모달 모듈
 * 주문 상세 정보 및 생성 모달을 담당합니다.
 */

// 네임스페이스에 모듈 추가
Dashboard.modal = {
  /**
   * 초기화
   */
  init: function() {
    console.log('[Dashboard.modal] 초기화');
    this.initOrderDetailModal();
    this.initCreateOrderModal();
  },
  
  /**
   * 주문 상세 모달 초기화
   */
  initOrderDetailModal: function() {
    const orderDetailModal = document.getElementById(Dashboard.config.orderDetailModalId);
    if (!orderDetailModal) return;
    
    // 이벤트 위임으로 모달 내 버튼 이벤트 관리
    orderDetailModal.addEventListener('click', (e) => {
      // 닫기 버튼
      if (e.target.matches('.modal-close, .close-btn, [data-dismiss="modal"]')) {
        Modal.hide(Dashboard.config.orderDetailModalId);
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
        Dashboard.loadOrderDetail(Dashboard.state.currentOrderId);
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
   * 신규 주문 모달 초기화
   */
  initCreateOrderModal: function() {
    const createOrderModal = document.getElementById(Dashboard.config.createOrderModalId);
    if (!createOrderModal) return;
    
    // 닫기 버튼
    const closeBtn = createOrderModal.querySelector('.modal-close, .close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        Modal.hide(Dashboard.config.createOrderModalId);
      });
    }
    
    // 주문 생성 폼 제출
    const createOrderForm = createOrderModal.querySelector('form');
    if (createOrderForm) {
      createOrderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createOrder(new FormData(createOrderForm));
      });
    }
    
    // 우편번호 입력 필드
    const postalCodeInput = createOrderModal.querySelector('input[name="postalCode"]');
    if (postalCodeInput) {
      postalCodeInput.addEventListener('blur', () => {
        postalCodeInput.value = Utils.formatPostalCode(postalCodeInput.value);
      });
    }
  },
  
  /**
   * 주문 편집 활성화
   */
  enableOrderEdit: function() {
    const modal = document.getElementById(Dashboard.config.orderDetailModalId);
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
    const modal = document.getElementById(Dashboard.config.orderDetailModalId);
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
    if (!Dashboard.state.currentOrderId) return;
    
    Api.post(`/orders/${Dashboard.state.currentOrderId}/lock`)
      .then(response => {
        if (response && response.success) {
          Dashboard.state.hasLock = true;
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
    if (!Dashboard.state.currentOrderId || !Dashboard.state.hasLock) return;
    
    Api.delete(`/orders/${Dashboard.state.currentOrderId}/lock`)
      .then(response => {
        if (response && response.success) {
          Dashboard.state.hasLock = false;
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
    if (!Dashboard.state.currentOrderId || !Dashboard.state.hasLock) {
      Notify.error('편집 권한이 없습니다.');
      return;
    }
    
    const modal = document.getElementById(Dashboard.config.orderDetailModalId);
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
    Api.put(`/orders/${Dashboard.state.currentOrderId}`, formData)
      .then(response => {
        if (response && response.success) {
          Notify.success('주문이 성공적으로 업데이트되었습니다.');
          
          // 편집 모드 비활성화
          this.disableOrderEdit();
          
          // 주문 목록 새로고침
          Dashboard.loadOrders();
          
          // 상세 정보 새로고침
          Dashboard.loadOrderDetail(Dashboard.state.currentOrderId);
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
    if (!Dashboard.state.currentOrderId) return;
    
    if (confirm('이 주문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      this.deleteOrder();
    }
  },
  
  /**
   * 주문 삭제
   */
  deleteOrder: function() {
    if (!Dashboard.state.currentOrderId) return;
    
    // 삭제 API 호출 (엔드포인트를 /delete로 수정)
    Api.post('/delete', { ids: [Dashboard.state.currentOrderId] })
      .then(response => {
        if (response && response.success) {
          Notify.success('주문이 성공적으로 삭제되었습니다.');
          
          // 모달 닫기
          Modal.hide(Dashboard.config.orderDetailModalId);
          
          // 주문 목록 새로고침
          Dashboard.loadOrders();
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
   * 새 주문 생성
   * @param {FormData} formData - 폼 데이터
   */
  createOrder: function(formData) {
    // 폼 데이터를 객체로 변환
    const orderData = {};
    for (const [key, value] of formData.entries()) {
      orderData[key] = value;
    }
    
    // 우편번호 포맷팅
    orderData.postalCode = Utils.formatPostalCode(orderData.postalCode);
    
    // API 호출
    Api.post('/orders', orderData)
      .then(response => {
        if (response && response.success) {
          Notify.success('주문이 성공적으로 생성되었습니다.');
          
          // 모달 닫기
          Modal.hide(Dashboard.config.createOrderModalId);
          
          // 폼 초기화
          const form = document.querySelector(`#${Dashboard.config.createOrderModalId} form`);
          if (form) form.reset();
          
          // 주문 목록 새로고침
          Dashboard.loadOrders();
        } else {
          Notify.error(response.message || '주문 생성에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('주문 생성 오류:', error);
        Notify.error('주문 생성에 실패했습니다.');
      });
  }
};

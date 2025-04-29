/**
 * 주문 상세 페이지 스크립트
 * 주문 상세 조회, 삭제 등 기능 처리
 * 인라인 편집 기능 추가
 */
document.addEventListener('DOMContentLoaded', function() {
  // 주문 상세 관리 모듈
  const OrderDetail = {
    // 주문 ID
    orderId: null,
    
    // 락 상태
    lockStatus: null,
    
    /**
     * 초기화 함수
     */
    init() {
      // URL에서 주문 ID 추출
      this.setOrderIdFromUrl();
      
      // 이벤트 리스너 설정
      this.initEventListeners();
      
      // 주문 데이터 로드
      if (this.orderId) {
        this.loadOrderData();
      } else {
        Utils.message.error('주문 정보를 찾을 수 없습니다.');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      }
    },
    
    /**
     * URL에서 주문 ID 추출
     */
    setOrderIdFromUrl() {
      const path = window.location.pathname;
      const matches = path.match(/\/orders\/(\d+)/);
      
      if (matches && matches[1]) {
        this.orderId = matches[1];
      }
    },
    
    /**
     * 이벤트 리스너 설정
     */
    initEventListeners() {
      // 수정 버튼
      const editBtn = document.getElementById('editOrderBtn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          window.location.href = `/orders/${this.orderId}/edit`;
        });
      }
      
      // 삭제 버튼
      const deleteBtn = document.getElementById('deleteOrderBtn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          this.showDeleteConfirm();
        });
      }
      
      // 취소 버튼 (삭제 확인 대화상자)
      const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
      if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
          this.hideDeleteConfirm();
        });
      }
      
      // 확인 버튼 (삭제 확인 대화상자)
      const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
      if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
          this.deleteOrder();
        });
      }
      
      // 주문번호 복사 버튼
      const copyOrderNoBtn = document.getElementById('copyOrderNo');
      if (copyOrderNoBtn) {
        copyOrderNoBtn.addEventListener('click', () => {
          const orderNo = document.getElementById('detailOrderNo');
          if (orderNo) {
            Utils.dom.copyToClipboard(orderNo.textContent);
          }
        });
      }
      
      // 상태 인라인 편집 기능 이벤트
      this.initStatusEditEvents();
      
      // 배차 정보 인라인 편집 기능 이벤트
      this.initDriverEditEvents();
    },
    
    /**
     * 상태 편집 이벤트 초기화
     */
    initStatusEditEvents() {
      // 상태 편집 버튼
      const editStatusBtn = document.getElementById('editStatusBtn');
      if (editStatusBtn) {
        editStatusBtn.addEventListener('click', async () => {
          // 락 확인
          await this.checkLockStatus();
          
          if (this.lockStatus && this.lockStatus.locked && !this.lockStatus.editable) {
            Utils.message.warning(`현재 ${this.lockStatus.owner}님이 편집 중입니다.`);
            return;
          }
          
          // 편집 폼 표시
          document.getElementById('statusDisplay').style.display = 'none';
          document.getElementById('statusEditForm').style.display = 'block';
        });
      }
      
      // 상태 저장 버튼
      const saveStatusBtn = document.getElementById('saveStatusBtn');
      if (saveStatusBtn) {
        saveStatusBtn.addEventListener('click', () => {
          this.saveStatus();
        });
      }
      
      // 상태 취소 버튼
      const cancelStatusBtn = document.getElementById('cancelStatusBtn');
      if (cancelStatusBtn) {
        cancelStatusBtn.addEventListener('click', () => {
          document.getElementById('statusDisplay').style.display = 'inline-block';
          document.getElementById('statusEditForm').style.display = 'none';
        });
      }
    },
    
    /**
     * 배차 정보 편집 이벤트 초기화
     */
    initDriverEditEvents() {
      // 배차 정보 편집 버튼
      const editDriverBtn = document.getElementById('editDriverBtn');
      if (editDriverBtn) {
        editDriverBtn.addEventListener('click', async () => {
          // 락 확인
          await this.checkLockStatus();
          
          if (this.lockStatus && this.lockStatus.locked && !this.lockStatus.editable) {
            Utils.message.warning(`현재 ${this.lockStatus.owner}님이 편집 중입니다.`);
            return;
          }
          
          // 편집 폼 표시
          document.getElementById('driverNameDisplay').style.display = 'none';
          document.getElementById('driverContactDisplay').style.display = 'none';
          document.getElementById('driverEditForm').style.display = 'block';
        });
      }
      
      // 배차 정보 저장 버튼
      const saveDriverBtn = document.getElementById('saveDriverBtn');
      if (saveDriverBtn) {
        saveDriverBtn.addEventListener('click', () => {
          this.saveDriverInfo();
        });
      }
      
      // 배차 정보 취소 버튼
      const cancelDriverBtn = document.getElementById('cancelDriverBtn');
      if (cancelDriverBtn) {
        cancelDriverBtn.addEventListener('click', () => {
          document.getElementById('driverNameDisplay').style.display = 'inline-block';
          document.getElementById('driverContactDisplay').style.display = 'inline-block';
          document.getElementById('driverEditForm').style.display = 'none';
        });
      }
    },
    
    /**
     * 주문 데이터 로드 및 화면 표시
     */
    async loadOrderData() {
      try {
        // 권한 확인 (일반 사용자도 조회 가능)
        if (!Utils.auth.checkPermission('USER')) {
          return;
        }
        
        // 로딩 표시
        Utils.http.showLoading();
        
        // 주문 상세 조회 API 호출
        const data = await Utils.http.get(`/orders/${this.orderId}`);
        
        // 주문 상세 정보 표시
        this.displayOrderData(data);
        
        // 삭제 버튼 권한 처리
        this.handleDeleteButtonVisibility();
        
        // 락 상태 확인
        await this.checkLockStatus();
      } catch (error) {
        console.error('주문 데이터 로드 오류:', error);
        Utils.message.error('주문 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        // 로딩 숨김
        Utils.http.hideLoading();
      }
    },
    
    /**
     * 주문 데이터를 화면에 표시
     */
    displayOrderData(orderData) {
      try {
        // 주문번호 필드
        const orderNoField = document.getElementById('detailOrderNo');
        if (orderNoField) {
          orderNoField.textContent = orderData.orderNo || '-';
        }
        
        // 고객명, 유형 등 필드 업데이트 - span.detail-value 요소 찾기
        const updateFields = {
          '고객': orderData.customer,
          '유형': orderData.typeLabel || orderData.type,
          '부서': orderData.department,
          '창고': orderData.warehouse,
          'SLA': orderData.sla,
          '우편번호': orderData.postalCode,
          'ETA': this.formatDateTime(orderData.eta),
          '생성 시간': this.formatDateTime(orderData.createTime),
          '출발 시간': orderData.departTime ? this.formatDateTime(orderData.departTime) : '-',
          '완료 시간': orderData.completeTime ? this.formatDateTime(orderData.completeTime) : '-',
          '배송기사': orderData.driverName || '-',
          '배송기사 연락처': orderData.driverContact || '-',
          '배송주소': orderData.address,
          '연락처': orderData.contact || '-'
        };
        
        // 모든 detail-label 요소를 순회하며 매칭되는 값 찾기
        document.querySelectorAll('.detail-label').forEach(label => {
          const labelText = label.textContent.trim();
          if (updateFields[labelText]) {
            // 부모 요소 내의 detail-value 클래스 요소 찾기
            const detailItem = label.closest('.detail-item');
            if (detailItem) {
              const valueEl = detailItem.querySelector('.detail-value');
              if (valueEl) {
                valueEl.textContent = updateFields[labelText];
              }
            }
          }
        });
        
        // 상태 배지 업데이트
        const statusBadge = document.querySelector('.status-badge');
        if (statusBadge) {
          statusBadge.textContent = orderData.statusLabel || Utils.status.getText(orderData.status);
          statusBadge.className = `status-badge status-${orderData.status.toLowerCase()}`;
        }
        
        // 메모 필드 업데이트
        const remarkContainer = document.querySelector('.remark-container .detail-value');
        if (remarkContainer) {
          remarkContainer.textContent = orderData.remark || '-';
        }
        
        // 업데이트 정보 업데이트
        const updateAtEl = document.querySelector('.update-info .update-value:first-child');
        const updateByEl = document.querySelector('.update-info .update-value:last-child');
        
        if (updateAtEl) {
          updateAtEl.textContent = this.formatDateTime(orderData.updateAt);
        }
        
        if (updateByEl) {
          updateByEl.textContent = orderData.updatedBy || '-';
        }
      } catch (error) {
        console.error('주문 데이터 표시 중 오류:', error);
      }
    },
    
    /**
     * 요소에 텍스트 업데이트 (안전하게)
     */
    updateElementText(elementId, text) {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = text || '-';
      }
    },
    
    /**
     * 날짜/시간 포맷 변환
     */
    formatDateTime(dateTimeStr) {
      if (!dateTimeStr) return '-';
      
      try {
        const date = new Date(dateTimeStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      } catch (e) {
        console.error('날짜 포맷 변환 오류:', e);
        return dateTimeStr || '-';
      }
    },
    
    /**
     * 권한에 따른 삭제 버튼 처리
     */
    handleDeleteButtonVisibility() {
      const deleteBtn = document.getElementById('deleteOrderBtn');
      if (!deleteBtn) return;
      
      // 관리자가 아니면 삭제 버튼 숨김
      if (!Utils.auth.isAdmin()) {
        deleteBtn.style.display = 'none';
      }
    },
    
    /**
     * 락 상태 확인
     */
    async checkLockStatus() {
      try {
        this.lockStatus = await Utils.http.get(`/lock/${this.orderId}`);
        return this.lockStatus;
      } catch (error) {
        console.error('락 상태 확인 오류:', error);
        Utils.message.error('락 상태를 확인하는 중 오류가 발생했습니다.');
        return null;
      }
    },
    
    /**
     * 상태 변경 저장
     */
    async saveStatus() {
      try {
        // 로딩 표시
        Utils.http.showLoading();
        
        // 선택된 상태 값 가져오기
        const statusSelect = document.getElementById('statusInput');
        const newStatus = statusSelect.value;
        
        // 상태 변경 API 호출
        const response = await Utils.http.post('/status', {
          ids: [parseInt(this.orderId, 10)],
          status: newStatus
        });
        
        // 성공 처리
        if (response && response.success) {
          Utils.message.success(response.message || '상태가 변경되었습니다.');
          
          // 상태 텍스트 업데이트
          const statusDisplay = document.getElementById('statusDisplay');
          statusDisplay.textContent = this.getStatusLabel(newStatus);
          statusDisplay.className = `detail-value status-badge status-${newStatus.toLowerCase()}`;
          
          // 상태 변경 시 자동으로 추가되는 시간 필드 업데이트를 위해 페이지 새로고침
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          throw new Error(response.message || '상태 변경 실패');
        }
      } catch (error) {
        console.error('상태 변경 오류:', error);
        Utils.message.error(error.message || '상태 변경 중 오류가 발생했습니다.');
      } finally {
        // 로딩 숨김
        Utils.http.hideLoading();
        
        // 편집 폼 숨김
        document.getElementById('statusDisplay').style.display = 'inline-block';
        document.getElementById('statusEditForm').style.display = 'none';
      }
    },
    
    /**
     * 상태 코드에 대한 라벨 반환
     */
    getStatusLabel(status) {
      const statusMap = {
        'WAITING': '대기',
        'IN_PROGRESS': '진행',
        'COMPLETE': '완료',
        'ISSUE': '이슈',
        'CANCEL': '취소'
      };
      
      return statusMap[status] || status;
    },
    
    /**
     * 배차 정보 저장
     */
    async saveDriverInfo() {
      try {
        // 로딩 표시
        Utils.http.showLoading();
        
        // 입력 값 가져오기
        const driverNameInput = document.getElementById('driverNameInput');
        const driverContactInput = document.getElementById('driverContactInput');
        
        const driverName = driverNameInput.value.trim();
        const driverContact = driverContactInput.value.trim();
        
        // 배차 정보 업데이트 API 호출
        const response = await Utils.http.post('/driver', {
          ids: [parseInt(this.orderId, 10)],
          driver_name: driverName,
          driver_contact: driverContact
        });
        
        // 성공 처리
        if (response && response.success) {
          Utils.message.success(response.message || '배차 정보가 업데이트되었습니다.');
          
          // 배차 정보 화면 업데이트
          document.getElementById('driverNameDisplay').textContent = driverName || '-';
          document.getElementById('driverContactDisplay').textContent = driverContact || '-';
        } else {
          throw new Error(response.message || '배차 정보 업데이트 실패');
        }
      } catch (error) {
        console.error('배차 정보 업데이트 오류:', error);
        Utils.message.error(error.message || '배차 정보 업데이트 중 오류가 발생했습니다.');
      } finally {
        // 로딩 숨김
        Utils.http.hideLoading();
        
        // 편집 폼 숨김
        document.getElementById('driverNameDisplay').style.display = 'inline-block';
        document.getElementById('driverContactDisplay').style.display = 'inline-block';
        document.getElementById('driverEditForm').style.display = 'none';
      }
    },
    
    /**
     * 삭제 확인 대화상자 표시
     */
    showDeleteConfirm() {
      const dialog = document.getElementById('deleteConfirmDialog');
      if (dialog) {
        dialog.classList.add('active');
      } else {
        // 대화상자가 없으면 window.confirm 사용
        if (confirm('정말로 이 주문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
          this.deleteOrder();
        }
      }
    },
    
    /**
     * 삭제 확인 대화상자 숨김
     */
    hideDeleteConfirm() {
      const dialog = document.getElementById('deleteConfirmDialog');
      if (dialog) {
        dialog.classList.remove('active');
      }
    },
    
    /**
     * 주문 삭제 처리
     */
    async deleteOrder() {
      try {
        // 권한 확인 (관리자만 삭제 가능)
        if (!Utils.auth.checkPermission('ADMIN')) {
          this.hideDeleteConfirm();
          return;
        }
        
        // 로딩 표시
        Utils.http.showLoading();
        
        // 삭제 전 락 상태 확인
        try {
          const lockStatus = await Utils.http.get(`/lock/${this.orderId}`);
          if (lockStatus.locked && !lockStatus.editable) {
            throw new Error(`현재 다른 사용자(${lockStatus.owner})가 수정 중입니다. 잠시 후 다시 시도해주세요.`);
          }
        } catch (lockError) {
          // 락 확인 실패 시 원본 예외 그대로 throw
          if (lockError.message.includes('다른 사용자')) {
            throw lockError;
          }
          // 그 외 오류는 무시하고 계속 진행
          console.warn('락 확인 오류 무시:', lockError);
        }
        
        // 삭제 API 호출
        const response = await Utils.http.post('/delete', {
          ids: [parseInt(this.orderId, 10)]
        });
        
        // 성공 처리
        if (response && response.success) {
          Utils.message.success(response.message || '주문이 성공적으로 삭제되었습니다.');
          
          // 대시보드로 이동
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
        } else {
          throw new Error(response.message || '삭제 실패');
        }
      } catch (error) {
        console.error('주문 삭제 오류:', error);
        Utils.message.error(error.message || '주문 삭제 중 오류가 발생했습니다.');
      } finally {
        // 로딩 숨김
        Utils.http.hideLoading();
        // 대화상자 숨김
        this.hideDeleteConfirm();
      }
    }
  };
  
  // 주문 상세 모듈 초기화
  OrderDetail.init();
  
  // 글로벌 스코프에 노출
  window.OrderDetail = OrderDetail;
});

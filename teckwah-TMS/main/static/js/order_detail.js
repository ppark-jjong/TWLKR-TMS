/**
 * 주문 상세 페이지 스크립트
 * 주문 상세 조회, 삭제 등 기능 처리
 * 인라인 편집 기능 추가
 */
document.addEventListener('DOMContentLoaded', function () {
  // --- 초기 데이터 로드 --- (추가)
  let pageData = {};
  let order = null;
  let lockStatus = null;
  let orderId = null;

  try {
    console.log('Attempting to parse page data...');
    const jsonDataElement = document.getElementById('page-data-script');
    if (!jsonDataElement)
      throw new Error('Page data script element not found.');
    pageData = JSON.parse(jsonDataElement.textContent || '{}');
    order = pageData.order;
    lockStatus = pageData.lock_status;
    orderId = order?.dashboardId;

    if (!orderId) {
      throw new Error('Order ID not found in page data');
    }
    console.log('Initial page data loaded successfully:', pageData);
  } catch (e) {
    console.error('Failed to initialize page data:', e);
    alert('페이지 초기화 오류: 데이터를 불러올 수 없습니다.'); // 임시 알림
    return;
  }

  // 주문 상세 관리 모듈
  const OrderDetail = {
    orderId: orderId,
    lockStatus: lockStatus,

    init() {
      console.log('OrderDetail init started.');
      this.initEventListeners();
      if (this.orderId) {
        console.log('Initial data exists, displaying order.');
        this.displayOrderData(order);
        this.handleDeleteButtonVisibility(); // Utils.auth.isAdmin 호출 확인 필요
        this.updateLockStatusUI();
      } else {
        console.error('Order ID missing after initialization.');
      }
      console.log('OrderDetail init finished.');
    },

    initEventListeners() {
      console.log('Initializing event listeners...');
      // 삭제 버튼
      const deleteBtn = document.getElementById('deleteOrderBtn');
      const deleteForm = deleteBtn?.closest('form');
      if (deleteForm && deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (
            confirm(
              '정말로 이 주문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
            )
          ) {
            console.log('Delete confirmed, submitting form...');
            deleteForm.submit();
          }
        });
      } else {
        console.warn('Delete form or button not found.');
      }

      // 주문번호 복사 버튼
      const copyOrderNoBtn = document.getElementById('copyOrderNo');
      copyOrderNoBtn?.addEventListener('click', () => {
        const orderNo = document.getElementById('detailOrderNo')?.textContent;
        if (orderNo) {
          navigator.clipboard.writeText(orderNo).then(
            () => {
              alert('주문번호가 복사되었습니다.'); // 임시 알림
            },
            (err) => {
              console.error('Clipboard copy failed: ', err);
              alert('주문번호 복사에 실패했습니다.');
            }
          );
        }
      });

      console.log('Event listeners initialized (inline edit removed).');
    },

    displayOrderData(orderData) {
      if (!orderData) return;
      console.log('Displaying order data:', orderData);
      try {
        const orderNoField = document.getElementById('detailOrderNo');
        if (orderNoField) orderNoField.textContent = orderData.orderNo || '-';

        const updateFields = {
          고객: orderData.customer,
          유형: orderData.typeLabel || orderData.type,
          부서: orderData.department,
          창고: orderData.warehouse,
          SLA: orderData.sla,
          우편번호: orderData.postalCode,
          ETA: this.formatDateTime(orderData.eta),
          '생성 시간': this.formatDateTime(orderData.createTime),
          '출발 시간': orderData.departTime
            ? this.formatDateTime(orderData.departTime)
            : '-',
          '완료 시간': orderData.completeTime
            ? this.formatDateTime(orderData.completeTime)
            : '-',
          배송기사: orderData.driverName || '-',
          '배송기사 연락처': orderData.driverContact || '-',
          배송주소: orderData.address,
          연락처: orderData.contact || '-',
        };
        document.querySelectorAll('.detail-label').forEach((label) => {
          const labelText = label.textContent.trim();
          if (updateFields[labelText]) {
            const detailItem = label.closest('.detail-item');
            const valueEl = detailItem?.querySelector('.detail-value');
            if (valueEl) valueEl.textContent = updateFields[labelText];
          }
        });

        const statusBadge = document.getElementById('statusDisplay');
        if (statusBadge) {
          statusBadge.textContent =
            orderData.statusLabel || this.getStatusLabel(orderData.status);
          statusBadge.className = `status-badge status-${orderData.status.toLowerCase()}`;
          statusBadge.dataset.statusValue = orderData.status;
        }
        this.updateElementText('driverNameDisplay', orderData.driverName);
        this.updateElementText('driverContactDisplay', orderData.driverContact);

        const remarkContainer = document.querySelector(
          '.remark-container .detail-value'
        );
        if (remarkContainer)
          remarkContainer.textContent = orderData.remark || '-';

        const updateAtEl = document.querySelector(
          '.update-info .update-value:first-child'
        );
        const updateByEl = document.querySelector(
          '.update-info .update-value:last-child'
        );
        if (updateAtEl)
          updateAtEl.textContent = this.formatDateTime(orderData.updateAt);
        if (updateByEl) updateByEl.textContent = orderData.updatedBy || '-';
      } catch (error) {
        console.error('Error displaying order data:', error);
      }
    },

    updateElementText(elementId, text) {
      const element = document.getElementById(elementId);
      if (element) element.textContent = text || '-';
    },

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
        return dateTimeStr || '-';
      }
    },

    handleDeleteButtonVisibility() {
      console.log('Checking delete button visibility...');
      const deleteBtnContainer = document.querySelector(
        '.header-actions form[action*="/delete"]'
      );
      // 관리자 여부 확인 필요 - 임시로 항상 보이게 하거나 서버 데이터 기반 처리
      // const isAdmin = pageData?.current_user_role === 'ADMIN'; // 초기 데이터 사용
      // if (deleteBtnContainer && !isAdmin) {
      //     deleteBtnContainer.style.display = 'none';
      // }
      console.log('Delete button visibility check done.');
    },

    async checkLockAndNotify() {
      console.log('[Lock Check] Starting check...');
      const lockInfo = await this.checkLockStatus();
      console.log('[Lock Check] Info received:', lockInfo);
      if (!lockInfo || (lockInfo.isLocked && !lockInfo.editable)) {
        // isLocked 속성 사용 가정
        console.warn('[Lock Check] Cannot edit, item is locked.');
        alert(
          `수정 불가: ${lockInfo?.lockedBy || '다른 사용자'}님이 편집 중입니다.`
        );
        return false;
      }
      console.log('[Lock Check] Editable.');
      return true;
    },

    async checkLockStatus() {
      console.log(
        `[Lock Check] Fetching lock status for order ID: ${this.orderId}`
      );
      if (!this.orderId) return null;
      try {
        const response = await fetch(`/api/lock/order/${this.orderId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error ${response.status}`); // 서버 응답의 message 사용 시도
        }
        const result = await response.json();
        // 서버 응답 형식이 { editable: bool, message: str, locked_by: str|null, locked_at: str|null } 라고 가정
        if (typeof result?.editable === 'undefined') {
          throw new Error('Invalid lock status response format.');
        }
        console.log('[Lock Check] API result:', result);
        this.lockStatus = result;
        this.updateLockStatusUI();
        return this.lockStatus;
      } catch (error) {
        console.error('[Lock Check] API Error:', error);
        alert('락 상태를 확인하는 중 오류가 발생했습니다.');
        this.disableInlineEditButtons();
        return null;
      }
    },

    updateLockStatusUI() {
      const lockNotificationArea = document.getElementById(
        'lockNotificationArea'
      );
      if (!lockNotificationArea) return;

      const isEditable = this.lockStatus?.editable;
      const isLocked = this.lockStatus?.isLocked; // lockStatus 스키마 확인 필요, isLocked 사용 가정
      const lockedBy = this.lockStatus?.lockedBy;
      console.log(
        `[UI Update] Lock Status: isLocked=${isLocked}, isEditable=${isEditable}, lockedBy=${lockedBy}`
      );

      if (isLocked && !isEditable) {
        lockNotificationArea.innerHTML = `
                <div class="alert alert-warning" role="alert">
                    <i class="fa-solid fa-lock me-2"></i>
                    <strong>알림:</strong> 현재 ${
                      lockedBy || '다른 사용자'
                    }님이 편집 중입니다.
                </div>`;
        this.disableInlineEditButtons();
      } else {
        lockNotificationArea.innerHTML = ''; // 알림 없음
        this.enableInlineEditButtons();
      }

      const mainEditBtn = document.querySelector(
        '.header-actions a[href*="/edit"]'
      );
      if (mainEditBtn) {
        mainEditBtn.style.display = isEditable ? '' : 'none'; // 전체 수정 버튼 제어
      }
    },

    disableInlineEditButtons() {
      console.log('Disabling inline edit buttons.');
      document.getElementById('editStatusBtn')?.setAttribute('disabled', true);
      document.getElementById('editDriverBtn')?.setAttribute('disabled', true);
    },

    enableInlineEditButtons() {
      console.log('Enabling inline edit buttons.');
      document.getElementById('editStatusBtn')?.removeAttribute('disabled');
      document.getElementById('editDriverBtn')?.removeAttribute('disabled');
    },

    getStatusLabel(status) {
      const statusMap = { WAITING: '대기' /*...*/ };
      return statusMap[status] || status;
    },

    // deleteOrder 함수는 Form 제출 방식으로 변경되었으므로 제거 또는 주석 처리
    // deleteOrder() { ... }
  };

  OrderDetail.init();
});

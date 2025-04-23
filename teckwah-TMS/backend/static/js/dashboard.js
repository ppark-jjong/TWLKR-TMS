/**
 * 대시보드 페이지 JavaScript
 */

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function () {
  setupFilterForm();
  setupDateRangeToggle();
});

// 필터 폼 설정
function setupFilterForm() {
  const filterForm = document.getElementById('filterForm');
  if (!filterForm) return;

  filterForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(filterForm);
    const queryParams = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      if (value) {
        queryParams.append(key, value);
      }
    }

    // 현재 URL 경로 유지하면서 쿼리 파라미터만 변경
    window.location.href = `${
      window.location.pathname
    }?${queryParams.toString()}`;
  });
}

// 날짜 범위 설정에 따라 커스텀 날짜 입력 표시/숨김
function setupDateRangeToggle() {
  const dateRangeSelect = document.getElementById('date_range');
  const dateInputs = document.getElementById('dateInputs');

  if (!dateRangeSelect || !dateInputs) return;

  // 초기 상태 설정
  if (dateRangeSelect.value === 'custom') {
    dateInputs.style.display = 'flex';
  } else {
    dateInputs.style.display = 'none';
  }

  // 변경 이벤트 리스너
  dateRangeSelect.addEventListener('change', function () {
    if (this.value === 'custom') {
      dateInputs.style.display = 'flex';
    } else {
      dateInputs.style.display = 'none';
    }
  });
}

// 필터 초기화
function resetFilters() {
  window.location.href = window.location.pathname;
}

// 주문 목록 새로고침
function refreshOrders() {
  // 현재 URL 그대로 새로고침
  window.location.reload();
}

// 주문 상세 정보 보기
function viewOrderDetail(orderId) {
  // 주문 상세 정보 API 호출
  apiRequest(`/dashboard/order/${orderId}`)
    .then((result) => {
      if (result.success) {
        displayOrderDetail(result.data);
      } else {
        showError(result.message || '주문 정보를 불러올 수 없습니다.');
      }
    })
    .catch((error) => {
      showError('주문 정보를 불러오는 중 오류가 발생했습니다.');
      console.error('주문 상세 정보 조회 오류:', error);
    });
}

// 주문 상세 정보 표시
function displayOrderDetail(order) {
  const modal = document.getElementById('orderDetailModal');
  const content = document.getElementById('orderDetailContent');

  if (!modal || !content) return;

  // 상태 텍스트 설정
  let statusText = order.status;
  switch (order.status) {
    case 'pending':
      statusText = '배차대기';
      break;
    case 'assigned':
      statusText = '배차완료';
      break;
    case 'in_progress':
      statusText = '배송중';
      break;
    case 'delivered':
      statusText = '배송완료';
      break;
    case 'cancelled':
      statusText = '취소';
      break;
  }

  // 상세 정보 HTML 생성
  content.innerHTML = `
        <div class="order-detail">
            <div class="detail-group">
                <label>주문번호</label>
                <p>${order.order_id}</p>
            </div>
            <div class="detail-group">
                <label>상태</label>
                <p><span class="status-badge ${
                  order.status
                }">${statusText}</span></p>
            </div>
            <div class="detail-group">
                <label>예상 도착 시간</label>
                <p>${order.eta || '-'}</p>
            </div>
            <div class="detail-group">
                <label>고객명</label>
                <p>${order.customer_name}</p>
            </div>
            <div class="detail-group">
                <label>연락처</label>
                <p>${order.customer_phone || '-'}</p>
            </div>
            <div class="detail-group">
                <label>배송지</label>
                <p>${order.address}</p>
            </div>
            <div class="detail-group">
                <label>상품 정보</label>
                <p>${order.product_info || '-'}</p>
            </div>
            <div class="detail-group">
                <label>배송 기사</label>
                <p>${order.driver_name || '-'}</p>
            </div>
            <div class="detail-group">
                <label>등록일시</label>
                <p>${order.created_at || '-'}</p>
            </div>
            <div class="detail-group">
                <label>메모</label>
                <p>${order.note || '-'}</p>
            </div>
            
            <div class="detail-actions">
                ${
                  order.status === 'pending'
                    ? `<button class="assign-button" onclick="assignDriver('${order.order_id}')">배차하기</button>`
                    : ''
                }
                ${
                  order.status !== 'delivered' && order.status !== 'cancelled'
                    ? `<button class="update-button" onclick="updateOrderStatus('${order.order_id}')">상태 변경</button>`
                    : ''
                }
            </div>
        </div>
    `;

  // 모달 표시
  modal.style.display = 'block';
}

// 배송기사 배정 모달 표시
function assignDriver(orderId) {
  const modal = document.getElementById('assignDriverModal');
  const orderIdInput = document.getElementById('assignOrderId');

  if (!modal || !orderIdInput) return;

  orderIdInput.value = orderId;

  // 배차 폼 이벤트 핸들러 설정
  const assignForm = document.getElementById('assignDriverForm');
  if (assignForm) {
    assignForm.onsubmit = function (e) {
      e.preventDefault();
      submitAssignDriver(this);
    };
  }

  // 모달 표시
  modal.style.display = 'block';
}

// 배송기사 배정 제출
function submitAssignDriver(form) {
  const formData = formToJson(form);

  // API 요청
  apiRequest('/dashboard/assign-driver', 'POST', formData)
    .then((result) => {
      if (result.success) {
        alert('배차가 완료되었습니다.');
        closeModal();
        // 페이지 새로고침
        window.location.reload();
      } else {
        showError(result.message || '배차 처리 중 오류가 발생했습니다.');
      }
    })
    .catch((error) => {
      showError('배차 처리 중 오류가 발생했습니다.');
      console.error('배차 오류:', error);
    });
}

// 주문 상태 변경
function updateOrderStatus(orderId) {
  // 상태 선택 모달 생성 및 표시
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'statusModal';
  modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>주문 상태 변경</h2>
                <span class="modal-close" onclick="closeModal()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="statusForm">
                    <input type="hidden" name="order_id" value="${orderId}">
                    <div class="form-group">
                        <label for="status">상태 선택</label>
                        <select id="status" name="status" required>
                            <option value="">상태 선택</option>
                            <option value="assigned">배차완료</option>
                            <option value="in_progress">배송중</option>
                            <option value="delivered">배송완료</option>
                            <option value="cancelled">취소</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <button type="submit" class="submit-button">상태 변경</button>
                    </div>
                </form>
            </div>
        </div>
    `;

  document.body.appendChild(modal);

  // 폼 제출 이벤트 핸들러 설정
  const statusForm = document.getElementById('statusForm');
  if (statusForm) {
    statusForm.onsubmit = function (e) {
      e.preventDefault();
      submitStatusChange(this);
    };
  }

  // 모달 표시
  modal.style.display = 'block';
}

// 상태 변경 제출
function submitStatusChange(form) {
  const formData = formToJson(form);

  // API 요청
  apiRequest('/dashboard/update-status', 'POST', formData)
    .then((result) => {
      if (result.success) {
        alert('상태가 변경되었습니다.');
        closeModal();
        // 페이지 새로고침
        window.location.reload();
      } else {
        showError(result.message || '상태 변경 중 오류가 발생했습니다.');
      }
    })
    .catch((error) => {
      showError('상태 변경 중 오류가 발생했습니다.');
      console.error('상태 변경 오류:', error);
    });
}

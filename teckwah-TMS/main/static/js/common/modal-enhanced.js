/**
 * 향상된 모달 관련 공통 기능
 */

/**
 * 모달 창 열기 (애니메이션 적용)
 * @param {HTMLElement|string} modal - 모달 요소 또는 CSS 선택자
 */
function openModalEnhanced(modal) {
  // 문자열(선택자)인 경우 요소 찾기
  if (typeof modal === 'string') {
    modal = document.querySelector(modal);
  }
  
  if (!modal) return;
  
  // 모달 표시
  modal.style.display = 'block';
  
  // 애니메이션을 위한 활성화 클래스 추가 (약간의 딜레이 적용)
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
  
  // 스크롤 방지
  document.body.style.overflow = 'hidden';
  
  // 포커스 설정 (첫 번째 입력 필드 또는 모달 자체)
  const firstInput = modal.querySelector('input:not([readonly]), select, textarea, button:not(.close-btn)');
  if (firstInput) {
    setTimeout(() => {
      firstInput.focus();
    }, 300); // 애니메이션 완료 후 포커스
  } else {
    modal.setAttribute('tabindex', '-1');
    modal.focus();
  }
  
  // 아코디언 섹션 초기화 (있는 경우)
  initializeAccordions(modal);
  
  // 모달 열림 이벤트 발생
  const event = new CustomEvent('modalOpened', { detail: { modal } });
  document.dispatchEvent(event);
}

/**
 * 모달 창 닫기 (애니메이션 적용)
 * @param {HTMLElement|string} modal - 모달 요소 또는 CSS 선택자
 */
function closeModalEnhanced(modal) {
  // 문자열(선택자)인 경우 요소 찾기
  if (typeof modal === 'string') {
    modal = document.querySelector(modal);
  }
  
  if (!modal) return;
  
  // 애니메이션을 위한 활성화 클래스 제거
  modal.classList.remove('active');
  
  // 애니메이션 완료 후 모달 숨기기
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
  
  // 스크롤 복원
  document.body.style.overflow = '';
  
  // 모달 닫힘 이벤트 발생
  const event = new CustomEvent('modalClosed', { detail: { modal } });
  document.dispatchEvent(event);
}

/**
 * 모달 스피너 토글
 * @param {HTMLElement|string} modal - 모달 요소 또는 CSS 선택자
 * @param {boolean} show - 표시 여부
 */
function toggleModalSpinnerEnhanced(modal, show = true) {
  // 문자열(선택자)인 경우 요소 찾기
  if (typeof modal === 'string') {
    modal = document.querySelector(modal);
  }
  
  if (!modal) return;
  
  // 모달 내부의 spinner 요소 찾기 또는 생성
  let spinner = modal.querySelector('.modal-loading');
  
  if (!spinner && show) {
    spinner = document.createElement('div');
    spinner.className = 'modal-loading';
    spinner.innerHTML = `
      <div class="loading-spinner"></div>
      <span class="loading-text">처리 중입니다...</span>
    `;
    
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
      modalBody.prepend(spinner);
    }
  }
  
  if (spinner) {
    // 스피너 표시/숨김
    spinner.style.display = show ? 'flex' : 'none';
  }
  
  // 입력 필드 비활성화/활성화
  const inputs = modal.querySelectorAll('input, select, textarea, button:not(.close-btn)');
  inputs.forEach(input => {
    input.disabled = show;
  });
  
  // 모달 내용 흐리게/선명하게
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    if (show) {
      modalContent.style.pointerEvents = 'none';
    } else {
      modalContent.style.pointerEvents = '';
    }
  }
}

/**
 * 아코디언 섹션 초기화
 * @param {HTMLElement} container - 아코디언이 포함된 컨테이너
 */
function initializeAccordions(container) {
  const accordions = container.querySelectorAll('.section-header');
  
  accordions.forEach(header => {
    // 이미 이벤트가 등록되어 있는지 확인
    if (header.getAttribute('data-accordion-initialized') === 'true') return;
    
    const section = header.closest('.detail-section');
    const content = section?.querySelector('.section-content');
    const toggle = header.querySelector('.section-toggle');
    
    if (section && content && toggle) {
      header.addEventListener('click', () => {
        const isOpen = section.classList.contains('open');
        
        if (isOpen) {
          section.classList.remove('open');
          content.style.maxHeight = null;
          toggle.style.transform = 'rotate(0deg)';
        } else {
          section.classList.add('open');
          content.style.maxHeight = content.scrollHeight + 'px';
          toggle.style.transform = 'rotate(180deg)';
        }
      });
      
      // 초기 상태 설정 (기본으로 열림)
      section.classList.add('open');
      content.style.maxHeight = content.scrollHeight + 'px';
      toggle.style.transform = 'rotate(180deg)';
      
      // 초기화 표시
      header.setAttribute('data-accordion-initialized', 'true');
    }
  });
}

/**
 * 향상된 alert 모달 표시
 * @param {string} message - 표시할 메시지
 * @param {string} type - 알림 타입 ('success', 'error', 'warning', 'info')
 * @param {Object} options - 추가 옵션
 */
function showAlertEnhanced(message, type = 'info', options = {}) {
  const title = options.title || getDefaultTitle(type);
  const duration = options.duration !== undefined ? options.duration : 3000;
  const position = options.position || 'top';
  
  // 기존 알림 요소 제거
  const existingAlert = document.getElementById('enhancedAlert');
  if (existingAlert) {
    existingAlert.remove();
  }
  
  // 알림 요소 생성
  const alertElement = document.createElement('div');
  alertElement.id = 'enhancedAlert';
  alertElement.className = `alert alert-${type} fade-in`;
  
  // 위치 클래스 추가
  alertElement.classList.add(`alert-${position}`);
  
  // 내용 설정
  alertElement.innerHTML = `
    <div class="alert-icon">
      <i class="fas fa-${getIconForType(type)}"></i>
    </div>
    <div class="alert-content">
      ${title ? `<div class="alert-title">${title}</div>` : ''}
      <div class="alert-message">${message}</div>
    </div>
    <button type="button" class="alert-close">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // 문서에 추가
  document.body.appendChild(alertElement);
  
  // 닫기 버튼 이벤트 등록
  const closeButton = alertElement.querySelector('.alert-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      alertElement.classList.remove('fade-in');
      alertElement.classList.add('fade-out');
      
      setTimeout(() => {
        if (alertElement.parentNode) {
          alertElement.remove();
        }
      }, 300);
    });
  }
  
  // 자동 닫힘 설정
  if (duration > 0) {
    setTimeout(() => {
      if (alertElement.parentNode) {
        alertElement.classList.remove('fade-in');
        alertElement.classList.add('fade-out');
        
        setTimeout(() => {
          if (alertElement.parentNode) {
            alertElement.remove();
          }
        }, 300);
      }
    }, duration);
  }
  
  return alertElement;
  
  // 타입에 따른 기본 제목 가져오기
  function getDefaultTitle(type) {
    switch (type) {
      case 'success': return '완료';
      case 'error': return '오류';
      case 'warning': return '주의';
      case 'info': return '알림';
      default: return '';
    }
  }
  
  // 타입에 따른 아이콘 가져오기
  function getIconForType(type) {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'times-circle';
      case 'warning': return 'exclamation-triangle';
      case 'info': return 'info-circle';
      default: return 'info-circle';
    }
  }
}

/**
 * 상세 정보 모달에 데이터 렌더링 (향상된 UI)
 * @param {HTMLElement} container - 내용을 표시할 컨테이너
 * @param {Object} data - 주문 상세 데이터
 */
function renderOrderDetailEnhanced(container, data) {
  // 상태 클래스 정의
  const statusClasses = {
    'WAITING': 'waiting',
    'IN_PROGRESS': 'in-progress',
    'COMPLETE': 'complete',
    'ISSUE': 'issue',
    'CANCEL': 'cancel'
  };
  
  // 컨테이너에 ID 속성 추가 (편집 모드에서 사용)
  container.setAttribute('data-id', data.dashboardId);
  
  // HTML 생성
  let html = '<div class="detail-container">';
  
  // 헤더 영역 (주문 번호 및 상태)
  html += `
    <div class="detail-header">
      <h3 class="detail-title">주문 #${data.orderNo || data.dashboardId}</h3>
      <span class="detail-status ${statusClasses[data.status] || ''}">
        ${data.statusLabel || data.status || '-'}
      </span>
    </div>
  `;
  
  // 락 정보 표시 (다른 사용자가 락을 가진 경우)
  if (data.isLocked && !data.editable) {
    html += `
      <div class="lock-info">
        <i class="fas fa-lock"></i>
        현재 ${data.lockedBy || '다른 사용자'}가 편집 중입니다.
      </div>
    `;
  }
  
  // 기본 정보 섹션
  html += `
    <div class="detail-section">
      <div class="section-header">
        <h3 class="section-title">기본 정보</h3>
        <i class="fas fa-chevron-down section-toggle"></i>
      </div>
      <div class="section-content">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">주문번호</span>
            <span class="detail-value highlight">${data.orderNo || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">유형</span>
            <span class="detail-value">${data.typeLabel || data.type || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">부서</span>
            <span class="detail-value">${data.department || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">창고</span>
            <span class="detail-value">${data.warehouse || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">SLA</span>
            <span class="detail-value">${data.sla || '-'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 배송 정보 섹션
  html += `
    <div class="detail-section">
      <div class="section-header">
        <h3 class="section-title">배송 정보</h3>
        <i class="fas fa-chevron-down section-toggle"></i>
      </div>
      <div class="section-content">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">ETA</span>
            <span class="detail-value">${data.eta || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">우편번호</span>
            <span class="detail-value">${data.postalCode || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">지역</span>
            <span class="detail-value">${data.region || '-'}</span>
          </div>
          <div class="detail-item full-width">
            <span class="detail-label">주소</span>
            <span class="detail-value">${data.address || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">고객명</span>
            <span class="detail-value">${data.customer || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">연락처</span>
            <span class="detail-value">${data.contact || '<span class="empty">정보 없음</span>'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 배차 정보 섹션
  html += `
    <div class="detail-section">
      <div class="section-header">
        <h3 class="section-title">배차 정보</h3>
        <i class="fas fa-chevron-down section-toggle"></i>
      </div>
      <div class="section-content">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">기사명</span>
            <span class="detail-value">${data.driverName || '<span class="empty">배정되지 않음</span>'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">기사 연락처</span>
            <span class="detail-value">${data.driverContact || '<span class="empty">정보 없음</span>'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">출발 시간</span>
            <span class="detail-value">${data.departTime || '<span class="empty">출발 전</span>'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">완료 시간</span>
            <span class="detail-value">${data.completeTime || '<span class="empty">배송 중</span>'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 시스템 정보 섹션
  html += `
    <div class="detail-section">
      <div class="section-header">
        <h3 class="section-title">시스템 정보</h3>
        <i class="fas fa-chevron-down section-toggle"></i>
      </div>
      <div class="section-content">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">생성 시간</span>
            <span class="detail-value">${data.createTime || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">마지막 수정</span>
            <span class="detail-value">${data.updateAt || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">마지막 수정자</span>
            <span class="detail-value">${data.updatedBy || '-'}</span>
          </div>
          <div class="detail-item full-width">
            <span class="detail-label">비고</span>
            <span class="detail-value">${data.remark || '<span class="empty">정보 없음</span>'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  html += '</div>';
  
  // 컨테이너에 HTML 설정
  container.innerHTML = html;
  
  // 아코디언 초기화
  initializeAccordions(container);
}

/**
 * 주문 편집 폼 향상된 렌더링
 * @param {HTMLElement} container - 내용을 표시할 컨테이너
 * @param {Object} data - 주문 상세 데이터
 */
function renderOrderEditFormEnhanced(container, data) {
  // 컨테이너에 ID 속성 추가
  container.setAttribute('data-id', data.dashboardId);
  
  // 폼 HTML 생성
  let html = `
    <form id="editOrderForm" class="order-form">
      <input type="hidden" id="editDashboardId" name="dashboardId" value="${data.dashboardId}">
      
      <div class="alert alert-info">
        <div class="alert-icon">
          <i class="fas fa-info-circle"></i>
        </div>
        <div class="alert-content">
          <div class="alert-title">편집 모드</div>
          <div class="alert-message">현재 주문 정보를 편집하고 있습니다. 변경 사항을 저장하려면 하단의 저장 버튼을 클릭하세요.</div>
        </div>
      </div>
      
      <div class="form-section">
        <h3 class="section-title">기본 정보</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="editOrderNo">주문번호 <span class="required-mark">*</span></label>
            <input type="text" id="editOrderNo" name="orderNo" value="${data.orderNo || ''}" required>
          </div>
          <div class="form-group">
            <label for="editType">유형 <span class="required-mark">*</span></label>
            <select id="editType" name="type" required>
              <option value="">선택하세요</option>
              <option value="DELIVERY" ${data.type === 'DELIVERY' ? 'selected' : ''}>배송</option>
              <option value="RETURN" ${data.type === 'RETURN' ? 'selected' : ''}>회수</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="editDepartment">부서 <span class="required-mark">*</span></label>
            <select id="editDepartment" name="department" required>
              <option value="">선택하세요</option>
              <option value="CS" ${data.department === 'CS' ? 'selected' : ''}>CS</option>
              <option value="HES" ${data.department === 'HES' ? 'selected' : ''}>HES</option>
              <option value="LENOVO" ${data.department === 'LENOVO' ? 'selected' : ''}>LENOVO</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editWarehouse">창고 <span class="required-mark">*</span></label>
            <select id="editWarehouse" name="warehouse" required>
              <option value="">선택하세요</option>
              <option value="SEOUL" ${data.warehouse === 'SEOUL' ? 'selected' : ''}>서울</option>
              <option value="BUSAN" ${data.warehouse === 'BUSAN' ? 'selected' : ''}>부산</option>
              <option value="GWANGJU" ${data.warehouse === 'GWANGJU' ? 'selected' : ''}>광주</option>
              <option value="DAEJEON" ${data.warehouse === 'DAEJEON' ? 'selected' : ''}>대전</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="editSLA">SLA <span class="required-mark">*</span></label>
            <input type="text" id="editSLA" name="sla" value="${data.sla || ''}" required>
          </div>
          <div class="form-group">
            <label for="editStatus">상태 <span class="required-mark">*</span></label>
            <select id="editStatus" name="status" required>
              <option value="">선택하세요</option>
              <option value="WAITING" ${data.status === 'WAITING' ? 'selected' : ''}>대기</option>
              <option value="IN_PROGRESS" ${data.status === 'IN_PROGRESS' ? 'selected' : ''}>진행</option>
              <option value="COMPLETE" ${data.status === 'COMPLETE' ? 'selected' : ''}>완료</option>
              <option value="ISSUE" ${data.status === 'ISSUE' ? 'selected' : ''}>이슈</option>
              <option value="CANCEL" ${data.status === 'CANCEL' ? 'selected' : ''}>취소</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3 class="section-title">배송 정보</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="editETA">ETA <span class="required-mark">*</span></label>
            <input type="datetime-local" id="editETA" name="eta" value="${formatDateTimeForInput(data.eta)}" required>
          </div>
          <div class="form-group">
            <label for="editPostalCode">우편번호 <span class="required-mark">*</span></label>
            <input type="text" id="editPostalCode" name="postalCode" value="${data.postalCode || ''}" required maxlength="5" pattern="[0-9]*">
            <span class="form-hint">숫자 5자리 (4자리 입력 시 자동으로 5자리로 변환됩니다)</span>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group full-width">
            <label for="editAddress">주소 <span class="required-mark">*</span></label>
            <input type="text" id="editAddress" name="address" value="${data.address || ''}" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="editCustomer">고객명 <span class="required-mark">*</span></label>
            <input type="text" id="editCustomer" name="customer" value="${data.customer || ''}" required>
          </div>
          <div class="form-group">
            <label for="editContact">연락처 <span class="required-mark">*</span></label>
            <input type="text" id="editContact" name="contact" value="${data.contact || ''}" required pattern="010-[0-9]{4}-[0-9]{4}">
            <span class="form-hint">형식: 010-XXXX-XXXX</span>
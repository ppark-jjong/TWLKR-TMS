/**
 * 인수인계 페이지 JavaScript - 개선된 UI/UX
 */

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function () {
  setupHandoverForm();
  setupPanelToggles();
  setupSearchFunctionality();
});

/**
 * 인수인계 폼 설정
 */
function setupHandoverForm() {
  const handoverForm = document.getElementById('handoverForm');
  if (!handoverForm) return;

  handoverForm.addEventListener('submit', function (e) {
    e.preventDefault();
    submitHandoverForm();
  });
}

/**
 * 패널 토글 설정
 */
function setupPanelToggles() {
  const toggleButtons = document.querySelectorAll('.panel-toggle');
  
  toggleButtons.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const targetSelector = this.getAttribute('onclick').match(/'([^']+)'/)[1];
      const targetPanel = document.querySelector('.' + targetSelector);
      
      if (targetPanel) {
        const isVisible = targetPanel.style.display !== 'none';
        
        targetPanel.style.display = isVisible ? 'none' : 'block';
        
        // 아이콘 방향 변경
        const icon = this.querySelector('i');
        icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
      }
    });
  });
}

/**
 * 검색 기능 설정
 */
function setupSearchFunctionality() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  // Enter 키 누를 때 검색 수행
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      searchHandovers();
    }
  });
}

/**
 * 검색 실행
 */
function searchHandovers() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  const searchTerm = searchInput.value.trim();
  if (searchTerm === '') return;
  
  // URL 생성 및 이동
  const url = new URL(window.location.href);
  url.searchParams.set('search', searchTerm);
  url.searchParams.set('page', '1'); // 검색 시 첫 페이지로 이동
  
  window.location.href = url.toString();
}

/**
 * 인수인계 작성 모달 열기
 */
function openCreateModal() {
  const modal = document.getElementById('handoverCreateModal');
  if (!modal) return;

  // 모달 타이틀 변경
  const modalTitle = document.getElementById('modalTitle');
  if (modalTitle) {
    modalTitle.innerHTML = '<i class="fas fa-pen"></i> 인수인계 작성';
  }

  // 폼 초기화
  const form = document.getElementById('handoverForm');
  if (form) {
    form.reset();
    document.getElementById('handoverId').value = '';

    // 공지사항 체크박스 초기화
    const noticeCheckbox = document.getElementById('isNotice');
    if (noticeCheckbox) {
      noticeCheckbox.checked = false;
    }
  }

  // 저장 버튼 텍스트 변경
  const saveBtn = document.getElementById('saveHandoverBtn');
  if (saveBtn) {
    saveBtn.textContent = '저장';
  }

  // 모달 표시
  modal.style.display = 'block';
}

/**
 * 인수인계 상세 보기
 * @param {string} id - 인수인계 ID
 */
function viewHandover(id) {
  const modal = document.getElementById('handoverDetailModal');
  const content = document.getElementById('handoverDetailContent');
  const loader = document.querySelector('.modal-loader');
  const actionContainer = document.getElementById('detailModalActions');
  
  if (!modal || !content) return;
  
  // 모달 초기화 및 표시
  content.innerHTML = '';
  modal.style.display = 'block';
  
  // 로더 표시
  if (loader) {
    loader.style.display = 'flex';
  }
  
  // 액션 버튼 초기화
  if (actionContainer) {
    actionContainer.innerHTML = '';
  }

  // API 요청
  apiRequest(`/handover/${id}`)
    .then((result) => {
      if (loader) {
        loader.style.display = 'none';
      }
      
      if (result.success) {
        displayHandoverDetail(result.data);
        
        // 권한에 따른 액션 버튼 추가
        if (actionContainer) {
          const isOwner = result.data.writer_id === currentUserId;
          const isAdmin = currentUserRole === 'ADMIN';
          
          if (isOwner || isAdmin) {
            actionContainer.innerHTML += `<button class="btn btn-primary" onclick="editHandover('${id}')">수정</button>`;
          }
          
          if (isAdmin) {
            actionContainer.innerHTML += `<button class="btn btn-danger" onclick="deleteHandover('${id}')">삭제</button>`;
          }
        }
      } else {
        content.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${result.message || '인수인계 정보를 불러올 수 없습니다.'}</div>`;
      }
    })
    .catch((error) => {
      if (loader) {
        loader.style.display = 'none';
      }
      
      content.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> 인수인계 정보를 불러오는 중 오류가 발생했습니다.</div>`;
      console.error('인수인계 상세 정보 조회 오류:', error);
    });
}

/**
 * 인수인계 수정 모달 열기
 * @param {string} id - 인수인계 ID
 */
function editHandover(id) {
  // 상세 모달 닫기
  const detailModal = document.getElementById('handoverDetailModal');
  if (detailModal) {
    detailModal.style.display = 'none';
  }
  
  // 로딩 표시
  Modal.showLoading();
  
  apiRequest(`/handover/${id}`)
    .then((result) => {
      Modal.hideLoading();
      
      if (result.success) {
        openEditModal(result.data);
      } else {
        Modal.showAlert(result.message || '인수인계 정보를 불러올 수 없습니다.', 'error');
      }
    })
    .catch((error) => {
      Modal.hideLoading();
      Modal.showAlert('인수인계 정보를 불러오는 중 오류가 발생했습니다.', 'error');
      console.error('인수인계 정보 조회 오류:', error);
    });
}

/**
 * 수정 모달 열기
 * @param {Object} data - 인수인계 데이터
 */
function openEditModal(data) {
  const modal = document.getElementById('handoverCreateModal');
  if (!modal) return;
  
  // 모달 타이틀 변경
  const modalTitle = document.getElementById('modalTitle');
  if (modalTitle) {
    modalTitle.innerHTML = '<i class="fas fa-edit"></i> 인수인계 수정';
  }

  // 폼에 데이터 채우기
  const form = document.getElementById('handoverForm');
  if (form) {
    document.getElementById('handoverId').value = data.id;
    document.getElementById('title').value = data.title;
    document.getElementById('content').value = data.content;

    // 공지사항 체크박스 설정
    const noticeCheckbox = document.getElementById('isNotice');
    if (noticeCheckbox) {
      noticeCheckbox.checked = data.is_notice || false;
    }
  }
  
  // 저장 버튼 텍스트 변경
  const saveBtn = document.getElementById('saveHandoverBtn');
  if (saveBtn) {
    saveBtn.textContent = '수정';
  }

  // 모달 표시
  modal.style.display = 'block';

  // 락 설정 요청
  requestLock(data.id, 'edit');
}

/**
 * 인수인계 삭제 확인 모달 표시
 * @param {string} id - 인수인계 ID
 */
function deleteHandover(id) {
  // 상세 모달 닫기
  const detailModal = document.getElementById('handoverDetailModal');
  if (detailModal) {
    detailModal.style.display = 'none';
  }
  
  const modal = document.getElementById('deleteConfirmModal');
  if (!modal) return;

  // 삭제할 ID 설정
  document.getElementById('deleteHandoverId').value = id;

  // 모달 표시
  modal.style.display = 'block';
}

/**
 * 삭제 확인
 */
function confirmDelete() {
  const id = document.getElementById('deleteHandoverId').value;
  if (!id) {
    closeModal();
    return;
  }
  
  // 삭제 버튼 비활성화 및 로딩 표시
  const deleteBtn = document.querySelector('#deleteConfirmModal .btn-danger');
  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 삭제 중...';
  }

  // 삭제 API 호출
  apiRequest(`/handover/${id}`, 'DELETE')
    .then((result) => {
      if (result.success) {
        Modal.showAlert('인수인계가 성공적으로 삭제되었습니다.', 'success');
        closeModal();
        // 페이지 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        Modal.showAlert(result.message || '삭제 중 오류가 발생했습니다.', 'error');
        
        // 버튼 상태 복원
        if (deleteBtn) {
          deleteBtn.disabled = false;
          deleteBtn.textContent = '삭제';
        }
      }
    })
    .catch((error) => {
      Modal.showAlert('삭제 중 오류가 발생했습니다.', 'error');
      console.error('삭제 오류:', error);
      
      // 버튼 상태 복원
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = '삭제';
      }
    });
}

/**
 * 인수인계 상세 정보 표시
 * @param {Object} handover - 인수인계 데이터
 */
function displayHandoverDetail(handover) {
  const content = document.getElementById('handoverDetailContent');
  if (!content) return;

  // 날짜 포맷팅 함수
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 상세 정보 HTML 생성
  content.innerHTML = `
    <div class="handover-detail">
      <div class="handover-detail-header">
        <h3 class="handover-title">
          ${handover.title}
          ${handover.is_notice ? '<span class="notice-badge"><i class="fas fa-bullhorn"></i> 공지사항</span>' : ''}
        </h3>
        <div class="handover-meta">
          <div class="meta-item">
            <i class="fas fa-user"></i>
            <span>${handover.writer || '-'}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-calendar-alt"></i>
            <span>작성: ${formatDate(handover.created_at)}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-clock"></i>
            <span>수정: ${formatDate(handover.updated_at)}</span>
          </div>
        </div>
      </div>
      <div class="handover-content">
        ${formatContent(handover.content)}
      </div>
    </div>
  `;
}

/**
 * 내용 형식화 (줄바꿈 유지)
 * @param {string} content - 원본 내용
 * @returns {string} 형식화된 내용
 */
function formatContent(content) {
  if (!content) return '';
  
  // XSS 방지를 위한 이스케이프 처리
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 줄바꿈 유지
  return escaped
    .replace(/\n/g, '<br>')
    .replace(/\s{2,}/g, match => '&nbsp;'.repeat(match.length));
}

/**
 * 인수인계 저장
 */
function submitHandoverForm() {
  const form = document.getElementById('handoverForm');
  if (!form) return;
  
  // 폼 유효성 검사
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  // 저장 버튼 비활성화 및 로딩 표시
  const saveBtn = document.getElementById('saveHandoverBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
  }
  
  const formData = formToJson(form);
  const isUpdate = !!formData.id;
  const url = isUpdate ? `/handover/${formData.id}` : '/handover';
  const method = isUpdate ? 'PUT' : 'POST';

  apiRequest(url, method, formData)
    .then((result) => {
      if (result.success) {
        Modal.showAlert(
          isUpdate ? '인수인계가 성공적으로 수정되었습니다.' : '인수인계가 성공적으로 등록되었습니다.',
          'success'
        );
        
        closeModal();
        
        // 락 해제 요청
        if (isUpdate) {
          releaseLock(formData.id);
        }
        
        // 페이지 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        Modal.showAlert(result.message || '처리 중 오류가 발생했습니다.', 'error');
        
        // 버튼 상태 복원
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = isUpdate ? '수정' : '저장';
        }
      }
    })
    .catch((error) => {
      Modal.showAlert('처리 중 오류가 발생했습니다.', 'error');
      console.error('인수인계 저장 오류:', error);
      
      // 버튼 상태 복원
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = isUpdate ? '수정' : '저장';
      }
    });
}

/**
 * 락 설정 요청
 * @param {string} id - 인수인계 ID
 * @param {string} action - 액션 타입 ('create' 또는 'edit')
 */
function requestLock(id, action) {
  // 새 항목 작성인 경우 락이 필요 없음
  if (action === 'create' && !id) return;

  apiRequest(`/handover/${id}/lock`, 'POST')
    .then((result) => {
      if (!result.success) {
        // 락 획득 실패 시 메시지 표시
        showLockMessage(result.data?.locked_by, result.data?.expires_at);

        // 수정 모드인 경우 모든 입력 필드 비활성화
        if (action === 'edit') {
          disableForm();
        }
      }
    })
    .catch((error) => {
      console.error('락 설정 오류:', error);
    });
}

/**
 * 락 해제 요청
 * @param {string} id - 인수인계 ID
 */
function releaseLock(id) {
  apiRequest(`/handover/${id}/unlock`, 'POST').catch((error) => {
    console.error('락 해제 오류:', error);
  });
}

/**
 * 락 메시지 표시
 * @param {string} lockedBy - 락 소유자
 * @param {string} expiresAt - 락 만료 시간 (ISO 형식)
 */
function showLockMessage(lockedBy, expiresAt) {
  const form = document.getElementById('handoverForm');
  if (!form) return;

  // 기존 메시지 제거
  const existingMessage = document.querySelector('.lock-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  // 만료 시간 계산
  let expireText = '';
  if (expiresAt) {
    const expireDate = new Date(expiresAt);
    const now = new Date();
    const diffMinutes = Math.round((expireDate - now) / 60000);

    if (diffMinutes > 0) {
      expireText = `약 ${diffMinutes}분 후 편집 가능합니다.`;
    }
  }

  // 새 메시지 추가
  const lockMessage = document.createElement('div');
  lockMessage.className = 'lock-message';
  lockMessage.innerHTML = `
    <i class="fas fa-lock"></i>
    <span>현재 ${lockedBy || '다른 사용자'}가 편집 중입니다. ${expireText}</span>
  `;

  form.parentNode.insertBefore(lockMessage, form);
}

/**
 * 폼 비활성화
 */
function disableForm() {
  const form = document.getElementById('handoverForm');
  if (!form) return;

  // 모든 입력 필드 비활성화
  form
    .querySelectorAll('input, textarea, select')
    .forEach((el) => {
      el.disabled = true;
    });
  
  // 저장 버튼 비활성화
  const saveBtn = document.getElementById('saveHandoverBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '편집 불가';
  }
}

/**
 * 모달 닫기
 */
function closeModal() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach((modal) => {
    modal.style.display = 'none';
  });
}

/**
 * 폼 데이터를 JSON 객체로 변환
 * @param {HTMLFormElement} form - 폼 요소
 * @returns {Object} JSON 객체
 */
function formToJson(form) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    // 체크박스 처리
    if (key === 'is_notice') {
      data[key] = true;
    } else {
      data[key] = value;
    }
  }

  // 체크박스가 체크되지 않은 경우
  if (!formData.has('is_notice')) {
    data['is_notice'] = false;
  }

  return data;
}

/**
 * API 요청 함수 (GET, POST, PUT, DELETE)
 * @param {string} url - API URL
 * @param {string} method - HTTP 메서드
 * @param {Object} data - 요청 데이터
 * @returns {Promise<Object>} 응답 데이터
 */
async function apiRequest(url, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API 요청 오류:', error);
    throw error;
  }
}

/**
 * 모달 관련 유틸리티 함수
 */
const Modal = {
  /**
   * 로딩 표시
   */
  showLoading: function() {
    const body = document.body;
    
    // 기존 로딩 제거
    this.hideLoading();
    
    // 새 로딩 표시
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'global-loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner"></div>';
    
    // 스타일 추가
    loadingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    `;
    
    body.appendChild(loadingOverlay);
  },
  
  /**
   * 로딩 숨기기
   */
  hideLoading: function() {
    const existingOverlay = document.querySelector('.global-loading-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
  },
  
  /**
   * 알림 표시
   * @param {string} message - 메시지
   * @param {string} type - 알림 유형 ('success', 'error', 'warning', 'info')
   */
  showAlert: function(message, type = 'info') {
    // 기존 알림 제거
    const existingAlert = document.querySelector('.alert-toast');
    if (existingAlert) {
      existingAlert.remove();
    }
    
    // 알림 색상 설정
    const colors = {
      success: '#52c41a',
      error: '#f5222d',
      warning: '#faad14',
      info: '#1890ff'
    };
    
    // 알림 아이콘 설정
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-times-circle',
      warning: 'fas fa-exclamation-circle',
      info: 'fas fa-info-circle'
    };
    
    // 알림 생성
    const alert = document.createElement('div');
    alert.className = 'alert-toast';
    alert.innerHTML = `
      <div class="alert-icon">
        <i class="${icons[type] || icons.info}"></i>
      </div>
      <div class="alert-message">${message}</div>
      <div class="alert-close">
        <i class="fas fa-times"></i>
      </div>
    `;
    
    // 스타일 적용
    alert.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      background: white;
      color: #333;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      padding: 12px 16px;
      z-index: 2000;
      border-left: 4px solid ${colors[type] || colors.info};
      animation: alertSlideIn 0.3s;
    `;
    
    // 아이콘 스타일
    const iconEl = alert.querySelector('.alert-icon');
    if (iconEl) {
      iconEl.style.cssText = `
        color: ${colors[type] || colors.info};
        margin-right: 12px;
        font-size: 20px;
      `;
    }
    
    // 메시지 스타일
    const messageEl = alert.querySelector('.alert-message');
    if (messageEl) {
      messageEl.style.cssText = `
        flex: 1;
      `;
    }
    
    // 닫기 버튼 스타일
    const closeEl = alert.querySelector('.alert-close');
    if (closeEl) {
      closeEl.style.cssText = `
        margin-left: 12px;
        cursor: pointer;
        color: #999;
      `;
      
      // 닫기 이벤트 추가
      closeEl.addEventListener('click', function() {
        alert.remove();
      });
    }
    
    // 애니메이션 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
      @keyframes alertSlideIn {
        from {
          opacity: 0;
          transform: translateX(30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;
    document.head.appendChild(style);
    
    // 문서에 알림 추가
    document.body.appendChild(alert);
    
    // 자동 닫기 (5초 후)
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000);
  }
};

// 패널 토글 함수 (HTML에서 직접 호출)
function togglePanel(element, targetClass) {
  const target = document.querySelector('.' + targetClass);
  if (!target) return;
  
  const isVisible = window.getComputedStyle(target).display !== 'none';
  target.style.display = isVisible ? 'none' : 'block';
  
  const icon = element.querySelector('i');
  if (icon) {
    icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
  }
}

// 현재 사용자 정보 (서버에서 주입)
const currentUserId = document.querySelector('meta[name="user-id"]')?.content || '';
const currentUserRole = document.querySelector('meta[name="user-role"]')?.content || '';
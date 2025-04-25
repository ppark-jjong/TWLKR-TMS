/**
 * 인수인계 페이지 관리 모듈
 * 인수인계 목록, 상세, 생성, 수정, 삭제 기능을 제공합니다.
 */
window.Handover = (function() {
  /**
   * 현재 데이터 상태
   */
  const state = {
    currentHandover: null,
    isEditing: false
  };
  
  /**
   * 초기화 함수
   */
  function init() {
    // 인증 확인
    if (window.Auth) {
      Auth.checkLoginStatus().catch(error => {
        console.error('인증 확인 오류:', error);
      });
    }
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    console.log('인수인계 페이지 초기화 완료');
  }
  
  /**
   * 이벤트 리스너를 설정합니다.
   */
  function setupEventListeners() {
    // 패널 토글 이벤트 (모든 패널에 적용)
    document.querySelectorAll('.panel-toggle').forEach(toggle => {
      toggle.addEventListener('click', function() {
        const panelContent = this.closest('.panel').querySelector('.panel-content');
        if (panelContent) {
          panelContent.classList.toggle('collapsed');
          
          // 화살표 아이콘 변경
          const icon = this.querySelector('i');
          if (icon) {
            if (panelContent.classList.contains('collapsed')) {
              icon.className = 'fas fa-chevron-down';
            } else {
              icon.className = 'fas fa-chevron-up';
            }
          }
        }
      });
    });
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
    
    // 모달 외부 클릭 시 닫기
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', function(e) {
        if (e.target === this) {
          closeModal();
        }
      });
    });
  }
  
  /**
   * 패널을 토글합니다.
   * @param {Element} toggleElement - 토글 버튼 요소
   * @param {string} contentClass - 패널 내용 클래스명
   */
  function togglePanel(toggleElement, contentClass) {
    const panelContent = document.querySelector('.' + contentClass);
    if (panelContent) {
      panelContent.classList.toggle('collapsed');
      
      // 화살표 아이콘 변경
      const icon = toggleElement.querySelector('i');
      if (icon) {
        if (panelContent.classList.contains('collapsed')) {
          icon.className = 'fas fa-chevron-down';
        } else {
          icon.className = 'fas fa-chevron-up';
        }
      }
    }
  }
  
  /**
   * 인수인계 작성 모달을 엽니다.
   */
  function openCreateModal() {
    // 폼 초기화
    const form = document.getElementById('handoverForm');
    if (form) {
      form.reset();
      document.getElementById('handoverId').value = '';
    }
    
    // 모달 제목 설정
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
      modalTitle.innerHTML = '<i class="fas fa-pen"></i> 인수인계 작성';
    }
    
    state.isEditing = false;
    
    // 모달 표시
    const modal = document.getElementById('handoverCreateModal');
    if (modal) {
      modal.style.display = 'block';
    }
  }
  
  /**
   * 인수인계를 수정합니다.
   * @param {string} id - 인수인계 ID
   */
  async function editHandover(id) {
    try {
      state.isEditing = true;
      
      // 모달 제목 설정
      const modalTitle = document.getElementById('modalTitle');
      if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> 인수인계 수정';
      }
      
      // 로딩 표시
      if (window.Utils) {
        Utils.toggleLoading(true);
      }
      
      // 인수인계 데이터 로드
      const response = await fetch(`/handover/items/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 폼에 데이터 채우기
        const form = document.getElementById('handoverForm');
        if (form) {
          document.getElementById('handoverId').value = data.item.id;
          document.getElementById('title').value = data.item.title;
          document.getElementById('content').value = data.item.content;
          
          // 공지사항 체크박스 (관리자만 해당)
          const isNoticeCheckbox = document.getElementById('isNotice');
          if (isNoticeCheckbox) {
            isNoticeCheckbox.checked = data.item.is_notice;
          }
        }
        
        // 모달 표시
        const modal = document.getElementById('handoverCreateModal');
        if (modal) {
          modal.style.display = 'block';
        }
      } else {
        showAlert(data.message || '인수인계 정보를 불러오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('인수인계 수정 중 오류:', error);
      showAlert('인수인계 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      // 로딩 숨김
      if (window.Utils) {
        Utils.toggleLoading(false);
      }
    }
  }
  
  /**
   * 인수인계 상세 정보를 조회합니다.
   * @param {string} id - 인수인계 ID
   */
  async function viewHandover(id) {
    try {
      // 로딩 표시
      const loader = document.querySelector('.modal-loader');
      if (loader) {
        loader.style.display = 'flex';
      }
      
      // 내용 영역 초기화
      const contentDiv = document.getElementById('handoverDetailContent');
      if (contentDiv) {
        contentDiv.innerHTML = '';
      }
      
      // 액션 버튼 초기화
      const actionsDiv = document.getElementById('detailModalActions');
      if (actionsDiv) {
        actionsDiv.innerHTML = '';
      }
      
      // 모달 표시
      const modal = document.getElementById('handoverDetailModal');
      if (modal) {
        modal.style.display = 'block';
      }
      
      // 인수인계 데이터 로드
      const response = await fetch(`/handover/items/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        state.currentHandover = data.item;
        
        // 상세 정보 표시
        if (contentDiv) {
          const item = data.item;
          
          // 공지사항 태그 표시
          const noticeTag = item.is_notice ? 
            '<span class="notice-tag"><i class="fas fa-bullhorn"></i> 공지사항</span>' : '';
          
          // HTML 이스케이프 및 줄바꿈 처리
          const content = escapeHtml(item.content).replace(/\n/g, '<br>');
          
          contentDiv.innerHTML = `
            <div class="detail-header">
              <h2 class="detail-title">${escapeHtml(item.title)} ${noticeTag}</h2>
              <div class="detail-meta">
                <span class="writer"><i class="fas fa-user"></i> ${escapeHtml(item.writer)}</span>
                <span class="date"><i class="fas fa-clock"></i> ${formatDateTime(item.update_at)}</span>
              </div>
            </div>
            <div class="detail-content">
              ${content}
            </div>
          `;
        }
        
        // 수정/삭제 버튼 (작성자 또는 관리자만 표시)
        if (actionsDiv && (data.item.editable || (window.Auth && Auth.hasRole('ADMIN')))) {
          actionsDiv.innerHTML = `
            <button class="btn btn-primary" onclick="Handover.editHandover('${id}')">수정하기</button>
            <button class="btn btn-danger" onclick="Handover.deleteHandover('${id}')">삭제하기</button>
          `;
        }
      } else {
        showAlert(data.message || '인수인계 정보를 불러오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('인수인계 상세 조회 중 오류:', error);
      showAlert('인수인계 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      // 로딩 숨김
      const loader = document.querySelector('.modal-loader');
      if (loader) {
        loader.style.display = 'none';
      }
    }
  }
  
  /**
   * 인수인계 폼을 제출합니다.
   */
  async function submitHandoverForm() {
    const form = document.getElementById('handoverForm');
    if (!form) return;
    
    // 유효성 검사
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    try {
      // 로딩 표시
      if (window.Utils) {
        Utils.toggleLoading(true);
      }
      
      // 폼 데이터 수집
      const formData = new FormData(form);
      const data = {};
      
      for (const [key, value] of formData.entries()) {
        if (key === 'is_notice') {
          data[key] = value === 'on';
        } else {
          data[key] = value;
        }
      }
      
      // API 호출 URL 및 메서드 설정
      const id = document.getElementById('handoverId').value;
      const isUpdate = id && state.isEditing;
      const url = '/handover/items' + (isUpdate ? `/${id}` : '');
      const method = isUpdate ? 'PUT' : 'POST';
      
      // API 호출
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      const responseData = await response.json();
      
      if (responseData.success) {
        // 모달 닫기
        closeModal();
        
        // 성공 메시지 표시
        const message = isUpdate ? 
          '인수인계가 성공적으로 수정되었습니다.' : 
          '인수인계가 성공적으로 작성되었습니다.';
        
        showAlert(message, 'success');
        
        // 페이지 새로고침 (데이터 갱신)
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        showAlert(responseData.message || '인수인계 저장에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('인수인계 저장 중 오류:', error);
      showAlert('인수인계 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      // 로딩 숨김
      if (window.Utils) {
        Utils.toggleLoading(false);
      }
    }
  }
  
  /**
   * 인수인계 삭제 모달을 엽니다.
   * @param {string} id - 인수인계 ID
   */
  function deleteHandover(id) {
    // 삭제할 ID 설정
    const idField = document.getElementById('deleteHandoverId');
    if (idField) {
      idField.value = id;
    }
    
    // 모달 닫기 (이전 모달이 열려있을 경우)
    closeModal();
    
    // 삭제 확인 모달 표시
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
      modal.style.display = 'block';
    }
  }
  
  /**
   * 인수인계 삭제를 확인합니다.
   */
  async function confirmDelete() {
    const id = document.getElementById('deleteHandoverId').value;
    if (!id) return;
    
    try {
      // 로딩 표시
      if (window.Utils) {
        Utils.toggleLoading(true);
      }
      
      // API 호출
      const response = await fetch(`/handover/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 모달 닫기
        closeModal();
        
        // 성공 메시지 표시
        showAlert('인수인계가 성공적으로 삭제되었습니다.', 'success');
        
        // 페이지 새로고침 (데이터 갱신)
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        showAlert(data.message || '인수인계 삭제에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('인수인계 삭제 중 오류:', error);
      showAlert('인수인계 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      // 로딩 숨김
      if (window.Utils) {
        Utils.toggleLoading(false);
      }
    }
  }
  
  /**
   * 모달을 닫습니다.
   */
  function closeModal() {
    // 모든 모달 숨기기
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
  }
  
  /**
   * 날짜 시간을 포맷팅합니다.
   * @param {string} dateStr - 날짜 문자열
   * @returns {string} - 포맷팅된 날짜 문자열
   */
  function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    
    if (window.Utils && Utils.formatDate) {
      return Utils.formatDate(dateStr, 'YYYY-MM-DD HH:mm');
    } else {
      try {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      } catch (error) {
        return dateStr;
      }
    }
  }
  
  /**
   * HTML 특수 문자를 이스케이프합니다.
   * @param {string} html - 이스케이프할 HTML 문자열
   * @returns {string} - 이스케이프된 문자열
   */
  function escapeHtml(html) {
    if (!html) return '';
    
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }
  
  /**
   * 알림 메시지를 표시합니다.
   * @param {string} message - 표시할 메시지
   * @param {string} type - 알림 유형 (success, error, warning, info)
   */
  function showAlert(message, type = 'info') {
    if (window.Alerts) {
      Alerts.show(message, type);
    } else if (window.Utils && Utils.showAlert) {
      Utils.showAlert(message, type);
    } else {
      alert(message);
    }
  }
  
  // 페이지 로드 시 초기화
  document.addEventListener('DOMContentLoaded', init);
  
  // 전역 함수 노출
  window.openCreateModal = openCreateModal;
  window.editHandover = editHandover;
  window.viewHandover = viewHandover;
  window.deleteHandover = deleteHandover;
  window.confirmDelete = confirmDelete;
  window.closeModal = closeModal;
  window.togglePanel = togglePanel;
  
  // 공개 API
  return {
    init,
    openCreateModal,
    editHandover,
    viewHandover,
    deleteHandover,
    confirmDelete
  };
})();

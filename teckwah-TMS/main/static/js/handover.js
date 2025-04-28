/**
 * 인수인계 페이지 스크립트
 * 인수인계 목록 조회, 등록, 수정 등을 담당합니다.
 */

// 인수인계 네임스페이스
const Handover = {
  /**
   * 설정
   */
  config: {
    handoverTableId: 'handoverTable',
    handoverModalId: 'handoverModal',
    handoverDetailModalId: 'handoverDetailModal'
  },
  
  /**
   * 상태 변수
   */
  state: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    currentHandoverId: null,
    hasLock: false
  },
  
  /**
   * 초기화
   */
  init: function() {
    console.log('[Handover] 초기화 시작');
    
    // 테이블 초기화
    this.initTable();
    
    // 버튼 이벤트 연결
    this.initButtons();
    
    // 모달 초기화
    this.initModals();
    
    // 초기 데이터 로드
    this.loadHandovers();
    
    console.log('[Handover] 초기화 완료');
  },
  
  /**
   * 테이블 초기화
   */
  initTable: function() {
    const handoverTable = document.getElementById(this.config.handoverTableId);
    
    if (handoverTable) {
      // 행 클릭 이벤트
      handoverTable.querySelector('tbody').addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row || row.classList.contains('no-data-row')) return;
        
        const handoverId = row.getAttribute('data-id');
        if (handoverId) {
          this.openHandoverDetail(handoverId);
        }
      });
    }
  },
  
  /**
   * 버튼 이벤트 초기화
   */
  initButtons: function() {
    // 새로고침 버튼
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadHandovers();
      });
    }
    
    // 새 인수인계 버튼
    const createHandoverBtn = document.getElementById('createHandoverBtn');
    if (createHandoverBtn) {
      createHandoverBtn.addEventListener('click', () => {
        this.openCreateHandoverModal();
      });
    }
  },
  
  /**
   * 모달 초기화
   */
  initModals: function() {
    // 인수인계 상세 모달 초기화
    const handoverDetailModal = document.getElementById(this.config.handoverDetailModalId);
    if (handoverDetailModal) {
      // 모달 내 닫기 버튼
      const closeBtn = handoverDetailModal.querySelector('.modal-close, .close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          TMS.modal.close(this.config.handoverDetailModalId);
        });
      }
      
      // 수정 버튼
      const editBtn = handoverDetailModal.querySelector('.edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          this.enableHandoverEdit();
        });
      }
      
      // 저장 버튼
      const saveBtn = handoverDetailModal.querySelector('.save-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          this.saveHandoverChanges();
        });
      }
      
      // 취소 버튼
      const cancelBtn = handoverDetailModal.querySelector('.cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          this.disableHandoverEdit();
          // 현재 데이터 다시 로드
          this.loadHandoverDetail(this.state.currentHandoverId);
        });
      }
    }
    
    // 인수인계 생성 모달 초기화
    const handoverModal = document.getElementById(this.config.handoverModalId);
    if (handoverModal) {
      // 모달 내 닫기 버튼
      const closeBtn = handoverModal.querySelector('.modal-close, .close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          TMS.modal.close(this.config.handoverModalId);
        });
      }
      
      // 인수인계 생성 폼 제출
      const createHandoverForm = handoverModal.querySelector('form');
      if (createHandoverForm) {
        createHandoverForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.createHandover(new FormData(createHandoverForm));
        });
      }
    }
  },
  
  /**
   * 인수인계 목록 로드
   */
  loadHandovers: function() {
    // 로딩 표시
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    // API 호출
    TMS.api.get('/api/v1/handovers')
      .then(response => {
        if (response && response.success) {
          // 인수인계 데이터 저장
          this.handovers = response.data.handovers || [];
          this.state.totalItems = this.handovers.length;
          
          // 테이블 업데이트
          this.updateHandoverTable();
          
          // 성공 알림
          TMS.notify('success', '인수인계 목록을 성공적으로 불러왔습니다.');
        } else {
          TMS.notify('error', '인수인계 목록을 불러오는데 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('인수인계 목록 로드 오류:', error);
        TMS.notify('error', '인수인계 목록을 불러오는데 실패했습니다.');
      })
      .finally(() => {
        // 로딩 숨김
        if (loadingOverlay) loadingOverlay.style.display = 'none';
      });
  },
  
  /**
   * 인수인계 테이블 업데이트
   */
  updateHandoverTable: function() {
    const table = document.getElementById(this.config.handoverTableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    // 테이블 내용 초기화
    tbody.innerHTML = '';
    
    // 데이터가 없는 경우
    if (!this.handovers || this.handovers.length === 0) {
      const noDataRow = document.createElement('tr');
      noDataRow.className = 'no-data-row';
      noDataRow.innerHTML = `
        <td colspan="5" class="no-data-cell">데이터가 없습니다</td>
      `;
      tbody.appendChild(noDataRow);
      return;
    }
    
    // 페이지네이션
    const start = (this.state.currentPage - 1) * this.state.pageSize;
    const end = start + this.state.pageSize;
    const pageHandovers = this.handovers.slice(start, end);
    
    // 인수인계 목록 표시
    pageHandovers.forEach(handover => {
      const row = document.createElement('tr');
      row.className = 'clickable-row';
      row.setAttribute('data-id', handover.id);
      
      row.innerHTML = `
        <td class="column-title">${handover.title}</td>
        <td class="column-author">${handover.author}</td>
        <td class="column-date">${handover.createdAt}</td>
        <td class="column-department">${handover.department}</td>
        <td class="column-actions">
          <button type="button" class="action-btn view-btn">
            <i class="fas fa-eye"></i> 보기
          </button>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  },
  
  /**
   * 인수인계 상세 정보 모달 열기
   * @param {string} handoverId - 인수인계 ID
   */
  openHandoverDetail: function(handoverId) {
    this.state.currentHandoverId = handoverId;
    
    // 인수인계 상세 정보 로드
    this.loadHandoverDetail(handoverId);
    
    // 모달 열기
    TMS.modal.open(this.config.handoverDetailModalId);
  },
  
  /**
   * 인수인계 상세 정보 로드
   * @param {string} handoverId - 인수인계 ID
   */
  loadHandoverDetail: function(handoverId) {
    // 로딩 표시
    const modalContent = document.querySelector(`#${this.config.handoverDetailModalId} .modal-content`);
    if (modalContent) {
      modalContent.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <div class="spinner-text">인수인계 정보를 불러오는 중...</div>
        </div>
      `;
    }
    
    // API 호출
    TMS.api.get(`/api/v1/handovers/${handoverId}`)
      .then(response => {
        if (response && response.success) {
          // 인수인계 상세 정보 표시
          this.displayHandoverDetail(response.data);
          
          // 락 상태 확인
          this.state.hasLock = response.data.hasLock || false;
        } else {
          // 오류 표시
          if (modalContent) {
            modalContent.innerHTML = `
              <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h3>인수인계 정보를 불러올 수 없습니다</h3>
                <p>${response.message || '서버에서 오류가 발생했습니다.'}</p>
                <div class="error-actions">
                  <button class="btn primary-btn" onclick="TMS.modal.close('${this.config.handoverDetailModalId}')">
                    닫기
                  </button>
                </div>
              </div>
            `;
          }
        }
      })
      .catch(error => {
        console.error('인수인계 상세 로드 오류:', error);
        
        // 오류 표시
        if (modalContent) {
          modalContent.innerHTML = `
            <div class="error-message">
              <i class="fas fa-exclamation-circle"></i>
              <h3>인수인계 정보를 불러올 수 없습니다</h3>
              <p>${error.message || '서버 연결에 실패했습니다.'}</p>
              <div class="error-actions">
                <button class="btn primary-btn" onclick="TMS.modal.close('${this.config.handoverDetailModalId}')">
                  닫기
                </button>
              </div>
            </div>
          `;
        }
      });
  },
  
  /**
   * 인수인계 상세 정보 표시
   * @param {Object} data - 인수인계 상세 정보
   */
  displayHandoverDetail: function(data) {
    const modal = document.getElementById(this.config.handoverDetailModalId);
    if (!modal) return;
    
    // 모달 콘텐츠 생성
    const content = `
      <div class="modal-header">
        <h2 class="modal-title">인수인계 상세 정보</h2>
        <span class="modal-close">&times;</span>
      </div>
      
      <div class="modal-body">
        ${data.hasLock ? 
          `<div class="lock-info">
            <i class="fas fa-lock"></i>
            <span>현재 이 인수인계를 편집 중입니다.</span>
          </div>` : 
          data.lockedBy ? 
          `<div class="lock-info">
            <i class="fas fa-user-lock"></i>
            <span>${data.lockedBy}님이 이 인수인계를 편집 중입니다.</span>
          </div>` : ''
        }
        
        <div class="form-section">
          <div class="form-row">
            <div class="form-group full-width">
              <label>제목</label>
              <input type="text" name="title" value="${data.title || ''}" disabled>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>부서</label>
              <select name="department" disabled>
                <option value="LOGISTICS" ${data.department === 'LOGISTICS' ? 'selected' : ''}>물류팀</option>
                <option value="SALES" ${data.department === 'SALES' ? 'selected' : ''}>영업팀</option>
                <option value="ADMIN" ${data.department === 'ADMIN' ? 'selected' : ''}>관리팀</option>
              </select>
            </div>
            <div class="form-group">
              <label>작성자</label>
              <input type="text" value="${data.author || ''}" readonly>
            </div>
            <div class="form-group">
              <label>작성일</label>
              <input type="text" value="${data.createdAt || ''}" readonly>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <div class="form-row">
            <div class="form-group full-width">
              <label>내용</label>
              <textarea name="content" rows="8" disabled>${data.content || ''}</textarea>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <div class="form-row">
            <div class="form-group">
              <label>마지막 수정자</label>
              <input type="text" value="${data.updatedBy || '-'}" readonly>
            </div>
            <div class="form-group">
              <label>수정 시간</label>
              <input type="text" value="${data.updatedAt || '-'}" readonly>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <div class="modal-footer-left">
          ${data.isAdmin || data.isAuthor ? 
            `<button type="button" class="btn delete-btn">삭제</button>` : 
            ''
          }
        </div>
        <div class="modal-footer-right">
          <button type="button" class="btn secondary-btn" data-dismiss="modal">닫기</button>
          ${data.isAdmin || data.isAuthor ? 
            (!data.lockedBy || data.hasLock ? 
              `<button type="button" class="btn edit-btn primary-btn">수정</button>
               <button type="button" class="btn save-btn primary-btn" style="display: none;">저장</button>
               <button type="button" class="btn cancel-btn" style="display: none;">취소</button>` : 
              ''
            ) : ''
          }
        </div>
      </div>
    `;
    
    // 모달 내용 업데이트
    modal.innerHTML = content;
    
    // 버튼 이벤트 다시 연결
    this.initModals();
  },
  
  /**
   * 인수인계 편집 활성화
   */
  enableHandoverEdit: function() {
    const modal = document.getElementById(this.config.handoverDetailModalId);
    if (!modal) return;
    
    // 수정 가능한 필드 활성화
    const editableInputs = modal.querySelectorAll('input:not([readonly]), select:not([readonly]), textarea');
    editableInputs.forEach(input => {
      input.disabled = false;
      input.classList.add('editing');
    });
    
    // 버튼 표시 변경
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
   * 인수인계 편집 비활성화
   */
  disableHandoverEdit: function() {
    const modal = document.getElementById(this.config.handoverDetailModalId);
    if (!modal) return;
    
    // 필드 비활성화
    const editableInputs = modal.querySelectorAll('input.editing, select.editing, textarea.editing');
    editableInputs.forEach(input => {
      input.disabled = true;
      input.classList.remove('editing');
    });
    
    // 버튼 표시 변경
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
    if (!this.state.currentHandoverId) return;
    
    TMS.api.post(`/api/v1/handovers/${this.state.currentHandoverId}/lock`)
      .then(response => {
        if (response && response.success) {
          this.state.hasLock = true;
          console.log('락 획득 성공');
        } else {
          this.disableHandoverEdit();
          TMS.notify('error', '편집 락을 획득할 수 없습니다. 다른 사용자가 이미 편집 중일 수 있습니다.');
        }
      })
      .catch(error => {
        console.error('락 획득 오류:', error);
        this.disableHandoverEdit();
        TMS.notify('error', '편집 락을 획득할 수 없습니다.');
      });
  },
  
  /**
   * 락 해제
   */
  releaseLock: function() {
    if (!this.state.currentHandoverId || !this.state.hasLock) return;
    
    TMS.api.delete(`/api/v1/handovers/${this.state.currentHandoverId}/lock`)
      .then(response => {
        if (response && response.success) {
          this.state.hasLock = false;
          console.log('락 해제 성공');
        }
      })
      .catch(error => {
        console.error('락 해제 오류:', error);
      });
  },
  
  /**
   * 인수인계 변경사항 저장
   */
  saveHandoverChanges: function() {
    if (!this.state.currentHandoverId || !this.state.hasLock) {
      TMS.notify('error', '편집 권한이 없습니다.');
      return;
    }
    
    const modal = document.getElementById(this.config.handoverDetailModalId);
    if (!modal) return;
    
    // 폼 데이터 수집
    const formData = {
      title: modal.querySelector('input[name="title"]').value,
      department: modal.querySelector('select[name="department"]').value,
      content: modal.querySelector('textarea[name="content"]').value
    };
    
    // 필수 입력 확인
    const requiredFields = ['title', 'department', 'content'];
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
      TMS.notify('warning', '필수 항목을 모두 입력해주세요.');
      return;
    }
    
    // API 호출
    TMS.api.put(`/api/v1/handovers/${this.state.currentHandoverId}`, formData)
      .then(response => {
        if (response && response.success) {
          TMS.notify('success', '인수인계가 성공적으로 업데이트되었습니다.');
          
          // 편집 모드 비활성화
          this.disableHandoverEdit();
          
          // 인수인계 목록 새로고침
          this.loadHandovers();
          
          // 상세 정보 새로고침
          this.loadHandoverDetail(this.state.currentHandoverId);
        } else {
          TMS.notify('error', response.message || '인수인계 업데이트에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('인수인계 업데이트 오류:', error);
        TMS.notify('error', '인수인계 업데이트에 실패했습니다.');
      });
  },
  
  /**
   * 인수인계 생성 모달 열기
   */
  openCreateHandoverModal: function() {
    TMS.modal.open(this.config.handoverModalId);
  },
  
  /**
   * 새 인수인계 생성
   * @param {FormData} formData - 폼 데이터
   */
  createHandover: function(formData) {
    // 폼 데이터를 객체로 변환
    const handoverData = {};
    for (const [key, value] of formData.entries()) {
      handoverData[key] = value;
    }
    
    // API 호출
    TMS.api.post('/api/v1/handovers', handoverData)
      .then(response => {
        if (response && response.success) {
          TMS.notify('success', '인수인계가 성공적으로 생성되었습니다.');
          
          // 모달 닫기
          TMS.modal.close(this.config.handoverModalId);
          
          // 폼 초기화
          const form = document.querySelector(`#${this.config.handoverModalId} form`);
          if (form) form.reset();
          
          // 인수인계 목록 새로고침
          this.loadHandovers();
        } else {
          TMS.notify('error', response.message || '인수인계 생성에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('인수인계 생성 오류:', error);
        TMS.notify('error', '인수인계 생성에 실패했습니다.');
      });
  }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  Handover.init();
});

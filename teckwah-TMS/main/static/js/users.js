/**
 * 사용자 관리 페이지 스크립트
 * 사용자 목록 조회, 추가, 삭제 등을 담당합니다.
 */

// 사용자 관리 네임스페이스
const Users = {
  /**
   * 설정
   */
  config: {
    userTableId: 'userTable',
    addUserModalId: 'addUserModal'
  },
  
  /**
   * 초기화
   */
  init: function() {
    console.log('[Users] 초기화 시작');
    
    // 버튼 이벤트 연결
    this.initButtons();
    
    // 모달 초기화
    this.initModals();
    
    // 사용자 테이블 초기화
    this.initTable();
    
    // 사용자 목록 로드
    this.loadUsers();
    
    console.log('[Users] 초기화 완료');
  },
  
  /**
   * 버튼 이벤트 초기화
   */
  initButtons: function() {
    // 새로고침 버튼
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadUsers();
      });
    }
    
    // 사용자 추가 버튼
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
      addUserBtn.addEventListener('click', () => {
        this.openAddUserModal();
      });
    }
  },
  
  /**
   * 모달 초기화
   */
  initModals: function() {
    // 사용자 추가 모달 초기화
    const addUserModal = document.getElementById(this.config.addUserModalId);
    if (addUserModal) {
      // 모달 내 닫기 버튼
      const closeBtn = addUserModal.querySelector('.modal-close, .close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          TMS.modal.close(this.config.addUserModalId);
        });
      }
      
      // 사용자 추가 폼 제출
      const addUserForm = addUserModal.querySelector('form');
      if (addUserForm) {
        addUserForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.addUser(new FormData(addUserForm));
        });
      }
    }
  },
  
  /**
   * 테이블 초기화
   */
  initTable: function() {
    // 테이블 클릭 이벤트 위임
    const userTable = document.getElementById(this.config.userTableId);
    if (userTable) {
      userTable.addEventListener('click', (e) => {
        // 삭제 버튼 처리
        if (e.target.closest('.delete-user-btn')) {
          const row = e.target.closest('tr');
          const userId = row.getAttribute('data-id');
          if (userId) {
            this.confirmDeleteUser(userId);
          }
        }
      });
    }
  },
  
  /**
   * 사용자 목록 로드
   */
  loadUsers: function() {
    // 로딩 표시
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    // API 호출
    TMS.api.get('/api/v1/users')
      .then(response => {
        if (response && response.success) {
          // 사용자 목록 업데이트
          this.updateUserTable(response.data.users || []);
          
          // 성공 알림
          TMS.notify('success', '사용자 목록을 성공적으로 불러왔습니다.');
        } else {
          TMS.notify('error', '사용자 목록을 불러오는데 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('사용자 목록 로드 오류:', error);
        TMS.notify('error', '사용자 목록을 불러오는데 실패했습니다.');
      })
      .finally(() => {
        // 로딩 숨김
        if (loadingOverlay) loadingOverlay.style.display = 'none';
      });
  },
  
  /**
   * 사용자 테이블 업데이트
   * @param {Array} users - 사용자 목록
   */
  updateUserTable: function(users) {
    const table = document.getElementById(this.config.userTableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    // 테이블 내용 초기화
    tbody.innerHTML = '';
    
    // 데이터가 없는 경우
    if (!users || users.length === 0) {
      const noDataRow = document.createElement('tr');
      noDataRow.className = 'no-data-row';
      noDataRow.innerHTML = `
        <td colspan="5" class="no-data-cell">데이터가 없습니다</td>
      `;
      tbody.appendChild(noDataRow);
      return;
    }
    
    // 사용자 목록 표시
    users.forEach(user => {
      const row = document.createElement('tr');
      row.setAttribute('data-id', user.id);
      
      row.innerHTML = `
        <td class="column-id">${user.user_id}</td>
        <td class="column-name">${user.name || '-'}</td>
        <td class="column-department">${user.department || '-'}</td>
        <td class="column-role">
          <span class="role-badge ${user.role.toLowerCase()}">${user.role}</span>
        </td>
        <td class="column-actions">
          <button type="button" class="delete-user-btn action-btn">
            <i class="fas fa-trash-alt"></i> 삭제
          </button>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  },
  
  /**
   * 사용자 추가 모달 열기
   */
  openAddUserModal: function() {
    TMS.modal.open(this.config.addUserModalId);
  },
  
  /**
   * 새 사용자 추가
   * @param {FormData} formData - 폼 데이터
   */
  addUser: function(formData) {
    // 폼 데이터를 객체로 변환
    const userData = {};
    for (const [key, value] of formData.entries()) {
      userData[key] = value;
    }
    
    // 필수 입력 확인
    if (!userData.user_id || !userData.password || !userData.role) {
      TMS.notify('warning', '필수 항목을 모두 입력해주세요.');
      return;
    }
    
    // API 호출
    TMS.api.post('/api/v1/users', userData)
      .then(response => {
        if (response && response.success) {
          TMS.notify('success', '사용자가 성공적으로 추가되었습니다.');
          
          // 모달 닫기
          TMS.modal.close(this.config.addUserModalId);
          
          // 폼 초기화
          const form = document.querySelector(`#${this.config.addUserModalId} form`);
          if (form) form.reset();
          
          // 사용자 목록 새로고침
          this.loadUsers();
        } else {
          TMS.notify('error', response.message || '사용자 추가에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('사용자 추가 오류:', error);
        TMS.notify('error', '사용자 추가에 실패했습니다.');
      });
  },
  
  /**
   * 사용자 삭제 확인
   * @param {string} userId - 사용자 ID
   */
  confirmDeleteUser: function(userId) {
    if (confirm('이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      this.deleteUser(userId);
    }
  },
  
  /**
   * 사용자 삭제
   * @param {string} userId - 사용자 ID
   */
  deleteUser: function(userId) {
    TMS.api.delete(`/api/v1/users/${userId}`)
      .then(response => {
        if (response && response.success) {
          TMS.notify('success', '사용자가 성공적으로 삭제되었습니다.');
          
          // 사용자 목록 새로고침
          this.loadUsers();
        } else {
          TMS.notify('error', response.message || '사용자 삭제에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('사용자 삭제 오류:', error);
        TMS.notify('error', '사용자 삭제에 실패했습니다.');
      });
  }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  Users.init();
});

/**
 * 사용자 관리 페이지 스크립트
 * 간소화된 사용자 생성 및 삭제 기능
 */
document.addEventListener('DOMContentLoaded', function() {
  // 사용자 관리 모듈
  const UserManagement = {
    /**
     * 초기화 함수
     */
    init() {
      // 관리자 권한 확인
      if (!Utils.auth.isAdmin()) {
        Utils.message.error('관리자만 접근할 수 있는 페이지입니다.');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
        return;
      }
      
      // 이벤트 리스너 설정
      this.initEventListeners();
    },
    
    /**
     * 이벤트 리스너 설정
     */
    initEventListeners() {
      // 새로고침 버튼
      const refreshBtn = document.getElementById('refreshBtn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          window.location.reload();
        });
      }
      
      // 신규 사용자 추가 버튼
      const newUserBtn = document.getElementById('newUserBtn');
      if (newUserBtn) {
        newUserBtn.addEventListener('click', () => {
          this.openUserDialog();
        });
      }
      
      // 사용자 삭제 버튼들
      const deleteButtons = document.querySelectorAll('.delete-user');
      deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const userId = e.currentTarget.dataset.userid;
          if (userId) {
            this.confirmDeleteUser(userId);
          }
        });
      });
      
      // 다이얼로그 내부 버튼
      const cancelUserBtn = document.getElementById('cancelUserBtn');
      const saveUserBtn = document.getElementById('saveUserBtn');
      const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
      const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
      
      if (cancelUserBtn) {
        cancelUserBtn.addEventListener('click', () => {
          this.closeUserDialog();
        });
      }
      
      if (saveUserBtn) {
        // 폼 제출 처리
        const userForm = document.getElementById('userForm');
        if (userForm) {
          userForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
          });
        }
      }
      
      if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
          this.closeDeleteConfirm();
        });
      }
      
      if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
          this.deleteUser();
        });
      }
    },
    
    /**
     * 신규 사용자 추가 다이얼로그 표시
     */
    openUserDialog() {
      const dialog = document.getElementById('userFormDialog');
      if (dialog) {
        // 폼 초기화
        const form = document.getElementById('userForm');
        if (form) {
          form.reset();
        }
        
        // 다이얼로그 제목 설정
        const dialogTitle = document.getElementById('dialogTitle');
        if (dialogTitle) {
          dialogTitle.textContent = '신규 사용자 추가';
        }
        
        // 다이얼로그 표시
        dialog.classList.add('active');
      }
    },
    
    /**
     * 사용자 다이얼로그 닫기
     */
    closeUserDialog() {
      const dialog = document.getElementById('userFormDialog');
      if (dialog) {
        dialog.classList.remove('active');
      }
    },
    
    /**
     * 사용자 추가/수정 저장
     */
    async saveUser() {
      try {
        // 입력 필드 값 가져오기
        const loginId = document.getElementById('loginId').value.trim();
        const userName = document.getElementById('userName').value.trim();
        const password = document.getElementById('password').value;
        const department = document.getElementById('department').value;
        const userRole = document.getElementById('userRole').value;
        
        // 필수 입력 값 검증
        if (!loginId || !userName || !password) {
          Utils.message.warning('필수 입력 항목을 모두 입력해주세요.');
          return;
        }
        
        // 로딩 표시
        Utils.http.showLoading();
        
        // 사용자 데이터 객체 생성
        const userData = {
          login_id: loginId,
          user_name: userName,
          password: password,
          department: department,
          user_role: userRole,
          is_active: true
        };
        
        // API 호출
        const response = await Utils.http.post('/users', userData);
        
        // 성공 처리
        if (response && response.success) {
          Utils.message.success(response.message || '사용자가 성공적으로 추가되었습니다.');
          
          // 다이얼로그 닫기
          this.closeUserDialog();
          
          // 페이지 새로고침
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          throw new Error(response.message || '사용자 저장 실패');
        }
      } catch (error) {
        console.error('사용자 저장 오류:', error);
        Utils.message.error(error.message || '사용자 저장 중 오류가 발생했습니다.');
      } finally {
        // 로딩 숨김
        Utils.http.hideLoading();
      }
    },
    
    /**
     * 사용자 삭제 확인 다이얼로그 표시
     */
    confirmDeleteUser(userId) {
      // 삭제할 사용자 ID 저장
      this.userIdToDelete = userId;
      
      // 삭제 확인 다이얼로그 표시
      const dialog = document.getElementById('deleteConfirmDialog');
      if (dialog) {
        dialog.classList.add('active');
      } else {
        // 다이얼로그가 없으면 window.confirm 사용
        if (confirm('정말로 이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
          this.deleteUser();
        }
      }
    },
    
    /**
     * 삭제 확인 다이얼로그 닫기
     */
    closeDeleteConfirm() {
      const dialog = document.getElementById('deleteConfirmDialog');
      if (dialog) {
        dialog.classList.remove('active');
      }
      this.userIdToDelete = null;
    },
    
    /**
     * 사용자 삭제 처리
     */
    async deleteUser() {
      if (!this.userIdToDelete) {
        this.closeDeleteConfirm();
        return;
      }
      
      try {
        // 로딩 표시
        Utils.http.showLoading();
        
        // 삭제 API 호출
        const response = await Utils.http.post(`/users/${this.userIdToDelete}/delete`);
        
        // 성공 처리
        if (response && response.success) {
          Utils.message.success(response.message || '사용자가 성공적으로 삭제되었습니다.');
          
          // 페이지 새로고침
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          throw new Error(response.message || '사용자 삭제 실패');
        }
      } catch (error) {
        console.error('사용자 삭제 오류:', error);
        Utils.message.error(error.message || '사용자 삭제 중 오류가 발생했습니다.');
      } finally {
        // 로딩 숨김
        Utils.http.hideLoading();
        
        // 다이얼로그 닫기
        this.closeDeleteConfirm();
      }
    }
  };
  
  // 사용자 관리 모듈 초기화
  UserManagement.init();
  
  // 글로벌 스코프에 노출
  window.UserManagement = UserManagement;
});

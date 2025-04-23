/**
 * 사용자 관리 페이지 JavaScript
 */

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function () {
  setupFilterForm();
  setupUserForm();
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

// 사용자 폼 설정
function setupUserForm() {
  const userForm = document.getElementById('userForm');
  if (!userForm) return;

  userForm.addEventListener('submit', function (e) {
    e.preventDefault();

    // 비밀번호 확인
    const isEdit = document.getElementById('isEdit').value === 'true';
    const password = document.getElementById('user_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    if (!isEdit && (!password || password !== confirmPassword)) {
      showAlert('비밀번호와 비밀번호 확인이 일치하지 않습니다.', 'error');
      return;
    }

    // 폼 데이터 제출
    submitUserForm(userForm);
  });
}

// 필터 초기화
function resetFilters() {
  window.location.href = window.location.pathname;
}

// 사용자 추가 모달 열기
function openCreateModal() {
  const modal = document.getElementById('userFormModal');
  if (!modal) return;

  // 모달 제목 변경
  document.getElementById('modalTitle').textContent = '사용자 추가';

  // 폼 초기화
  const form = document.getElementById('userForm');
  if (form) {
    form.reset();
    document.getElementById('isEdit').value = 'false';
    document.getElementById('user_id').disabled = false;

    // 비밀번호 필드 표시
    document.getElementById('passwordFields').style.display = 'block';

    // 비밀번호 필드 필수 속성 설정
    document.getElementById('user_password').required = true;
    document.getElementById('confirm_password').required = true;
  }

  // 모달 표시
  modal.style.display = 'block';
}

// 사용자 수정 모달 열기
function editUser(userId) {
  // 사용자 정보 조회
  apiRequest(`/users/${userId}`)
    .then((result) => {
      if (result.success) {
        openEditModal(result.data);
      } else {
        showAlert(
          result.message || '사용자 정보를 불러올 수 없습니다.',
          'error'
        );
      }
    })
    .catch((error) => {
      showAlert('사용자 정보를 불러오는 중 오류가 발생했습니다.', 'error');
      console.error('사용자 정보 조회 오류:', error);
    });
}

// 수정 모달 열기
function openEditModal(userData) {
  const modal = document.getElementById('userFormModal');
  if (!modal) return;

  // 모달 제목 변경
  document.getElementById('modalTitle').textContent = '사용자 수정';

  // 폼에 데이터 채우기
  const form = document.getElementById('userForm');
  if (form) {
    document.getElementById('isEdit').value = 'true';
    document.getElementById('user_id').value = userData.user_id;
    document.getElementById('user_id').disabled = true; // 아이디는 수정 불가
    document.getElementById('user_name').value = userData.user_name;
    document.getElementById('user_department').value = userData.user_department;
    document.getElementById('user_role').value = userData.user_role;

    // 비밀번호 필드 숨김 (수정 시에는 비밀번호 변경 불필요)
    document.getElementById('passwordFields').style.display = 'none';

    // 비밀번호 필드 필수 속성 제거
    document.getElementById('user_password').required = false;
    document.getElementById('confirm_password').required = false;
  }

  // 모달 표시
  modal.style.display = 'block';
}

// 사용자 데이터 제출
function submitUserForm(form) {
  const formData = formToJson(form);
  const isEdit = formData.isEdit === 'true';
  delete formData.isEdit;
  delete formData.confirm_password;

  // 비어있는 비밀번호 제거 (수정 시 비밀번호 변경하지 않음)
  if (isEdit && !formData.user_password) {
    delete formData.user_password;
  }

  const url = isEdit ? `/users/${formData.user_id}` : '/users';
  const method = isEdit ? 'PUT' : 'POST';

  apiRequest(url, method, formData)
    .then((result) => {
      if (result.success) {
        showAlert(
          isEdit ? '사용자 정보가 수정되었습니다.' : '사용자가 추가되었습니다.',
          'success'
        );
        closeModal();
        // 페이지 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showAlert(result.message || '처리 중 오류가 발생했습니다.', 'error');
      }
    })
    .catch((error) => {
      showAlert('처리 중 오류가 발생했습니다.', 'error');
      console.error('사용자 저장 오류:', error);
    });
}

// 비밀번호 초기화 모달 표시
function resetPassword(userId) {
  const modal = document.getElementById('resetPasswordModal');
  if (!modal) return;

  // 사용자 ID 설정
  document.getElementById('resetUserId').value = userId;

  // 모달 표시
  modal.style.display = 'block';
}

// 비밀번호 초기화 확인
function confirmResetPassword() {
  const userId = document.getElementById('resetUserId').value;
  if (!userId) {
    closeModal();
    return;
  }

  apiRequest(`/users/${userId}/reset-password`, 'POST')
    .then((result) => {
      if (result.success) {
        showAlert('비밀번호가 초기화되었습니다.', 'success');
        closeModal();
      } else {
        showAlert(
          result.message || '비밀번호 초기화 중 오류가 발생했습니다.',
          'error'
        );
        closeModal();
      }
    })
    .catch((error) => {
      showAlert('비밀번호 초기화 중 오류가 발생했습니다.', 'error');
      console.error('비밀번호 초기화 오류:', error);
      closeModal();
    });
}

// 사용자 상태 변경 모달 표시
function toggleUserStatus(userId, currentStatus) {
  const modal = document.getElementById('statusChangeModal');
  if (!modal) return;

  // 현재 상태에 따른 액션 설정
  const action = currentStatus === 'ACTIVE' ? 'deactivate' : 'activate';
  const actionText = currentStatus === 'ACTIVE' ? '비활성화' : '활성화';

  // 모달 제목 및 메시지 설정
  document.getElementById(
    'statusChangeTitle'
  ).textContent = `사용자 ${actionText}`;
  document.getElementById(
    'statusChangeMessage'
  ).textContent = `사용자를 ${actionText}하시겠습니까?`;

  // 사용자 ID 및 액션 설정
  document.getElementById('statusChangeUserId').value = userId;
  document.getElementById('statusChangeAction').value = action;

  // 모달 표시
  modal.style.display = 'block';
}

// 상태 변경 확인
function confirmStatusChange() {
  const userId = document.getElementById('statusChangeUserId').value;
  const action = document.getElementById('statusChangeAction').value;

  if (!userId || !action) {
    closeModal();
    return;
  }

  apiRequest(`/users/${userId}/${action}`, 'POST')
    .then((result) => {
      if (result.success) {
        const actionText = action === 'activate' ? '활성화' : '비활성화';
        showAlert(`사용자가 ${actionText}되었습니다.`, 'success');
        closeModal();
        // 페이지 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showAlert(
          result.message || '상태 변경 중 오류가 발생했습니다.',
          'error'
        );
        closeModal();
      }
    })
    .catch((error) => {
      showAlert('상태 변경 중 오류가 발생했습니다.', 'error');
      console.error('상태 변경 오류:', error);
      closeModal();
    });
}

// 알림 표시
function showAlert(message, type = 'info') {
  const container = document.getElementById('alertContainer');
  if (!container) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
        <span>${message}</span>
        <button class="close-btn" onclick="this.parentNode.remove()">×</button>
    `;

  container.appendChild(alert);

  // 5초 후 자동 제거
  setTimeout(() => {
    if (alert.parentNode) {
      alert.remove();
    }
  }, 5000);
}

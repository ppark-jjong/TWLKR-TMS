// 사용자 관리 페이지 스크립트

// 전역 변수
let currentUserItem = null;

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function () {
  // 사이드바 토글 이벤트 리스너
  document
    .getElementById('sidebarToggle')
    .addEventListener('click', toggleSidebar);

  // 메뉴 아이템 이벤트 리스너
  document.querySelectorAll('.menu-item').forEach((item) => {
    item.addEventListener('click', function () {
      navigateToPage(this.dataset.page);
    });
  });

  // 사용자 추가 버튼 이벤트 리스너
  document.getElementById('addUserBtn').addEventListener('click', function () {
    toggleModal('userModal', true);
  });

  // 사용자 추가 모달 이벤트 리스너
  document
    .getElementById('userModalClose')
    .addEventListener('click', function () {
      toggleModal('userModal', false);
    });
  document
    .getElementById('userModalCancel')
    .addEventListener('click', function () {
      toggleModal('userModal', false);
    });
  document
    .getElementById('userModalSubmit')
    .addEventListener('click', handleAddUser);

  // 사용자 수정 모달 이벤트 리스너
  document
    .getElementById('editUserModalClose')
    .addEventListener('click', function () {
      toggleModal('editUserModal', false);
    });
  document
    .getElementById('editUserModalCancel')
    .addEventListener('click', function () {
      toggleModal('editUserModal', false);
    });
  document
    .getElementById('editUserModalSubmit')
    .addEventListener('click', handleEditUser);

  // 비밀번호 변경 모달 이벤트 리스너
  document
    .getElementById('passwordModalClose')
    .addEventListener('click', function () {
      toggleModal('passwordModal', false);
    });
  document
    .getElementById('passwordModalCancel')
    .addEventListener('click', function () {
      toggleModal('passwordModal', false);
    });
  document
    .getElementById('passwordModalSubmit')
    .addEventListener('click', handleChangePassword);

  // 사용자 테이블 렌더링
  renderUsersTable();
});

// 사이드바 토글
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');

  sidebar.classList.toggle('sidebar-collapsed');
  mainContent.classList.toggle('main-content-full');

  const toggleBtn = document.getElementById('sidebarToggle');
  toggleBtn.textContent = sidebar.classList.contains('sidebar-collapsed')
    ? '▶'
    : '◀';
}

// 페이지 이동
function navigateToPage(page) {
  switch (page) {
    case 'admin':
      window.location.href = 'index.html';
      break;
    case 'handover':
      window.location.href = 'handover.html';
      break;
    case 'users':
      // 현재 페이지이므로 아무 작업 없음
      break;
  }
}

// 사용자 테이블 렌더링
function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '';

  userData.forEach((user) => {
    const tr = document.createElement('tr');

    // ID, 이름, 부서
    tr.appendChild(createCell(user.user_id));
    tr.appendChild(createCell(user.name || user.user_id)); // 이름이 없으면 ID 표시
    tr.appendChild(createCell(user.user_department));

    // 권한
    const roleCell = document.createElement('td');
    const roleTag = document.createElement('span');
    roleTag.className =
      user.user_role === 'ADMIN' ? 'tag tag-blue' : 'tag tag-gray';
    roleTag.textContent = user.user_role === 'ADMIN' ? '관리자' : '일반 사용자';
    roleCell.appendChild(roleTag);
    tr.appendChild(roleCell);

    // 상태
    const statusCell = document.createElement('td');
    const statusTag = document.createElement('span');
    statusTag.className =
      user.status === 'ACTIVE' ? 'tag tag-green' : 'tag tag-red';
    statusTag.textContent = user.status === 'ACTIVE' ? '활성' : '비활성';
    statusCell.appendChild(statusTag);
    tr.appendChild(statusCell);

    // 액션
    const actionCell = document.createElement('td');

    const editButton = document.createElement('button');
    editButton.className = 'action-button';
    editButton.textContent = '수정';
    editButton.style.marginRight = '4px';
    editButton.addEventListener('click', function (e) {
      e.stopPropagation();
      showEditModal(user);
    });
    actionCell.appendChild(editButton);

    const pwdButton = document.createElement('button');
    pwdButton.className = 'action-button';
    pwdButton.textContent = '비밀번호 변경';
    pwdButton.addEventListener('click', function (e) {
      e.stopPropagation();
      showPasswordModal(user);
    });
    actionCell.appendChild(pwdButton);

    tr.appendChild(actionCell);

    tbody.appendChild(tr);
  });
}

// 셀 생성 헬퍼 함수
function createCell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

// 사용자 수정 모달 표시
function showEditModal(user) {
  currentUserItem = user;

  document.getElementById('editUserId').value = user.user_id;
  document.getElementById('editUserName').value = user.name || '';
  document.getElementById('editUserDepartment').value = user.user_department;
  document.getElementById('editUserRole').value = user.user_role;
  document.getElementById('editUserStatus').value = user.status;

  toggleModal('editUserModal', true);
}

// 비밀번호 변경 모달 표시
function showPasswordModal(user) {
  document.getElementById('passwordUserId').value = user.user_id;
  document.getElementById('passwordUserName').textContent =
    user.name || user.user_id;

  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';

  toggleModal('passwordModal', true);
}

// 사용자 추가 처리
function handleAddUser() {
  const userId = document.getElementById('userId').value;
  const userName = document.getElementById('userName').value;
  const userPassword = document.getElementById('userPassword').value;
  const userDepartment = document.getElementById('userDepartment').value;
  const userRole = document.getElementById('userRole').value;

  if (!userId || !userPassword) {
    alert('ID와 비밀번호는 필수 항목입니다.');
    return;
  }

  // ID 중복 체크
  if (userData.some((user) => user.user_id === userId)) {
    alert('이미 존재하는 ID입니다.');
    return;
  }

  // 새 사용자 생성
  const newUser = {
    user_id: userId,
    name: userName,
    user_password: `$2b$12$P6tQZsH1yJwZ4YC.2jF1D.ZBzplXEjzZm5y6.eBgeq6nXvh/TFIfi`, // 암호화된 비밀번호 (실제로는 bcrypt 등으로 암호화)
    user_department: userDepartment,
    user_role: userRole,
    status: 'ACTIVE',
  };

  // 데이터 추가
  userData.push(newUser);

  // 테이블 새로고침
  renderUsersTable();

  // 모달 닫기
  toggleModal('userModal', false);

  // 폼 초기화
  document.getElementById('userId').value = '';
  document.getElementById('userName').value = '';
  document.getElementById('userPassword').value = '';

  alert('사용자가 추가되었습니다.');
}

// 사용자 수정 처리
function handleEditUser() {
  const userId = document.getElementById('editUserId').value;
  const userName = document.getElementById('editUserName').value;
  const userDepartment = document.getElementById('editUserDepartment').value;
  const userRole = document.getElementById('editUserRole').value;
  const userStatus = document.getElementById('editUserStatus').value;

  // 데이터 업데이트
  const index = userData.findIndex((user) => user.user_id === userId);
  if (index !== -1) {
    userData[index].name = userName;
    userData[index].user_department = userDepartment;
    userData[index].user_role = userRole;
    userData[index].status = userStatus;
  }

  // 테이블 새로고침
  renderUsersTable();

  // 모달 닫기
  toggleModal('editUserModal', false);

  alert('사용자 정보가 수정되었습니다.');
}

// 비밀번호 변경 처리
function handleChangePassword() {
  const userId = document.getElementById('passwordUserId').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!newPassword) {
    alert('새 비밀번호를 입력해주세요.');
    return;
  }

  if (newPassword !== confirmPassword) {
    alert('비밀번호가 일치하지 않습니다.');
    return;
  }

  // 비밀번호 업데이트 (실제로는 서버 API 호출)
  const index = userData.findIndex((user) => user.user_id === userId);
  if (index !== -1) {
    // 실제로는 비밀번호 해싱을 통해 안전하게 저장해야 함
    userData[
      index
    ].user_password = `$2b$12$P6tQZsH1yJwZ4YC.2jF1D.ZBzplXEjzZm5y6.eBgeq6nXvh/TFIfi`;
  }

  // 모달 닫기
  toggleModal('passwordModal', false);

  alert('비밀번호가 변경되었습니다.');
}

// 모달 토글
function toggleModal(modalId, show) {
  const modal = document.getElementById(modalId);
  if (show) {
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
}

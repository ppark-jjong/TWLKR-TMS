// 인수인계 페이지 스크립트

// 전역 변수
let currentHandoverItem = null;

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

  // 인수인계 작성 버튼 이벤트 리스너
  document
    .getElementById('addHandoverBtn')
    .addEventListener('click', function () {
      toggleModal('handoverModal', true);
    });

  // 인수인계 모달 이벤트 리스너
  document
    .getElementById('handoverModalClose')
    .addEventListener('click', function () {
      toggleModal('handoverModal', false);
    });
  document
    .getElementById('handoverModalCancel')
    .addEventListener('click', function () {
      toggleModal('handoverModal', false);
    });
  document
    .getElementById('handoverModalSubmit')
    .addEventListener('click', handleAddHandover);

  // 인수인계 수정 모달 이벤트 리스너
  document
    .getElementById('editHandoverModalClose')
    .addEventListener('click', function () {
      toggleModal('editHandoverModal', false);
    });
  document
    .getElementById('editHandoverModalCancel')
    .addEventListener('click', function () {
      toggleModal('editHandoverModal', false);
    });
  document
    .getElementById('editHandoverModalSubmit')
    .addEventListener('click', handleEditHandover);

  // 인수인계 리스트 렌더링
  renderHandoverList();
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
      // 현재 페이지이므로 아무 작업 없음
      break;
    case 'users':
      window.location.href = 'users.html';
      break;
  }
}

// 인수인계 목록 렌더링
function renderHandoverList() {
  const container = document.getElementById('handoverList');
  container.innerHTML = '';

  // 공지를 먼저 표시
  const sortedHandovers = [...handoverData].sort((a, b) => {
    if (a.is_notice && !b.is_notice) return -1;
    if (!a.is_notice && b.is_notice) return 1;
    return new Date(b.created_at) - new Date(a.created_at); // 최신순 정렬
  });

  sortedHandovers.forEach((handover) => {
    const card = document.createElement('div');
    card.className = handover.is_notice
      ? 'handover-card handover-notice'
      : 'handover-card';

    const header = document.createElement('div');
    header.className = 'handover-header';

    const title = document.createElement('h3');
    title.className = 'handover-title';
    title.textContent = handover.title;

    const meta = document.createElement('div');
    meta.className = 'handover-meta';
    meta.textContent = `작성자: ${handover.created_by} (${handover.created_at})`;

    header.appendChild(title);
    header.appendChild(meta);

    const content = document.createElement('p');
    content.className = 'handover-content';
    content.textContent = handover.content;

    card.appendChild(header);
    card.appendChild(content);

    // 관리자는 수정, 삭제 버튼 추가
    const actions = document.createElement('div');
    actions.className = 'text-right my-3';

    const editBtn = document.createElement('button');
    editBtn.className = 'action-button';
    editBtn.textContent = '수정';
    editBtn.style.marginRight = '8px';
    editBtn.addEventListener('click', function () {
      showEditModal(handover);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-button';
    deleteBtn.textContent = '삭제';
    deleteBtn.addEventListener('click', function () {
      handleDeleteHandover(handover.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(actions);

    container.appendChild(card);
  });
}

// 수정 모달 표시
function showEditModal(handover) {
  currentHandoverItem = handover;

  document.getElementById('editHandoverId').value = handover.id;
  document.getElementById('editHandoverTitle').value = handover.title;
  document.getElementById('editHandoverContent').value = handover.content;
  document.getElementById('editIsNotice').checked = handover.is_notice;

  toggleModal('editHandoverModal', true);
}

// 인수인계 추가 처리
function handleAddHandover() {
  const title = document.getElementById('handoverTitle').value;
  const content = document.getElementById('handoverContent').value;
  const isNotice = document.getElementById('isNotice').checked;

  if (!title || !content) {
    alert('제목과 내용을 입력해주세요.');
    return;
  }

  // 현재 날짜/시간 포맷팅
  const now = getCurrentDateTime();

  // 새 인수인계 생성
  const newHandover = {
    id:
      handoverData.length > 0
        ? Math.max(...handoverData.map((item) => item.id)) + 1
        : 1,
    title: title,
    content: content,
    created_by: '관리자',
    created_at: now,
    is_notice: isNotice,
  };

  // 데이터 추가
  handoverData.push(newHandover);

  // 리스트 새로고침
  renderHandoverList();

  // 모달 닫기
  toggleModal('handoverModal', false);

  // 폼 초기화
  document.getElementById('handoverTitle').value = '';
  document.getElementById('handoverContent').value = '';
  document.getElementById('isNotice').checked = false;

  alert('인수인계가 등록되었습니다.');
}

// 인수인계 수정 처리
function handleEditHandover() {
  const id = parseInt(document.getElementById('editHandoverId').value);
  const title = document.getElementById('editHandoverTitle').value;
  const content = document.getElementById('editHandoverContent').value;
  const isNotice = document.getElementById('editIsNotice').checked;

  if (!title || !content) {
    alert('제목과 내용을 입력해주세요.');
    return;
  }

  // 현재 날짜/시간 포맷팅
  const now = getCurrentDateTime();

  // 데이터 업데이트
  const index = handoverData.findIndex((item) => item.id === id);
  if (index !== -1) {
    handoverData[index].title = title;
    handoverData[index].content = content;
    handoverData[index].is_notice = isNotice;
    handoverData[
      index
    ].created_at = `${handoverData[index].created_at} (수정: ${now})`;
  }

  // 리스트 새로고침
  renderHandoverList();

  // 모달 닫기
  toggleModal('editHandoverModal', false);

  alert('인수인계가 수정되었습니다.');
}

// 인수인계 삭제 처리
function handleDeleteHandover(id) {
  if (confirm('이 인수인계를 삭제하시겠습니까?')) {
    // 데이터에서 삭제
    const index = handoverData.findIndex((item) => item.id === id);
    if (index !== -1) {
      handoverData.splice(index, 1);
    }

    // 리스트 새로고침
    renderHandoverList();

    alert('인수인계가 삭제되었습니다.');
  }
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

// 현재 날짜/시간 포맷팅
function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

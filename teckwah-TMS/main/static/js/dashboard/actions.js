/**
 * 대시보드 액션 버튼 관련 기능
 */

/**
 * 액션 버튼 초기화
 */
function initializeActionButtons() {
  // 상태 변경 버튼
  const statusChangeBtn = document.getElementById('statusChangeBtn');
  const selectedStatusBtn = document.getElementById('selectedStatusBtn');
  
  if (statusChangeBtn) {
    statusChangeBtn.addEventListener('click', function() {
      DashboardModals.openStatusChangeModal();
    });
  }
  
  if (selectedStatusBtn) {
    selectedStatusBtn.addEventListener('click', function() {
      DashboardModals.openStatusChangeModal();
    });
  }
  
  // 배차 처리 버튼
  const driverAssignBtn = document.getElementById('driverAssignBtn');
  const selectedDriverBtn = document.getElementById('selectedDriverBtn');
  
  if (driverAssignBtn) {
    driverAssignBtn.addEventListener('click', function() {
      DashboardModals.openDriverAssignModal();
    });
  }
  
  if (selectedDriverBtn) {
    selectedDriverBtn.addEventListener('click', function() {
      DashboardModals.openDriverAssignModal();
    });
  }
  
  // 신규 등록 버튼
  const createOrderBtn = document.getElementById('createOrderBtn');
  
  if (createOrderBtn) {
    createOrderBtn.addEventListener('click', function() {
      DashboardModals.openCreateOrderModal();
    });
  }
  
  // 삭제 버튼
  const deleteOrderBtn = document.getElementById('deleteOrderBtn');
  const selectedDeleteBtn = document.getElementById('selectedDeleteBtn');
  
  if (deleteOrderBtn) {
    deleteOrderBtn.addEventListener('click', function() {
      DashboardModals.openDeleteConfirmModal();
    });
  }
  
  if (selectedDeleteBtn) {
    selectedDeleteBtn.addEventListener('click', function() {
      DashboardModals.openDeleteConfirmModal();
    });
  }
}

/**
 * 엑셀 다운로드 처리
 */
async function handleExcelDownload() {
  // 현재 필터 설정 유지
  const urlParams = new URLSearchParams(window.location.search);
  const filters = {};
  
  // URL 파라미터에서 필터 정보 추출
  for (const [key, value] of urlParams.entries()) {
    filters[key] = value;
  }
  
  try {
    // 다운로드 요청
    const response = await fetch('/dashboard/export-excel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/octet-stream'
      },
      body: JSON.stringify(filters),
      credentials: 'include'
    });
    
    // 응답 체크
    if (!response.ok) {
      throw new Error('다운로드 요청이 실패했습니다.');
    }
    
    // Content-Type 확인
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      // JSON 응답 파싱 (오류 메시지)
      const result = await response.json();
      Modal.alert(result.message || '다운로드 실패', 'error');
      return;
    }
    
    // 파일 다운로드
    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = '대시보드_데이터.xlsx';
    
    // 파일명 추출
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/i);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    // 다운로드 링크 생성 및 클릭
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // 성공 메시지
    Modal.alert('파일 다운로드가 완료되었습니다.', 'success');
  } catch (error) {
    console.error('엑셀 다운로드 오류:', error);
    Modal.alert('파일 다운로드 중 오류가 발생했습니다.', 'error');
  }
}

/**
 * 필터 즐겨찾기 저장
 */
function saveFilterBookmark() {
  const urlParams = new URLSearchParams(window.location.search);
  const filters = {};
  
  // URL 파라미터에서 필터 정보 추출
  for (const [key, value] of urlParams.entries()) {
    filters[key] = value;
  }
  
  // 이름 입력 받기
  const bookmarkName = prompt('저장할 필터 이름을 입력하세요:', '필터 ' + (new Date()).toLocaleDateString());
  
  if (!bookmarkName) return;
  
  // 저장된 북마크 목록 가져오기
  const bookmarks = Utils.loadFromLocalStorage('filterBookmarks', []);
  
  // 북마크 추가
  bookmarks.push({
    name: bookmarkName,
    filters: filters,
    date: new Date().toISOString()
  });
  
  // 저장
  Utils.saveToLocalStorage('filterBookmarks', bookmarks);
  
  // 성공 메시지
  Modal.alert('필터 설정이 저장되었습니다.', 'success');
  
  // 북마크 목록 업데이트
  updateBookmarksList();
}

/**
 * 필터 즐겨찾기 목록 업데이트
 */
function updateBookmarksList() {
  const bookmarksContainer = document.getElementById('filterBookmarks');
  if (!bookmarksContainer) return;
  
  // 저장된 북마크 목록 가져오기
  const bookmarks = Utils.loadFromLocalStorage('filterBookmarks', []);
  
  // 목록 비우기
  bookmarksContainer.innerHTML = '';
  
  if (bookmarks.length === 0) {
    bookmarksContainer.innerHTML = '<div class="empty-list">저장된 필터가 없습니다.</div>';
    return;
  }
  
  // 북마크 항목 추가
  bookmarks.forEach((bookmark, index) => {
    const bookmarkItem = document.createElement('div');
    bookmarkItem.className = 'bookmark-item';
    
    // 북마크 내용
    const nameSpan = document.createElement('span');
    nameSpan.className = 'bookmark-name';
    nameSpan.textContent = bookmark.name;
    
    const dateSpan = document.createElement('span');
    dateSpan.className = 'bookmark-date';
    dateSpan.textContent = new Date(bookmark.date).toLocaleDateString();
    
    // 액션 버튼
    const actions = document.createElement('div');
    actions.className = 'bookmark-actions';
    
    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'apply-bookmark';
    applyBtn.innerHTML = '<i class="fas fa-check"></i>';
    applyBtn.title = '적용';
    applyBtn.onclick = function() {
      applyFilterBookmark(bookmark.filters);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-bookmark';
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.title = '삭제';
    deleteBtn.onclick = function() {
      deleteFilterBookmark(index);
    };
    
    // 항목 조합
    actions.appendChild(applyBtn);
    actions.appendChild(deleteBtn);
    
    bookmarkItem.appendChild(nameSpan);
    bookmarkItem.appendChild(dateSpan);
    bookmarkItem.appendChild(actions);
    
    bookmarksContainer.appendChild(bookmarkItem);
  });
}

/**
 * 필터 즐겨찾기 적용
 * @param {Object} filters - 적용할 필터 설정
 */
function applyFilterBookmark(filters) {
  // URL 생성
  const url = new URL(window.location.href);
  
  // 현재 파라미터 모두 제거
  for (const key of [...url.searchParams.keys()]) {
    url.searchParams.delete(key);
  }
  
  // 북마크 파라미터 추가
  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }
  
  // 페이지 이동
  window.location.href = url.toString();
}

/**
 * 필터 즐겨찾기 삭제
 * @param {number} index - 삭제할 북마크 인덱스
 */
function deleteFilterBookmark(index) {
  // 저장된 북마크 목록 가져오기
  const bookmarks = Utils.loadFromLocalStorage('filterBookmarks', []);
  
  // 인덱스 확인
  if (index < 0 || index >= bookmarks.length) return;
  
  // 삭제 확인
  if (!confirm(`"${bookmarks[index].name}" 북마크를 삭제하시겠습니까?`)) return;
  
  // 북마크 삭제
  bookmarks.splice(index, 1);
  
  // 저장
  Utils.saveToLocalStorage('filterBookmarks', bookmarks);
  
  // 목록 업데이트
  updateBookmarksList();
  
  // 성공 메시지
  Modal.alert('북마크가 삭제되었습니다.', 'success');
}

// 전역 namespace에 등록
window.DashboardActions = {
  initializeActionButtons,
  handleExcelDownload,
  saveFilterBookmark,
  updateBookmarksList,
  applyFilterBookmark,
  deleteFilterBookmark
};

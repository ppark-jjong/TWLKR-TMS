/**
 * 인수인계 페이지 스크립트
 */

// 현재 필터 상태
const handoverFilters = {
  isNotice: undefined,
  keyword: ''
};

// 인수인계 페이지 초기화
function initHandover() {
  console.log('인수인계 페이지 초기화');
  
  // 페이지 타이틀 설정
  setPageTitle('인수인계');
  
  // 필터 이벤트 설정
  setupHandoverFilters();
  
  // 테이블 행 클릭 이벤트 설정
  setupTableRowEvents('handoverTable', showHandoverDetail);
  
  // 데이터 로드
  loadAppData().then(() => {
    // 초기 데이터 렌더링
    renderHandoverTable();
    
    // 데이터 변경 시 테이블 갱신 이벤트 설정
    document.addEventListener('handover_updated', renderHandoverTable);
  });
  
  // 모달 폼 제출 이벤트 설정
  setupHandoverForms();
  
  // 새 인수인계 버튼 이벤트
  const newHandoverBtn = document.getElementById('newHandoverBtn');
  if (newHandoverBtn) {
    newHandoverBtn.addEventListener('click', showNewHandoverModal);
  }
}

// 필터 이벤트 설정
function setupHandoverFilters() {
  // 공지사항 필터
  const noticeFilterBtn = document.getElementById('noticeFilterBtn');
  const generalFilterBtn = document.getElementById('generalFilterBtn');
  const allFilterBtn = document.getElementById('allFilterBtn');
  
  if (noticeFilterBtn) {
    noticeFilterBtn.addEventListener('click', () => {
      setActiveFilter(noticeFilterBtn);
      handoverFilters.isNotice = true;
      renderHandoverTable();
    });
  }
  
  if (generalFilterBtn) {
    generalFilterBtn.addEventListener('click', () => {
      setActiveFilter(generalFilterBtn);
      handoverFilters.isNotice = false;
      renderHandoverTable();
    });
  }
  
  if (allFilterBtn) {
    allFilterBtn.addEventListener('click', () => {
      setActiveFilter(allFilterBtn);
      handoverFilters.isNotice = undefined;
      renderHandoverTable();
    });
  }
  
  // 기본으로 '전체' 필터 활성화
  if (allFilterBtn) {
    setActiveFilter(allFilterBtn);
  }
  
  // 키워드 검색
  const searchBtn = document.getElementById('handoverSearchBtn');
  const keywordInput = document.getElementById('handoverKeywordInput');
  
  if (searchBtn && keywordInput) {
    searchBtn.addEventListener('click', () => {
      handoverFilters.keyword = keywordInput.value.trim();
      renderHandoverTable();
    });
    
    // 엔터키 검색
    keywordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handoverFilters.keyword = keywordInput.value.trim();
        renderHandoverTable();
      }
    });
  }
}

// 필터 버튼 활성화
function setActiveFilter(activeBtn) {
  // 모든 필터 버튼에서 활성 클래스 제거
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 선택한 버튼에 활성 클래스 추가
  activeBtn.classList.add('active');
}

// 인수인계 테이블 렌더링
function renderHandoverTable() {
  const table = document.getElementById('handoverTable');
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  
  // 필터링된 데이터 가져오기
  const filteredData = filterHandoverData(handoverFilters);
  
  // 결과 카운트 업데이트
  const resultCount = document.getElementById('handoverResultCount');
  if (resultCount) {
    resultCount.textContent = filteredData.length;
  }
  
  // 테이블 내용 초기화
  tbody.innerHTML = '';
  
  // 데이터가 없는 경우
  if (filteredData.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `<td colspan="4" class="empty-message">데이터가 없습니다</td>`;
    tbody.appendChild(emptyRow);
    return;
  }
  
  // 데이터 행 생성
  filteredData.forEach(item => {
    const row = document.createElement('tr');
    row.setAttribute('data-id', item.handover_id);
    
    // 공지사항 표시
    const noticeLabel = item.is_notice 
      ? '<span class="notice-badge">공지</span>' 
      : '';
    
    // 행 내용 설정
    row.innerHTML = `
      <td>${item.handover_id}</td>
      <td>${noticeLabel} ${item.title}</td>
      <td>${item.created_by || '-'}</td>
      <td>${item.created_at || '-'}</td>
    `;
    
    tbody.appendChild(row);
  });
}

// 인수인계 상세 정보 표시
function showHandoverDetail(handoverId) {
  console.log('인수인계 상세 정보 표시:', handoverId);
  
  // ID로 인수인계 정보 가져오기
  const handover = findHandoverById(handoverId);
  
  if (!handover) {
    showError(`인수인계 정보를 찾을 수 없습니다: ${handoverId}`);
    return;
  }
  
  // 공지사항 표시
  const noticeLabel = handover.is_notice 
    ? '<span class="notice-badge">공지</span>' 
    : '';
  
  // 모달 내용 설정
  let content = `
    <div class="handover-detail">
      <h3>${noticeLabel} ${handover.title}</h3>
      
      <div class="handover-meta">
        <span>작성자: ${handover.created_by || '-'}</span>
        <span>작성일시: ${handover.created_at || '-'}</span>
      </div>
      
      <div class="handover-content">
        ${handover.content.replace(/\n/g, '<br>')}
      </div>
      
      <div class="handover-actions">
        <button type="button" id="editHandoverBtn" class="btn btn-primary">수정</button>
        <button type="button" id="deleteHandoverBtn" class="btn btn-danger">삭제</button>
      </div>
    </div>
  `;
  
  // 모달 제목과 내용 설정
  setModalContent('handoverDetailModal', '인수인계 상세정보', content);
  
  // 모달 열기
  openModal('handoverDetailModal');
  
  // 수정 버튼 이벤트 설정
  const editBtn = document.getElementById('editHandoverBtn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      // 상세 모달 닫기
      closeModal('handoverDetailModal');
      // 수정 모달 열기
      showEditHandoverModal(handoverId);
    });
  }
  
  // 삭제 버튼 이벤트 설정
  const deleteBtn = document.getElementById('deleteHandoverBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm('정말 이 인수인계를 삭제하시겠습니까?')) {
        // 삭제 처리
        if (deleteHandover(handoverId)) {
          showSuccess('인수인계가 삭제되었습니다.');
          closeModal('handoverDetailModal');
          renderHandoverTable();
        } else {
          showError('인수인계 삭제 중 오류가 발생했습니다.');
        }
      }
    });
  }
}

// 인수인계 삭제
function deleteHandover(handoverId) {
  const index = appData.handover.findIndex(item => item.handover_id === handoverId);
  
  if (index === -1) {
    return false;
  }
  
  // 배열에서 제거
  appData.handover.splice(index, 1);
  
  // 로컬 스토리지에 저장
  localStorage.setItem('tms_handover_data', JSON.stringify(appData.handover));
  
  // 변경 알림 이벤트
  document.dispatchEvent(new Event('handover_updated'));
  
  return true;
}

// 새 인수인계 모달 표시
function showNewHandoverModal() {
  // 폼 생성
  let formContent = `
    <form id="newHandoverForm" class="edit-form">
      <div class="form-group">
        <label>제목</label>
        <input type="text" name="title" class="form-control" required>
      </div>
      
      <div class="form-group">
        <label>내용</label>
        <textarea name="content" class="form-control" rows="5" required></textarea>
      </div>
      
      <div class="form-check">
        <input type="checkbox" name="is_notice" id="isNoticeCheck" class="form-check-input">
        <label for="isNoticeCheck" class="form-check-label">공지사항으로 등록</label>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">저장</button>
        <button type="button" class="btn btn-secondary" data-close-modal>취소</button>
      </div>
    </form>
  `;
  
  // 모달 제목과 내용 설정
  setModalContent('newHandoverModal', '새 인수인계 작성', formContent);
  
  // 모달 열기
  openModal('newHandoverModal');
}

// 인수인계 수정 모달 표시
function showEditHandoverModal(handoverId) {
  // ID로 인수인계 정보 가져오기
  const handover = findHandoverById(handoverId);
  
  if (!handover) {
    showError(`인수인계 정보를 찾을 수 없습니다: ${handoverId}`);
    return;
  }
  
  // 폼 생성
  let formContent = `
    <form id="editHandoverForm" class="edit-form">
      <input type="hidden" name="handover_id" value="${handover.handover_id}">
      
      <div class="form-group">
        <label>제목</label>
        <input type="text" name="title" value="${handover.title || ''}" class="form-control" required>
      </div>
      
      <div class="form-group">
        <label>내용</label>
        <textarea name="content" class="form-control" rows="5" required>${handover.content || ''}</textarea>
      </div>
      
      <div class="form-check">
        <input type="checkbox" name="is_notice" id="isNoticeCheck" class="form-check-input" ${handover.is_notice ? 'checked' : ''}>
        <label for="isNoticeCheck" class="form-check-label">공지사항으로 등록</label>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">저장</button>
        <button type="button" class="btn btn-secondary" data-close-modal>취소</button>
      </div>
    </form>
  `;
  
  // 모달 제목과 내용 설정
  setModalContent('editHandoverModal', '인수인계 수정', formContent);
  
  // 모달 열기
  openModal('editHandoverModal');
}

// 모달 폼 제출 이벤트 설정
function setupHandoverForms() {
  // 이벤트 위임을 사용하여 문서 레벨에서 폼 제출 처리
  document.addEventListener('submit', (e) => {
    // 새 인수인계 폼
    if (e.target.id === 'newHandoverForm') {
      e.preventDefault();
      
      // 폼 데이터 수집
      const formData = new FormData(e.target);
      
      // 인수인계 데이터 객체 생성
      const handoverData = {
        title: formData.get('title'),
        content: formData.get('content'),
        is_notice: formData.get('is_notice') === 'on'
      };
      
      // 인수인계 추가
      if (addHandover(handoverData)) {
        showSuccess('인수인계가 등록되었습니다.');
        closeModal('newHandoverModal');
        renderHandoverTable(); // 테이블 갱신
      } else {
        showError('인수인계 등록 중 오류가 발생했습니다.');
      }
    }
    
    // 인수인계 수정 폼
    if (e.target.id === 'editHandoverForm') {
      e.preventDefault();
      
      // 폼 데이터 수집
      const formData = new FormData(e.target);
      const handoverId = formData.get('handover_id');
      
      // 업데이트 데이터 객체 생성
      const updateData = {
        title: formData.get('title'),
        content: formData.get('content'),
        is_notice: formData.get('is_notice') === 'on'
      };
      
      // 인수인계 업데이트
      if (updateHandover(handoverId, updateData)) {
        showSuccess('인수인계가 성공적으로 업데이트되었습니다.');
        closeModal('editHandoverModal');
        renderHandoverTable(); // 테이블 갱신
      } else {
        showError('인수인계 업데이트 중 오류가 발생했습니다.');
      }
    }
  });
}

// 페이지 로드 시 인수인계 초기화
document.addEventListener('DOMContentLoaded', initHandover);

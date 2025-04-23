/**
 * 인수인계 페이지 JavaScript
 */

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function () {
  setupFilterForm();
  setupDateRangeToggle();
  setupHandoverForm();
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

// 날짜 범위 설정에 따라 커스텀 날짜 입력 표시/숨김
function setupDateRangeToggle() {
  const dateRangeSelect = document.getElementById('date_range');
  const dateInputs = document.getElementById('dateInputs');

  if (!dateRangeSelect || !dateInputs) return;

  // 초기 상태 설정
  if (dateRangeSelect.value === 'custom') {
    dateInputs.style.display = 'flex';
  } else {
    dateInputs.style.display = 'none';
  }

  // 변경 이벤트 리스너
  dateRangeSelect.addEventListener('change', function () {
    if (this.value === 'custom') {
      dateInputs.style.display = 'flex';
    } else {
      dateInputs.style.display = 'none';
    }
  });
}

// 인수인계 폼 설정
function setupHandoverForm() {
  const handoverForm = document.getElementById('handoverForm');
  if (!handoverForm) return;

  handoverForm.addEventListener('submit', function (e) {
    e.preventDefault();
    submitHandover(this);
  });
}

// 필터 초기화
function resetFilters() {
  window.location.href = window.location.pathname;
}

// 인수인계 작성 모달 열기
function openCreateModal() {
  const modal = document.getElementById('handoverCreateModal');
  if (!modal) return;

  // 폼 초기화
  const form = document.getElementById('handoverForm');
  if (form) {
    form.reset();
    document.getElementById('handoverId').value = '';
  }

  // 모달 표시
  modal.style.display = 'block';

  // 락 설정 요청
  requestLock(null, 'create');
}

// 인수인계 상세 보기
function viewHandover(id) {
  apiRequest(`/handover/${id}`)
    .then((result) => {
      if (result.success) {
        displayHandoverDetail(result.data);
      } else {
        showError(result.message || '인수인계 정보를 불러올 수 없습니다.');
      }
    })
    .catch((error) => {
      showError('인수인계 정보를 불러오는 중 오류가 발생했습니다.');
      console.error('인수인계 상세 정보 조회 오류:', error);
    });
}

// 인수인계 수정 모달 열기
function editHandover(id) {
  apiRequest(`/handover/${id}`)
    .then((result) => {
      if (result.success) {
        openEditModal(result.data);
      } else {
        showError(result.message || '인수인계 정보를 불러올 수 없습니다.');
      }
    })
    .catch((error) => {
      showError('인수인계 정보를 불러오는 중 오류가 발생했습니다.');
      console.error('인수인계 정보 조회 오류:', error);
    });
}

// 수정 모달 열기
function openEditModal(data) {
  const modal = document.getElementById('handoverCreateModal');
  if (!modal) return;

  // 폼에 데이터 채우기
  const form = document.getElementById('handoverForm');
  if (form) {
    document.getElementById('handoverId').value = data.id;
    document.getElementById('title').value = data.title;
    document.getElementById('content').value = data.content;
  }

  // 모달 헤더 변경
  const header = modal.querySelector('.modal-header h2');
  if (header) {
    header.textContent = '인수인계 수정';
  }

  // 모달 표시
  modal.style.display = 'block';

  // 락 설정 요청
  requestLock(data.id, 'edit');
}

// 인수인계 상세 정보 표시
function displayHandoverDetail(handover) {
  const modal = document.getElementById('handoverDetailModal');
  const content = document.getElementById('handoverDetailContent');

  if (!modal || !content) return;

  // 상세 정보 HTML 생성
  content.innerHTML = `
        <div class="handover-detail">
            <div class="handover-detail-header">
                <h3 class="handover-title">${handover.title}</h3>
                <div class="handover-meta">
                    <div>작성자: ${handover.writer}</div>
                    <div>작성일시: ${handover.created_at}</div>
                    <div>최종수정: ${
                      handover.updated_at || handover.created_at
                    }</div>
                </div>
            </div>
            <div class="handover-content">
                ${formatContent(handover.content)}
            </div>
        </div>
    `;

  // 모달 표시
  modal.style.display = 'block';
}

// 내용 형식화 (줄바꿈 유지)
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
  return escaped.replace(/\n/g, '<br>');
}

// 인수인계 저장
function submitHandover(form) {
  const formData = formToJson(form);
  const isUpdate = !!formData.id;
  const url = isUpdate ? `/handover/${formData.id}` : '/handover';
  const method = isUpdate ? 'PUT' : 'POST';

  apiRequest(url, method, formData)
    .then((result) => {
      if (result.success) {
        alert(
          isUpdate ? '인수인계가 수정되었습니다.' : '인수인계가 등록되었습니다.'
        );
        closeModal();
        // 락 해제 요청
        if (isUpdate) {
          releaseLock(formData.id);
        }
        // 페이지 새로고침
        window.location.reload();
      } else {
        showError(result.message || '처리 중 오류가 발생했습니다.');
      }
    })
    .catch((error) => {
      showError('처리 중 오류가 발생했습니다.');
      console.error('인수인계 저장 오류:', error);
    });
}

// 락 설정 요청
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

// 락 해제 요청
function releaseLock(id) {
  apiRequest(`/handover/${id}/lock`, 'DELETE').catch((error) => {
    console.error('락 해제 오류:', error);
  });
}

// 락 메시지 표시
function showLockMessage(lockedBy, expiresAt) {
  const form = document.getElementById('handoverForm');
  if (!form) return;

  // 폼 앞에 메시지 추가
  const lockMessage = document.createElement('div');
  lockMessage.className = 'lock-message';

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

  lockMessage.innerHTML = `
        <i class="lock-icon"></i>
        <span>현재 ${
          lockedBy || '다른 사용자'
        }가 편집 중입니다. ${expireText}</span>
    `;

  form.parentNode.insertBefore(lockMessage, form);
}

// 폼 비활성화
function disableForm() {
  const form = document.getElementById('handoverForm');
  if (!form) return;

  // 모든 입력 필드 비활성화
  form
    .querySelectorAll('input, textarea, select, button[type="submit"]')
    .forEach((el) => {
      el.disabled = true;
    });
}

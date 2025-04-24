/**
 * 사용자 관리 테이블 관련 JS
 */

/**
 * 사용자 테이블 초기화 및 이벤트 바인딩
 */
function initUserTable() {
  // 체크박스 이벤트 설정
  setupCheckboxes();
  
  // 테이블 행 클릭 이벤트 설정
  setupRowClick();
  
  // 정렬 이벤트 설정
  setupSorting();
}

/**
 * 체크박스 관련 이벤트 설정
 */
function setupCheckboxes() {
  // 전체 선택 체크박스
  const selectAllCheckbox = document.getElementById('select-all');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      const isChecked = this.checked;
      const checkboxes = document.querySelectorAll('table.user-table tbody input[type="checkbox"]');
      
      checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
      });
      
      updateSelectedCount();
      toggleBulkActions();
    });
  }
  
  // 개별 체크박스
  const checkboxes = document.querySelectorAll('table.user-table tbody input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      updateSelectedCount();
      toggleBulkActions();
      
      // 전체 선택 체크박스 상태 업데이트
      if (selectAllCheckbox) {
        const allChecked = document.querySelectorAll('table.user-table tbody input[type="checkbox"]:checked').length === checkboxes.length;
        selectAllCheckbox.checked = allChecked;
      }
    });
  });
}

/**
 * 선택된 항목 개수 업데이트
 */
function updateSelectedCount() {
  const selectedCount = document.querySelectorAll('table.user-table tbody input[type="checkbox"]:checked').length;
  const countElement = document.getElementById('selected-count');
  
  if (countElement) {
    countElement.textContent = selectedCount;
    
    // 선택 정보 표시/숨김
    const selectionInfo = document.querySelector('.selection-info');
    if (selectionInfo) {
      selectionInfo.style.display = selectedCount > 0 ? 'flex' : 'none';
    }
  }
}

/**
 * 일괄 작업 버튼 활성화/비활성화
 */
function toggleBulkActions() {
  const selectedCount = document.querySelectorAll('table.user-table tbody input[type="checkbox"]:checked').length;
  const bulkActionButtons = document.querySelectorAll('.bulk-action-btn');
  
  bulkActionButtons.forEach(button => {
    button.disabled = selectedCount === 0;
    button.classList.toggle('disabled', selectedCount === 0);
  });
}

/**
 * 테이블 행 클릭 이벤트 설정
 */
function setupRowClick() {
  const rows = document.querySelectorAll('table.user-table tbody tr');
  
  rows.forEach(row => {
    row.addEventListener('click', function(e) {
      // 체크박스 영역 클릭 시 행 선택 동작 방지
      if (e.target.type === 'checkbox' || e.target.closest('td').querySelector('input[type="checkbox"]')) {
        return;
      }
      
      const userId = this.dataset.userId;
      if (userId) {
        viewUserDetail(userId);
      }
    });
  });
}

/**
 * 사용자 상세 정보 모달 표시
 * @param {string} userId - 사용자 ID
 */
function viewUserDetail(userId) {
  if (window.Utils && window.Utils.showModal) {
    window.Utils.showModal('사용자 상세 정보 로드 중...');
    
    // 사용자 상세 정보 조회
    window.Api.getUserDetail(userId)
      .then(response => {
        if (response.success) {
          const user = response.data || response;
          
          // 모달 내용 업데이트
          const modalContent = `
            <div class="user-detail">
              <div class="user-detail-header">
                <h3>${user.user_name} (${user.user_id})</h3>
                <span class="badge ${user.user_status === 'ACTIVE' ? 'status-active' : 'status-inactive'}">
                  ${user.user_status === 'ACTIVE' ? '활성' : '비활성'}
                </span>
              </div>
              
              <div class="user-detail-body">
                <div class="detail-row">
                  <div class="detail-label">부서</div>
                  <div class="detail-value">${user.user_department}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">권한</div>
                  <div class="detail-value">${user.user_role === 'ADMIN' ? '관리자' : '일반 사용자'}</div>
                </div>
              </div>
              
              <div class="user-detail-actions">
                <button class="btn btn-primary edit-user-btn" onclick="editUser('${user.user_id}')">
                  <i class="fas fa-edit"></i> 수정
                </button>
                <button class="btn btn-warning reset-pwd-btn" onclick="confirmResetPassword('${user.user_id}')">
                  <i class="fas fa-key"></i> 비밀번호 초기화
                </button>
                <button class="btn ${user.user_status === 'ACTIVE' ? 'btn-danger' : 'btn-success'} toggle-status-btn" 
                  onclick="confirmToggleStatus('${user.user_id}', '${user.user_status}')">
                  <i class="fas ${user.user_status === 'ACTIVE' ? 'fa-ban' : 'fa-check'}"></i> 
                  ${user.user_status === 'ACTIVE' ? '비활성화' : '활성화'}
                </button>
              </div>
            </div>
          `;
          
          window.Utils.updateModalContent(modalContent);
        } else {
          window.Utils.showAlert('사용자 정보를 불러오는데 실패했습니다.', 'error');
          window.Utils.closeModal();
        }
      })
      .catch(error => {
        window.Utils.showAlert('사용자 정보를 불러오는데 실패했습니다: ' + error.message, 'error');
        window.Utils.closeModal();
      });
  }
}

/**
 * 테이블 정렬 이벤트 설정
 */
function setupSorting() {
  const sortableHeaders = document.querySelectorAll('table.user-table th[data-sort]');
  
  sortableHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const sortKey = this.dataset.sort;
      const currentOrder = this.dataset.order || 'none';
      let newOrder = 'asc';
      
      // 정렬 순서 변경: none -> asc -> desc -> none
      if (currentOrder === 'asc') {
        newOrder = 'desc';
      } else if (currentOrder === 'desc') {
        newOrder = 'none';
      }
      
      // 모든 헤더의 정렬 상태 초기화
      sortableHeaders.forEach(h => {
        h.dataset.order = 'none';
        h.querySelector('.sort-icon').className = 'sort-icon fas fa-sort';
      });
      
      // 현재 헤더의 정렬 상태 설정
      this.dataset.order = newOrder;
      
      const iconElement = this.querySelector('.sort-icon');
      if (newOrder === 'asc') {
        iconElement.className = 'sort-icon fas fa-sort-up';
      } else if (newOrder === 'desc') {
        iconElement.className = 'sort-icon fas fa-sort-down';
      } else {
        iconElement.className = 'sort-icon fas fa-sort';
      }
      
      // 정렬 실행
      sortUserTable(sortKey, newOrder);
    });
  });
}

/**
 * 테이블 정렬 실행
 * @param {string} sortKey - 정렬 기준 필드
 * @param {string} order - 정렬 순서 (asc, desc, none)
 */
function sortUserTable(sortKey, order) {
  const tbody = document.querySelector('table.user-table tbody');
  if (!tbody) return;
  
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  if (order === 'none') {
    // 원래 순서로 돌아가기 (페이지 새로고침)
    window.location.reload();
    return;
  }
  
  // 정렬
  rows.sort((a, b) => {
    let aValue = a.querySelector(`td[data-${sortKey}]`).dataset[sortKey] || '';
    let bValue = b.querySelector(`td[data-${sortKey}]`).dataset[sortKey] || '';
    
    // 숫자 형식이면 숫자로 변환
    if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
      aValue = Number(aValue);
      bValue = Number(bValue);
    }
    
    let compareResult;
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      compareResult = aValue - bValue;
    } else {
      compareResult = String(aValue).localeCompare(String(bValue));
    }
    
    return order === 'asc' ? compareResult : -compareResult;
  });
  
  // 정렬된 행을 테이블에 다시 추가
  rows.forEach(row => tbody.appendChild(row));
}

// 페이지 로드 시 테이블 초기화
document.addEventListener('DOMContentLoaded', function() {
  initUserTable();
});

// 전역 함수로 내보내기
window.UserTable = {
  init: initUserTable,
  sortTable: sortUserTable,
  viewDetail: viewUserDetail
};
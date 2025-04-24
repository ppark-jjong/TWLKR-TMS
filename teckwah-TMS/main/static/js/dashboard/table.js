/**
 * 대시보드 테이블 관련 기능
 */

/**
 * 테이블 컬럼 선택기 초기화
 */
function initializeColumnSelector() {
  const columnSelectorBtn = document.getElementById('columnSelectorBtn');
  const columnSelectorDropdown = document.getElementById('columnSelectorDropdown');
  const columnSelectorContent = document.getElementById('columnSelectorContent');
  
  if (columnSelectorBtn && columnSelectorDropdown && columnSelectorContent) {
    console.log('Column selector components found');
    
    // 컬럼 셀렉터 초기화 (내용 비우기)
    columnSelectorContent.innerHTML = '';
    
    // 컬럼 정보 설정
    const columns = [
      { key: 'orderNo', label: '주문번호' },
      { key: 'type', label: '유형' },
      { key: 'status', label: '상태' },
      { key: 'department', label: '부서' },
      { key: 'customer', label: '고객명' },
      { key: 'address', label: '주소' },
      { key: 'eta', label: 'ETA' },
      { key: 'createTime', label: '접수시간' },
      { key: 'driverName', label: '기사명' }
    ];
    
    // 로컬 스토리지에서 저장된 컬럼 설정 불러오기
    let visibleColumns = [];
    try {
      visibleColumns = Utils.loadFromLocalStorage('dashboardVisibleColumns') || columns.map(col => col.key);
      console.log('Loaded visible columns:', visibleColumns);
    } catch (error) {
      console.error('컬럼 설정 로드 오류:', error);
      visibleColumns = columns.map(col => col.key); // 기본값: 모든 컬럼 표시
    }
    
    // 컬럼 선택기 체크박스 생성
    columns.forEach(column => {
      const checkboxDiv = document.createElement('div');
      checkboxDiv.className = 'column-checkbox';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `column_${column.key}`;
      checkbox.value = column.key;
      checkbox.checked = visibleColumns.includes(column.key);
      
      const label = document.createElement('label');
      label.htmlFor = `column_${column.key}`;
      label.textContent = column.label;
      
      checkboxDiv.appendChild(checkbox);
      checkboxDiv.appendChild(label);
      columnSelectorContent.appendChild(checkboxDiv);
      
      // 체크박스 변경 이벤트
      checkbox.addEventListener('change', function() {
        updateVisibleColumns();
      });
    });
    
    // 컬럼 선택기 토글
    columnSelectorBtn.addEventListener('click', function(event) {
      event.stopPropagation();
      
      // 현재 표시 상태 확인 및 토글
      const isVisible = columnSelectorDropdown.style.display === 'block';
      columnSelectorDropdown.style.display = isVisible ? 'none' : 'block';
      
      console.log('Column selector dropdown toggled:', !isVisible);
    });
    
    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', function(event) {
      if (!columnSelectorBtn.contains(event.target) && !columnSelectorDropdown.contains(event.target)) {
        if (columnSelectorDropdown.style.display === 'block') {
          columnSelectorDropdown.style.display = 'none';
          console.log('Column selector dropdown closed (outside click)');
        }
      }
    });
    
    // 초기 컬럼 가시성 적용
    applyColumnVisibility(visibleColumns);
  }
}

/**
 * 보이는 컬럼 업데이트
 */
function updateVisibleColumns() {
  const checkboxes = document.querySelectorAll('.column-checkbox input[type="checkbox"]');
  const visibleColumns = Array.from(checkboxes)
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);
  
  // 로컬 스토리지에 저장
  Utils.saveToLocalStorage('dashboardVisibleColumns', visibleColumns);
  
  // 테이블에 적용
  applyColumnVisibility(visibleColumns);
}

/**
 * 테이블 컬럼 가시성 적용
 */
function applyColumnVisibility(visibleColumns) {
  const table = document.getElementById('orderTable');
  if (!table) {
    console.error('주문 테이블을 찾을 수 없습니다');
    return;
  }
  
  console.log('컬럼 가시성 적용:', visibleColumns);
  
  // 모든 컬럼에 대해 처리
  const columnClasses = [
    'column-order-no', 
    'column-type', 
    'column-status', 
    'column-department', 
    'column-customer', 
    'column-address', 
    'column-eta', 
    'column-create-time', 
    'column-driver'
  ];
  
  const columnKeys = [
    'orderNo', 
    'type', 
    'status', 
    'department', 
    'customer', 
    'address', 
    'eta', 
    'createTime', 
    'driverName'
  ];
  
  // 각 컬럼에 대해 visibility 처리
  columnKeys.forEach((key, index) => {
    const columnClass = columnClasses[index];
    const cells = table.querySelectorAll(`.${columnClass}`);
    const isVisible = visibleColumns.includes(key);
    
    console.log(`컬럼 '${key}' (클래스: ${columnClass}): ${cells.length}개 셀 찾음, 표시 여부: ${isVisible}`);
    
    if (cells.length === 0) {
      console.warn(`컬럼 '${key}'에 해당하는 셀을 찾을 수 없습니다`);
    }
    
    cells.forEach(cell => {
      // 이전 상태와 새 상태가 다를 때만 콘솔 출력 (불필요한 로깅 방지)
      const wasVisible = cell.style.display !== 'none';
      if (wasVisible !== isVisible) {
        console.log(`컬럼 '${key}' 셀 표시 상태 변경: ${wasVisible} → ${isVisible}`);
      }
      
      cell.style.display = isVisible ? '' : 'none';
    });
  });
  
  console.log('컬럼 가시성 적용 완료');
}

/**
 * 체크박스 초기화
 */
function initializeCheckboxes() {
  try {
    console.log('체크박스 초기화 시작...');
    
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    const selectedActions = document.getElementById('selectedActions');
    const selectedCount = document.getElementById('selectedCount');
    
    console.log(`체크박스 초기화: 전체 선택 체크박스 ${selectAllCheckbox ? '발견' : '없음'}, 행 체크박스 ${rowCheckboxes.length}개 발견`);
    
    // 초기 선택 상태 업데이트
    updateSelectedCount();
    
    // 선택된 항목 수 확인 및 액션 패널 표시
    function updateSelectedCount() {
      const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
      
      console.log(`선택된 항목 수 업데이트: ${checkedCount}개 선택됨`);
      
      if (selectedCount) {
        selectedCount.textContent = `${checkedCount}개 주문 선택됨`;
      }
      
      if (selectedActions) {
        if (checkedCount > 0) {
          selectedActions.style.display = 'flex';
          console.log('액션 패널 표시');
          
          // 버튼 활성화
          const statusChangeBtn = document.getElementById('statusChangeBtn');
          const driverAssignBtn = document.getElementById('driverAssignBtn');
          const deleteOrderBtn = document.getElementById('deleteOrderBtn');
          
          if (statusChangeBtn) statusChangeBtn.disabled = false;
          if (driverAssignBtn) driverAssignBtn.disabled = false;
          if (deleteOrderBtn) deleteOrderBtn.disabled = false;
          
          // 모달 카운트 업데이트
          const statusChangeCount = document.getElementById('statusChangeCount');
          const driverAssignCount = document.getElementById('driverAssignCount');
          const deleteOrderCount = document.getElementById('deleteOrderCount');
          
          if (statusChangeCount) statusChangeCount.textContent = checkedCount;
          if (driverAssignCount) driverAssignCount.textContent = checkedCount;
          if (deleteOrderCount) deleteOrderCount.textContent = checkedCount;
        } else {
          selectedActions.style.display = 'none';
          console.log('액션 패널 숨김');
          
          // 버튼 비활성화
          const statusChangeBtn = document.getElementById('statusChangeBtn');
          const driverAssignBtn = document.getElementById('driverAssignBtn');
          const deleteOrderBtn = document.getElementById('deleteOrderBtn');
          
          if (statusChangeBtn) statusChangeBtn.disabled = true;
          if (driverAssignBtn) driverAssignBtn.disabled = true;
          if (deleteOrderBtn) deleteOrderBtn.disabled = true;
        }
      }
      
      // 전체 선택 체크박스 상태 업데이트
      if (selectAllCheckbox && rowCheckboxes.length > 0) {
        if (checkedCount === 0) {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === rowCheckboxes.length) {
          selectAllCheckbox.checked = true;
          selectAllCheckbox.indeterminate = false;
        } else {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = true;
        }
      }
    }
    
    // 전체 선택 체크박스 이벤트
    if (selectAllCheckbox) {
      // 기존 이벤트 리스너 제거 (중복 방지)
      selectAllCheckbox.removeEventListener('change', handleSelectAllChange);
      
      // 새 이벤트 리스너 추가
      selectAllCheckbox.addEventListener('change', handleSelectAllChange);
      
      function handleSelectAllChange() {
        const isChecked = this.checked;
        console.log(`전체 선택 체크박스 변경: ${isChecked ? '선택됨' : '선택 해제'}`);
        
        rowCheckboxes.forEach(checkbox => {
          checkbox.checked = isChecked;
        });
        
        updateSelectedCount();
      }
    }
    
    // 행 체크박스 이벤트
    rowCheckboxes.forEach(checkbox => {
      // 기존 이벤트 리스너 제거 (중복 방지)
      checkbox.removeEventListener('change', handleRowCheckboxChange);
      checkbox.removeEventListener('click', handleRowCheckboxClick);
      
      // 새 이벤트 리스너 추가
      checkbox.addEventListener('change', handleRowCheckboxChange);
      checkbox.addEventListener('click', handleRowCheckboxClick);
      
      function handleRowCheckboxChange() {
        console.log(`행 체크박스 변경: ID ${this.getAttribute('data-id')}, ${this.checked ? '선택됨' : '선택 해제'}`);
        updateSelectedCount();
      }
      
      function handleRowCheckboxClick(event) {
        // 클릭 이벤트 전파 방지
        event.stopPropagation();
      }
    });
    
    console.log('체크박스 초기화 완료');
    
    // 전역으로 함수 노출
    window.DashboardTable.updateSelectedCount = updateSelectedCount;
    
  } catch (error) {
    console.error('체크박스 초기화 중 오류 발생:', error);
  }
}

/**
 * 테이블 이벤트 등록
 */
function registerTableEvents() {
  try {
    console.log('테이블 이벤트 등록 시작...');
    
    // 체크박스 이벤트
    initializeCheckboxes();
    
    // 주문 상세 보기 버튼 클릭
    const viewButtons = document.querySelectorAll('.view-btn');
    console.log(`상세 보기 버튼 ${viewButtons.length}개 발견`);
    
    viewButtons.forEach(button => {
      // 기존 이벤트 리스너 제거 (중복 방지)
      button.removeEventListener('click', handleViewButtonClick);
      
      // 새 이벤트 리스너 추가
      button.addEventListener('click', handleViewButtonClick);
      
      function handleViewButtonClick(event) {
        event.stopPropagation();
        const orderId = this.getAttribute('data-id');
        console.log(`상세 보기 버튼 클릭됨: ID ${orderId}`);
        
        if (orderId) {
          DashboardModals.openOrderDetailModal(orderId);
        }
      }
    });
    
    // 주문 편집 버튼 클릭
    const editButtons = document.querySelectorAll('.edit-btn');
    console.log(`편집 버튼 ${editButtons.length}개 발견`);
    
    editButtons.forEach(button => {
      // 기존 이벤트 리스너 제거 (중복 방지)
      button.removeEventListener('click', handleEditButtonClick);
      
      // 새 이벤트 리스너 추가
      button.addEventListener('click', handleEditButtonClick);
      
      function handleEditButtonClick(event) {
        event.stopPropagation();
        const orderId = this.getAttribute('data-id');
        console.log(`편집 버튼 클릭됨: ID ${orderId}`);
        
        if (orderId) {
          DashboardModals.openOrderEditModal(orderId);
        }
      }
    });
    
    // 행 클릭 이벤트
    const rows = document.querySelectorAll('#orderTable tbody tr');
    console.log(`테이블 행 ${rows.length}개 발견`);
    
    rows.forEach(row => {
      // 기존 이벤트 리스너 제거 (중복 방지)
      row.removeEventListener('click', handleRowClick);
      
      // 새 이벤트 리스너 추가
      row.addEventListener('click', handleRowClick);
      
      function handleRowClick(event) {
        // 체크박스 영역 클릭 시 상세 정보 표시하지 않음
        if (event.target.type === 'checkbox' || 
            event.target.closest('.checkbox-column') ||
            event.target.closest('.row-checkbox')) {
          return;
        }
        
        if (!this.classList.contains('no-data-row')) {
          const orderId = this.getAttribute('data-id');
          console.log(`행 클릭됨: ID ${orderId}`);
          
          if (orderId) {
            try {
              // 클릭한 행에 시각적 효과 추가
              this.classList.add('clicked-row');
              
              // 상세 정보 모달 열기
              DashboardModals.openOrderDetailModal(orderId);
              
              // 효과 제거 (0.5초 후)
              setTimeout(() => {
                this.classList.remove('clicked-row');
              }, 500);
            } catch (error) {
              console.error(`행 클릭 처리 중 오류: ${error.message}`);
              this.classList.remove('clicked-row');
              alert('주문 상세 정보를 불러오는 중 오류가 발생했습니다.');
            }
          }
        }
      }
    });
    
    console.log('테이블 이벤트 등록 완료');
  } catch (error) {
    console.error('테이블 이벤트 등록 중 오류 발생:', error);
  }
}

/**
 * 선택된 주문 ID 목록 가져오기
 * @returns {Array<number>} 선택된 주문 ID 배열
 */
function getSelectedOrderIds() {
  return Array.from(document.querySelectorAll('.row-checkbox:checked'))
    .map(checkbox => checkbox.getAttribute('data-id'));
}

// 전역 namespace에 등록
window.DashboardTable = {
  initializeColumnSelector,
  updateVisibleColumns,
  applyColumnVisibility,
  initializeCheckboxes,
  registerTableEvents,
  getSelectedOrderIds
};

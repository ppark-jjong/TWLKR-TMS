/**
 * 버튼 액션 관련 모듈
 * 대시보드 내 버튼 이벤트 처리 담당
 */
(function() {
  /**
   * 초기화 함수
   */
  function init() {
    console.log('[Dashboard.Actions] 액션 버튼 초기화 시작');
    
    // 중요 버튼 목록 정의
    const criticalButtons = [
      { 
        id: 'refreshBtn', 
        action: '새로고침', 
        handler: function() { 
          window.location.reload(); 
        } 
      },
      { 
        id: 'createOrderBtn', 
        action: '신규 등록', 
        handler: function() { 
          const modal = document.getElementById('createOrderModal');
          if (modal) Utils.showModal(modal);
        } 
      },
      { 
        id: 'todayBtn', 
        action: '오늘 이동', 
        handler: function() { 
          window.location.href = '/dashboard'; 
        } 
      },
      { 
        id: 'orderSearchBtn', 
        action: '주문 검색', 
        handler: function() { 
          if (Dashboard.modules.filter) {
            Dashboard.modules.filter.searchByOrderNo();
          }
        } 
      },
      { 
        id: 'resetFilterBtn', 
        action: '필터 초기화', 
        handler: function() { 
          if (Dashboard.modules.filter) {
            Dashboard.modules.filter.resetFilters();
          }
        } 
      },
      { 
        id: 'selectedStatusBtn', 
        action: '상태 변경', 
        handler: handleStatusChangeButton 
      },
      { 
        id: 'selectedDriverBtn', 
        action: '배차 처리', 
        handler: handleDriverAssignButton 
      },
      { 
        id: 'selectedDeleteBtn', 
        action: '삭제', 
        handler: handleDeleteButton 
      }
    ];
    
    // 모든 버튼에 이벤트 핸들러 등록
    criticalButtons.forEach(button => {
      const btnElement = document.getElementById(button.id);
      if (btnElement) {
        console.log(`[Dashboard.Actions] 버튼 "${button.id}" 이벤트 등록`);
        
        // 기존 이벤트 리스너 제거 (중복 방지)
        btnElement.removeEventListener('click', button.handler);
        
        // 새 이벤트 리스너 등록
        btnElement.addEventListener('click', function(event) {
          console.log(`[Dashboard.Actions] 버튼 클릭: ${button.action}`);
          button.handler.call(this, event);
        });
        
        // 디버깅용 속성 추가
        btnElement.setAttribute('data-initialized', 'true');
      } else {
        console.warn(`[Dashboard.Actions] 버튼 "${button.id}"를 찾을 수 없음`);
      }
    });
    
    // 모달 창 닫기 버튼들 (공통)
    document.querySelectorAll('.close-btn, [data-dismiss="modal"]').forEach(btn => {
      btn.addEventListener('click', function() {
        const modal = this.closest('.modal');
        if (modal) {
          console.log(`[Dashboard.Actions] 모달 닫기 버튼 클릭: ${modal.id || '이름 없음'}`);
          Utils.hideModal(modal);
        }
      });
    });
    
    // 기타 초기화
    initMisc();
    
    console.log('[Dashboard.Actions] 액션 버튼 초기화 완료');
    return true;
  }
  
  /**
   * 기타 초기화 작업
   */
  function initMisc() {
    console.log('[Dashboard.Actions] 기타 초기화');
    
    // 우편번호 입력 필드 이벤트 (4자리 → 5자리 변환)
    document.querySelectorAll('input[name="postalCode"]').forEach(input => {
      input.addEventListener('blur', function() {
        const postalCode = this.value.trim();
        if (postalCode.length === 4 && /^\d{4}$/.test(postalCode)) {
          this.value = Utils.formatPostalCode(postalCode);
        }
      });
    });
  }
  
  /**
   * 상태 변경 버튼 핸들러
   */
  function handleStatusChangeButton() {
    console.log('[Dashboard.Actions] 상태 변경 버튼 클릭');
    
    // 테이블 모듈 사용
    const selectedRows = Dashboard.modules.table ? 
      Dashboard.modules.table.getSelectedRows() : 
      getSelectedRows();
      
    if (selectedRows.length === 0) {
      Utils.showAlert('변경할 주문을 먼저 선택해주세요.', 'warning');
      return;
    }
    
    // 모달 모듈 사용
    if (Dashboard.modules.modal) {
      // 상태 옵션 업데이트 및 모달 표시
      const statusChangeModal = document.getElementById('statusChangeModal');
      if (statusChangeModal) {
        // 선택된 행 수 업데이트
        const statusChangeCount = document.getElementById('statusChangeCount');
        if (statusChangeCount) {
          statusChangeCount.textContent = selectedRows.length;
        }
        
        // 옵션 업데이트 및 모달 표시
        Dashboard.modules.modal.updateStatusOptions();
        Utils.showModal(statusChangeModal);
      }
    }
  }
  
  /**
   * 배차 처리 버튼 핸들러
   */
  function handleDriverAssignButton() {
    console.log('[Dashboard.Actions] 배차 처리 버튼 클릭');
    
    // 테이블 모듈 사용
    const selectedRows = Dashboard.modules.table ? 
      Dashboard.modules.table.getSelectedRows() : 
      getSelectedRows();
      
    if (selectedRows.length === 0) {
      Utils.showAlert('배차할 주문을 먼저 선택해주세요.', 'warning');
      return;
    }
    
    // 모달 모듈 사용
    const driverAssignModal = document.getElementById('driverAssignModal');
    if (driverAssignModal) {
      Utils.showModal(driverAssignModal);
      
      // 선택된 행 수 업데이트
      const driverAssignCount = document.getElementById('driverAssignCount');
      if (driverAssignCount) {
        driverAssignCount.textContent = selectedRows.length;
      }
    }
  }
  
  /**
   * 삭제 버튼 핸들러
   */
  function handleDeleteButton() {
    console.log('[Dashboard.Actions] 삭제 버튼 클릭');
    
    // 권한 확인
    const userRole = document.body.dataset.userRole || 'USER';
    if (userRole !== 'ADMIN') {
      Utils.showAlert('삭제 권한이 없습니다.', 'error');
      return;
    }
    
    // 테이블 모듈 사용
    const selectedRows = Dashboard.modules.table ? 
      Dashboard.modules.table.getSelectedRows() : 
      getSelectedRows();
      
    if (selectedRows.length === 0) {
      Utils.showAlert('삭제할 주문을 먼저 선택해주세요.', 'warning');
      return;
    }
    
    // 모달 모듈 사용
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    if (deleteConfirmModal) {
      Utils.showModal(deleteConfirmModal);
      
      // 선택된 행 수 업데이트
      const deleteOrderCount = document.getElementById('deleteOrderCount');
      if (deleteOrderCount) {
        deleteOrderCount.textContent = selectedRows.length;
      }
    }
  }
  
  /**
   * 선택된 행 ID 배열 반환 (테이블 모듈 없을 때 대체 함수)
   * @returns {Array<string>} - 선택된 행 ID 배열
   */
  function getSelectedRows() {
    const selectedCheckboxes = document.querySelectorAll('#orderTable tbody .row-checkbox:checked');
    return Array.from(selectedCheckboxes).map(checkbox => checkbox.dataset.id);
  }
  
  // 대시보드 모듈에 등록
  Dashboard.registerModule('actions', {
    init: init,
    handleStatusChangeButton: handleStatusChangeButton,
    handleDriverAssignButton: handleDriverAssignButton,
    handleDeleteButton: handleDeleteButton
  });
})();

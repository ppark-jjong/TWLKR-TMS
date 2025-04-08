/**
 * 공통 유틸리티 함수 모음
 */

// 날짜 관련 유틸리티
const DateUtils = (function() {
  /**
   * 오늘 날짜를 YYYY-MM-DD 형식의 문자열로 반환
   */
  function getCurrentDate() {
    const today = new Date();
    return formatDate(today);
  }
  
  /**
   * Date 객체를 YYYY-MM-DD 형식의 문자열로 변환
   */
  function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('유효하지 않은 날짜:', date);
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  /**
   * 날짜와 시간을 포맷팅
   */
  function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('ko-KR');
    } catch (e) {
      return dateStr;
    }
  }
  
  /**
   * YYYY-MM-DD 형식의 문자열을 Date 객체로 변환
   */
  function parseDate(dateString) {
    try {
      if (!dateString) return null;
      
      // YYYY-MM-DD 형식 확인
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        console.warn('날짜 형식이 올바르지 않습니다:', dateString);
        return null;
      }
      
      const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
      const date = new Date(year, month - 1, day);
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        console.warn('유효하지 않은 날짜:', dateString);
        return null;
      }
      
      return date;
    } catch (error) {
      console.error('날짜 파싱 오류:', error);
      return null;
    }
  }
  
  /**
   * 두 날짜 사이의 일수 계산
   */
  function daysBetween(date1, date2) {
    if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
      return 0;
    }
    
    // UTC 시간으로 변환하여 시간대 차이 제거
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    
    // 일수로 변환 (밀리초를 일로 변환)
    const diffDays = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
  
  return {
    getCurrentDate,
    formatDate,
    formatDateTime,
    parseDate,
    daysBetween
  };
})();

// 상태 유틸리티
const StatusUtils = (function() {
  // 상태 텍스트 매핑 (요청대로 5가지 상태로 제한)
  const statusText = {
    'PENDING': '대기',
    'IN_PROGRESS': '진행',
    'COMPLETE': '완료',
    'ISSUE': '이슈',
    'CANCEL': '취소'
  };
  
  // 상태 색상 클래스 매핑
  const statusColors = {
    'PENDING': 'bg-yellow',
    'IN_PROGRESS': 'bg-blue',
    'COMPLETE': 'bg-green',
    'ISSUE': 'bg-red',
    'CANCEL': 'bg-gray'
  };
  
  /**
   * 상태에 따른 텍스트 반환
   */
  function getStatusText(status) {
    return statusText[status] || status;
  }
  
  /**
   * 상태에 따른 색상 클래스 반환
   */
  function getStatusClass(status) {
    return statusColors[status] || 'bg-gray';
  }
  
  return {
    getStatusText,
    getStatusClass
  };
})();

// DOM 유틸리티
const DOMUtils = (function() {
  /**
   * HTML 특수문자 이스케이프
   * @param {string} text 이스케이프할 텍스트
   * @returns {string} 이스케이프된 텍스트
   */
  function escapeHTML(text) {
    if (!text) return '';
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }
  
  /**
   * 테이블 행 클릭 이벤트 위임
   * @param {HTMLElement} tableElement 테이블 요소
   * @param {Function} rowCallback 행 클릭 콜백
   * @param {Function} checkboxCallback 체크박스 클릭 콜백
   */
  function setupTableRowEvents(tableElement, rowCallback, checkboxCallback) {
    if (!tableElement) return;
    
    tableElement.addEventListener('click', (e) => {
      const target = e.target;
      
      // 체크박스 클릭 처리
      if (target.type === 'checkbox') {
        if (checkboxCallback) {
          const row = target.closest('tr');
          const itemId = row ? row.getAttribute('data-id') : null;
          checkboxCallback(target, itemId, e);
        }
        return;
      }
      
      // 행 클릭 처리
      const row = target.closest('tr');
      if (row) {
        const itemId = row.getAttribute('data-id');
        if (itemId && rowCallback) {
          rowCallback(itemId, row, e);
        }
      }
    });
  }
  
  /**
   * 체크박스 상태 업데이트
   * @param {HTMLElement} tableElement 테이블 요소
   * @param {Array} selectedItems 선택된 아이템 ID 배열
   */
  function updateCheckboxStates(tableElement, selectedItems) {
    if (!tableElement) return;
    
    const checkboxes = tableElement.querySelectorAll('input[type="checkbox"].row-checkbox');
    
    checkboxes.forEach((checkbox) => {
      const itemId = checkbox.getAttribute('data-id');
      checkbox.checked = selectedItems.includes(itemId);
    });
    
    // 전체 선택 체크박스 업데이트
    const selectAllCheckbox = tableElement.querySelector('#selectAll');
    if (selectAllCheckbox) {
      const visibleCheckboxes = tableElement.querySelectorAll('tbody input[type="checkbox"]');
      selectAllCheckbox.checked = 
        visibleCheckboxes.length > 0 && 
        Array.from(visibleCheckboxes).every(cb => cb.checked);
    }
  }
  
  return {
    escapeHTML,
    setupTableRowEvents,
    updateCheckboxStates
  };
})();

// 전역 객체로 내보내기
window.DateUtils = DateUtils;
window.StatusUtils = StatusUtils;
window.DOMUtils = DOMUtils;

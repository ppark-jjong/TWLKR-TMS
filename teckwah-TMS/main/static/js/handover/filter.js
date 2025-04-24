/**
 * 인수인계 페이지 필터 관련 JS
 */

/**
 * 인수인계 필터 초기화 및 이벤트 바인딩
 */
function initHandoverFilters() {
  // 검색 이벤트 설정
  setupSearchFilter();
  
  // 필터 토글 이벤트 설정
  setupFilterToggle();
  
  // 필터 초기화 이벤트 설정
  setupFilterReset();
}

/**
 * 검색 필터 설정
 */
function setupSearchFilter() {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.querySelector('.search-btn');
  
  if (searchInput && searchBtn) {
    // 검색 버튼 클릭 이벤트
    searchBtn.addEventListener('click', function() {
      searchHandovers();
    });
    
    // 엔터 키 이벤트
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        searchHandovers();
      }
    });
  }
}

/**
 * 인수인계 검색 실행
 */
function searchHandovers() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  const searchValue = searchInput.value.trim();
  
  // URL 생성
  let searchUrl = '/handover';
  if (searchValue) {
    searchUrl += `?search=${encodeURIComponent(searchValue)}`;
  }
  
  // 현재 페이지 파라미터 유지
  const urlParams = new URLSearchParams(window.location.search);
  const currentPage = urlParams.get('page');
  if (currentPage && searchValue) {
    searchUrl += `&page=${currentPage}`;
  } else if (currentPage) {
    searchUrl += `?page=${currentPage}`;
  }
  
  // 페이지 이동
  window.location.href = searchUrl;
}

/**
 * 필터 토글 설정
 */
function setupFilterToggle() {
  const filterToggles = document.querySelectorAll('.panel-toggle');
  
  filterToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const targetId = this.dataset.target || this.getAttribute('onclick')?.split("'")[1] || null;
      if (targetId) {
        togglePanel(this, targetId);
      }
    });
  });
}

/**
 * 패널 토글 실행
 * @param {HTMLElement} toggleElement - 토글 버튼 요소
 * @param {string} targetId - 대상 패널 ID
 */
function togglePanel(toggleElement, targetId) {
  const targetElement = document.querySelector(`.${targetId}`);
  
  if (targetElement) {
    // 패널 표시/숨김 토글
    targetElement.classList.toggle('panel-collapsed');
    
    // 아이콘 변경
    const iconElement = toggleElement.querySelector('i');
    if (iconElement) {
      if (targetElement.classList.contains('panel-collapsed')) {
        iconElement.className = 'fas fa-chevron-down';
      } else {
        iconElement.className = 'fas fa-chevron-up';
      }
    }
    
    // 패널 상태 저장 (localStorage)
    localStorage.setItem(`panel_${targetId}`, targetElement.classList.contains('panel-collapsed') ? 'collapsed' : 'expanded');
  }
}

/**
 * 필터 초기화 설정
 */
function setupFilterReset() {
  const resetBtn = document.getElementById('reset-filter-btn');
  
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      // 검색 입력 초기화
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = '';
      }
      
      // 페이지 새로고침 (모든 필터 제거)
      window.location.href = '/handover';
    });
  }
}

/**
 * 페이지 로드 시 패널 상태 복원
 */
function restorePanelStates() {
  const panels = document.querySelectorAll('.panel-content');
  
  panels.forEach(panel => {
    const panelId = panel.classList[1] || panel.classList[0];
    const savedState = localStorage.getItem(`panel_${panelId}`);
    
    if (savedState === 'collapsed') {
      panel.classList.add('panel-collapsed');
      
      // 토글 아이콘 업데이트
      const toggleElement = document.querySelector(`[data-target="${panelId}"]`) || 
                           document.querySelector(`[onclick*="${panelId}"]`);
      if (toggleElement) {
        const iconElement = toggleElement.querySelector('i');
        if (iconElement) {
          iconElement.className = 'fas fa-chevron-down';
        }
      }
    }
  });
}

/**
 * 필터에 따른 테이블 행 표시/숨김
 * @param {Object} filters - 적용할 필터 조건
 */
function filterHandoverTable(filters = {}) {
  const rows = document.querySelectorAll('.handover-table tbody tr:not(.no-results)');
  
  let visibleCount = 0;
  
  rows.forEach(row => {
    let visible = true;
    
    // 검색 필터 적용
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const title = row.querySelector('.title-cell')?.textContent?.toLowerCase() || '';
      
      if (!title.includes(searchLower)) {
        visible = false;
      }
    }
    
    // 공지사항/일반 인수인계 필터 적용
    if (filters.type !== undefined) {
      const isNotice = row.classList.contains('notice-row');
      if (filters.type === 'notice' && !isNotice) {
        visible = false;
      } else if (filters.type === 'handover' && isNotice) {
        visible = false;
      }
    }
    
    // 필터 결과 적용
    row.style.display = visible ? '' : 'none';
    
    if (visible) {
      visibleCount++;
    }
  });
  
  // 필터링 결과가 없을 경우 메시지 표시
  const noResultsRow = document.querySelector('.no-results');
  if (noResultsRow) {
    if (visibleCount === 0) {
      noResultsRow.style.display = '';
    } else {
      noResultsRow.style.display = 'none';
    }
  }
  
  return visibleCount;
}

// 페이지 로드 시 필터 초기화
document.addEventListener('DOMContentLoaded', function() {
  initHandoverFilters();
  restorePanelStates();
  
  // URL 파라미터 기반 필터 적용
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get('search');
  
  if (searchParam) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = searchParam;
    }
    
    // 클라이언트 측 필터링 (이미 서버에서 필터링되었으므로 불필요할 수 있음)
    // filterHandoverTable({ search: searchParam });
  }
});

// 전역 객체로 내보내기
window.HandoverFilter = {
  init: initHandoverFilters,
  search: searchHandovers,
  togglePanel: togglePanel,
  filterTable: filterHandoverTable
};
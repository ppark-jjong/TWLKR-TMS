/**
 * 페이지네이션 관련 공통 기능
 */

/**
 * 페이지네이션 초기화
 * @param {string} containerId - 페이지네이션 컨테이너 ID
 * @param {number} currentPage - 현재 페이지 번호
 * @param {number} totalPages - 전체 페이지 수
 * @param {Function} onPageChange - 페이지 변경 시 실행할 콜백 함수
 * @param {Object} options - 추가 옵션
 */
function initPagination(containerId, currentPage, totalPages, onPageChange, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // 옵션 기본값 설정
  const defaultOptions = {
    maxPageButtons: 5,
    showFirstLast: true,
    showPrevNext: true,
    showPageInfo: true,
    prevText: '<i class="fas fa-chevron-left"></i>',
    nextText: '<i class="fas fa-chevron-right"></i>',
    firstText: '<i class="fas fa-angle-double-left"></i>',
    lastText: '<i class="fas fa-angle-double-right"></i>',
    pageInfoTemplate: '총 ${total}개 항목 중 ${start}-${end} 표시',
    ellipsisText: '...'
  };
  
  const config = { ...defaultOptions, ...options };
  
  // 페이지 정보 설정
  const currentPageNumber = parseInt(currentPage) || 1;
  const totalPagesNumber = parseInt(totalPages) || 1;
  
  // 페이지 정보 표시
  if (config.showPageInfo) {
    const infoContainer = container.querySelector('.pagination-info');
    if (infoContainer) {
      const pageSize = options.pageSize || 10;
      const total = options.total || 0;
      const start = total > 0 ? (currentPageNumber - 1) * pageSize + 1 : 0;
      const end = Math.min(start + pageSize - 1, total);
      
      infoContainer.textContent = config.pageInfoTemplate
        .replace('${total}', total)
        .replace('${start}', start)
        .replace('${end}', end);
    }
  }
  
  // 페이지 번호 컨테이너
  const pageNumberContainer = container.querySelector('.page-number-container');
  if (!pageNumberContainer) return;
  
  // 기존 내용 제거
  pageNumberContainer.innerHTML = '';
  
  // 이전 버튼
  const prevBtn = container.querySelector('#prevPageBtn');
  if (prevBtn) {
    prevBtn.disabled = currentPageNumber <= 1;
    prevBtn.onclick = function() {
      if (currentPageNumber > 1) {
        onPageChange(currentPageNumber - 1);
      }
    };
  }
  
  // 다음 버튼
  const nextBtn = container.querySelector('#nextPageBtn');
  if (nextBtn) {
    nextBtn.disabled = currentPageNumber >= totalPagesNumber;
    nextBtn.onclick = function() {
      if (currentPageNumber < totalPagesNumber) {
        onPageChange(currentPageNumber + 1);
      }
    };
  }
  
  // 페이지 번호 버튼 생성
  renderPageNumbers(
    pageNumberContainer,
    currentPageNumber,
    totalPagesNumber,
    onPageChange,
    config
  );
}

/**
 * 페이지 번호 버튼 렌더링
 * @param {HTMLElement} container - 페이지 번호 버튼 컨테이너
 * @param {number} currentPage - 현재 페이지 번호
 * @param {number} totalPages - 전체 페이지 수
 * @param {Function} onPageChange - 페이지 변경 시 실행할 콜백 함수
 * @param {Object} config - 설정 옵션
 */
function renderPageNumbers(container, currentPage, totalPages, onPageChange, config) {
  // 보여줄 페이지 버튼 범위 계산
  const maxPageButtons = config.maxPageButtons;
  let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  
  // 페이지 범위 조정
  if (endPage - startPage + 1 < maxPageButtons) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }
  
  // 첫 페이지 버튼
  if (config.showFirstLast && startPage > 1) {
    const firstBtn = createPageButton('first', 1, currentPage === 1, config.firstText, onPageChange);
    container.appendChild(firstBtn);
    
    // 첫 페이지와 시작 페이지 사이에 간격이 있으면 줄임표 추가
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-ellipsis';
      ellipsis.innerHTML = config.ellipsisText;
      container.appendChild(ellipsis);
    }
  }
  
  // 페이지 번호 버튼
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = createPageButton('number', i, currentPage === i, i, onPageChange);
    container.appendChild(pageBtn);
  }
  
  // 마지막 페이지 버튼
  if (config.showFirstLast && endPage < totalPages) {
    // 마지막 페이지와 끝 페이지 사이에 간격이 있으면 줄임표 추가
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-ellipsis';
      ellipsis.innerHTML = config.ellipsisText;
      container.appendChild(ellipsis);
    }
    
    const lastBtn = createPageButton('last', totalPages, currentPage === totalPages, config.lastText, onPageChange);
    container.appendChild(lastBtn);
  }
}

/**
 * 페이지 버튼 생성
 * @param {string} type - 버튼 타입 ('first', 'prev', 'number', 'next', 'last')
 * @param {number} pageNum - 페이지 번호
 * @param {boolean} isActive - 활성화 여부
 * @param {string|number} text - 버튼 텍스트
 * @param {Function} onPageChange - 페이지 변경 시 실행할 콜백 함수
 * @returns {HTMLElement} 생성된 버튼 요소
 */
function createPageButton(type, pageNum, isActive, text, onPageChange) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `page-${type}-btn` + (isActive ? ' active' : '');
  button.innerHTML = text;
  button.setAttribute('aria-label', `Page ${pageNum}`);
  
  if (!isActive) {
    button.addEventListener('click', function() {
      onPageChange(pageNum);
    });
  }
  
  return button;
}

/**
 * URL 기반 페이지네이션 핸들러
 * @param {number} page - 이동할 페이지 번호
 */
function handleUrlPagination(page) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', page);
  window.location.href = url.toString();
}

/**
 * AJAX 기반 페이지네이션 핸들러
 * @param {string} url - 데이터 요청 URL
 * @param {number} page - 요청할 페이지 번호
 * @param {Function} onSuccess - 성공 시 실행할 콜백 함수
 * @param {Function} onError - 오류 시 실행할 콜백 함수
 */
async function handleAjaxPagination(url, page, onSuccess, onError) {
  try {
    // URL에 페이지 파라미터 추가
    const requestUrl = new URL(url, window.location.origin);
    requestUrl.searchParams.set('page', page);
    
    // 데이터 요청
    const response = await fetch(requestUrl.toString(), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 성공 시 콜백 실행
      if (onSuccess) onSuccess(result.data);
    } else {
      // 오류 시 콜백 실행
      if (onError) onError(result.message);
    }
  } catch (error) {
    // 오류 시 콜백 실행
    if (onError) onError(error.message);
  }
}

// 공개 API
window.Pagination = {
  init: initPagination,
  renderPageNumbers,
  createPageButton,
  handleUrlPagination,
  handleAjaxPagination
};

// 문서 로드 완료 시 페이지네이션 초기화
document.addEventListener('DOMContentLoaded', function() {
  // 페이지네이션 컨테이너 찾기
  const paginationContainers = document.querySelectorAll('.pagination[data-auto-init="true"]');
  
  paginationContainers.forEach(container => {
    // 데이터 속성에서 페이지네이션 정보 가져오기
    const currentPage = parseInt(container.getAttribute('data-current-page')) || 1;
    const totalPages = parseInt(container.getAttribute('data-total-pages')) || 1;
    const useAjax = container.getAttribute('data-use-ajax') === 'true';
    const ajaxUrl = container.getAttribute('data-ajax-url');
    const containerId = container.id;
    
    if (containerId) {
      // 페이지 변경 핸들러
      const onPageChange = useAjax
        ? (page) => {
            const callback = window[container.getAttribute('data-ajax-callback')];
            if (typeof callback === 'function') {
              handleAjaxPagination(ajaxUrl, page, callback);
            }
          }
        : handleUrlPagination;
      
      // 페이지네이션 초기화
      initPagination(containerId, currentPage, totalPages, onPageChange);
    }
  });
});

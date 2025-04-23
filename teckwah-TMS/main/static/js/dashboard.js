/**
 * 대시보드 페이지 JavaScript 메인 파일
 * 모든 대시보드 관련 모듈을 로드합니다.
 */

/**
 * 파일 로드 유틸리티
 * @param {string} filePath - 로드할 JS 파일 경로
 * @returns {Promise} - 스크립트 로드 Promise
 */
function loadScript(filePath) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = filePath;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * 모듈 로드
 * @param {Array<string>} modules - 로드할 모듈 경로 배열
 * @returns {Promise} - 모든 모듈 로드 Promise
 */
async function loadModules(modules) {
  for (const module of modules) {
    try {
      await loadScript(module);
    } catch (error) {
      console.error(`모듈 로드 오류: ${module}`, error);
    }
  }
}

// 대시보드 페이지에 필요한 모듈 로드
document.addEventListener('DOMContentLoaded', function() {
  const commonModules = [
    '/static/js/common/utils.js',
    '/static/js/common/api.js',
    '/static/js/common/modal.js',
    '/static/js/common/pagination.js'
  ];
  
  const dashboardModules = [
    '/static/js/dashboard/filter.js',
    '/static/js/dashboard/table.js',
    '/static/js/dashboard/modals.js',
    '/static/js/dashboard/actions.js',
    '/static/js/dashboard/init.js'
  ];
  
  // 모듈 로드 순서 중요: 공통 모듈 먼저, 그 다음 페이지 모듈
  loadModules([...commonModules, ...dashboardModules])
    .then(() => {
      console.log('대시보드 모듈 로딩 완료');
    })
    .catch(error => {
      console.error('대시보드 모듈 로딩 오류:', error);
    });
});

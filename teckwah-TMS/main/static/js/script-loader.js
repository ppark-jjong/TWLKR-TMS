/**
 * 스크립트 로더 유틸리티
 * JavaScript 파일의 동적 로딩 및 의존성 관리
 */
window.ScriptLoader = (function() {
  /**
   * 로드된 스크립트 캐시
   * @type {Object<string, boolean>}
   */
  const loadedScripts = {};
  
  /**
   * 로딩 중인 스크립트 캐시
   * @type {Object<string, Array<Function>>}
   */
  const loadingScripts = {};
  
  /**
   * 스크립트를 로드합니다.
   * @param {string} url - 스크립트 URL
   * @returns {Promise<void>} - 로드 완료 Promise
   */
  function load(url) {
    return new Promise((resolve, reject) => {
      // 이미 로드된 경우
      if (loadedScripts[url]) {
        resolve();
        return;
      }
      
      // 로딩 중인 경우 콜백 추가
      if (loadingScripts[url]) {
        loadingScripts[url].push({ resolve, reject });
        return;
      }
      
      // 로딩 상태 초기화
      loadingScripts[url] = [{ resolve, reject }];
      
      // 캐시 방지를 위한 타임스탬프 추가
      const cachedUrl = url.includes('?') ? 
        `${url}&v=${Date.now()}` : 
        `${url}?v=${Date.now()}`;
      
      // 스크립트 엘리먼트 생성
      const script = document.createElement('script');
      script.src = cachedUrl;
      script.async = true;
      
      // 로드 성공
      script.onload = function() {
        loadedScripts[url] = true;
        
        // 대기 중인 콜백 실행
        const callbacks = loadingScripts[url] || [];
        callbacks.forEach(callback => callback.resolve());
        
        // 로딩 상태 정리
        delete loadingScripts[url];
      };
      
      // 로드 실패
      script.onerror = function(error) {
        // 대기 중인 콜백에 오류 전달
        const callbacks = loadingScripts[url] || [];
        callbacks.forEach(callback => callback.reject(error));
        
        // 로딩 상태 정리
        delete loadingScripts[url];
        
        console.error(`스크립트 로드 실패: ${url}`, error);
      };
      
      // 문서에 스크립트 추가
      document.head.appendChild(script);
    });
  }
  
  /**
   * 여러 스크립트를 순차적으로 로드합니다.
   * @param {Array<string>} urls - 스크립트 URL 목록
   * @returns {Promise<void>} - 모든 스크립트 로드 완료 Promise
   */
  async function loadSequential(urls) {
    for (const url of urls) {
      await load(url);
    }
  }
  
  /**
   * 여러 스크립트를 병렬로 로드합니다.
   * @param {Array<string>} urls - 스크립트 URL 목록
   * @returns {Promise<void>} - 모든 스크립트 로드 완료 Promise
   */
  async function loadParallel(urls) {
    await Promise.all(urls.map(url => load(url)));
  }
  
  /**
   * 의존성 그룹을 로드합니다.
   * @param {Object} groups - 의존성 그룹 객체
   * @param {string|Array<string>} groupNames - 로드할 그룹 이름 또는 이름 목록
   * @returns {Promise<void>} - 모든 스크립트 로드 완료 Promise
   */
  async function loadDependencies(groups, groupNames) {
    // 단일 그룹 이름을 배열로 변환
    const names = Array.isArray(groupNames) ? groupNames : [groupNames];
    
    // 모든 그룹의 의존성 수집
    const dependencies = [];
    
    for (const name of names) {
      const group = groups[name];
      
      if (!group) {
        console.warn(`알 수 없는 의존성 그룹: ${name}`);
        continue;
      }
      
      // 의존 그룹 먼저 로드
      if (group.depends && group.depends.length > 0) {
        await loadDependencies(groups, group.depends);
      }
      
      // 스크립트 URL 추가
      if (group.scripts && group.scripts.length > 0) {
        dependencies.push(...group.scripts);
      }
    }
    
    // 의존성 로드 (순차 또는 병렬)
    if (dependencies.length > 0) {
      await loadParallel(dependencies);
    }
  }
  
  /**
   * 스크립트가 로드되었는지 확인합니다.
   * @param {string} url - 스크립트 URL
   * @returns {boolean} - 로드 여부
   */
  function isLoaded(url) {
    return !!loadedScripts[url];
  }
  
  // 공통 스크립트 의존성 정의
  const commonDependencies = {
    utils: {
      scripts: ['/static/js/common/utils.js']
    },
    api: {
      depends: ['utils'],
      scripts: ['/static/js/common/api.js']
    },
    auth: {
      depends: ['utils', 'api'],
      scripts: ['/static/js/common/auth.js'] 
    },
    alerts: {
      depends: ['utils'],
      scripts: ['/static/js/common/alerts.js']
    },
    modal: {
      depends: ['utils'],
      scripts: ['/static/js/common/modal.js']
    },
    pagination: {
      depends: ['utils'],
      scripts: ['/static/js/common/pagination.js']
    }
  };
  
  // 페이지별 의존성 정의
  const pageDependencies = {
    dashboard: {
      depends: ['utils', 'api', 'auth', 'alerts', 'modal', 'pagination'],
      scripts: [
        '/static/js/dashboard/filter.js',
        '/static/js/dashboard/table.js',
        '/static/js/dashboard/modals.js',
        '/static/js/dashboard/actions.js',
        '/static/js/dashboard/init.js',
        '/static/js/dashboard.js'
      ]
    },
    handover: {
      depends: ['utils', 'api', 'auth', 'alerts', 'modal'],
      scripts: ['/static/js/handover.js']
    },
    visualization: {
      depends: ['utils', 'api', 'auth', 'alerts'],
      scripts: ['/static/js/visualization.js']
    },
    users: {
      depends: ['utils', 'api', 'auth', 'alerts', 'modal'],
      scripts: ['/static/js/users.js']
    }
  };
  
  /**
   * 현재 페이지에 필요한 스크립트를 자동으로 로드합니다.
   */
  function loadPageScripts() {
    // 현재 페이지 경로에 따라 의존성 결정
    const path = window.location.pathname;
    
    if (path.includes('/dashboard')) {
      loadDependencies(pageDependencies, 'dashboard');
    } else if (path.includes('/handover')) {
      loadDependencies(pageDependencies, 'handover');
    } else if (path.includes('/visualization')) {
      loadDependencies(pageDependencies, 'visualization');
    } else if (path.includes('/users')) {
      loadDependencies(pageDependencies, 'users');
    } else {
      // 기본적으로 공통 모듈만 로드
      loadDependencies(commonDependencies, ['utils', 'api', 'auth', 'alerts']);
    }
  }
  
  // 공개 API
  return {
    load,
    loadSequential,
    loadParallel,
    loadDependencies,
    isLoaded,
    loadPageScripts,
    
    // 의존성 그룹 노출
    dependencies: {
      common: commonDependencies,
      page: pageDependencies
    }
  };
})();

// 페이지 로드 시 자동으로 스크립트 로드
document.addEventListener('DOMContentLoaded', function() {
  // 기본 의존성 로드 (코드 간소화를 위해 HTML에서 직접 로드하는 방식 사용)
  // ScriptLoader.loadPageScripts();
});

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
      // 디버깅용 로그
      console.log(`[ScriptLoader] 스크립트 로드 시도: ${url}`);
      
      // 이미 로드된 경우
      if (loadedScripts[url]) {
        console.log(`[ScriptLoader] 이미 로드됨: ${url}`);
        resolve();
        return;
      }
      
      // 로딩 중인 경우 콜백 추가
      if (loadingScripts[url]) {
        console.log(`[ScriptLoader] 로딩 중: ${url} (대기열에 추가)`);
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
        console.log(`[ScriptLoader] 로드 성공: ${url}`);
        loadedScripts[url] = true;
        
        // 대기 중인 콜백 실행
        const callbacks = loadingScripts[url] || [];
        callbacks.forEach(callback => callback.resolve());
        
        // 로딩 상태 정리
        delete loadingScripts[url];
      };
      
      // 로드 실패
      script.onerror = function(error) {
        console.error(`[ScriptLoader] 로드 실패: ${url}`, error);
        
        // 대기 중인 콜백에 오류 전달
        const callbacks = loadingScripts[url] || [];
        callbacks.forEach(callback => callback.reject(error));
        
        // 로딩 상태 정리
        delete loadingScripts[url];
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
    console.log(`[ScriptLoader] 순차 로드 시작 (${urls.length}개 파일)`);
    for (const url of urls) {
      await load(url);
    }
    console.log('[ScriptLoader] 순차 로드 완료');
  }
  
  /**
   * 여러 스크립트를 병렬로 로드합니다.
   * @param {Array<string>} urls - 스크립트 URL 목록
   * @returns {Promise<void>} - 모든 스크립트 로드 완료 Promise
   */
  async function loadParallel(urls) {
    console.log(`[ScriptLoader] 병렬 로드 시작 (${urls.length}개 파일)`);
    await Promise.all(urls.map(url => load(url)));
    console.log('[ScriptLoader] 병렬 로드 완료');
  }
  
  /**
   * 의존성 그룹을 로드합니다.
   * @param {Object} groups - 의존성 그룹 객체
   * @param {string|Array<string>} groupNames - 로드할 그룹 이름 또는 이름 목록
   * @returns {Promise<void>} - 모든 스크립트 로드 완료 Promise
   */
  async function loadDependencies(groups, groupNames, callback) {
    // 단일 그룹 이름을 배열로 변환
    const names = Array.isArray(groupNames) ? groupNames : [groupNames];
    console.log(`[ScriptLoader] 의존성 로드 시작: ${names.join(', ')}`);
    
    try {
      // 모든 그룹의 의존성 수집 (중복 제거)
      const loadedDependencies = new Set();
      const dependencies = [];
      
      // 그룹 및 의존성 처리를 위한 재귀 함수
      async function processGroup(groupName) {
        const group = groups[groupName];
        
        if (!group) {
          console.warn(`[ScriptLoader] 알 수 없는 의존성 그룹: ${groupName}`);
          return;
        }
        
        // 이미 처리된 그룹은 건너뛰기
        if (loadedDependencies.has(groupName)) {
          return;
        }
        
        loadedDependencies.add(groupName);
        
        // 의존 그룹 먼저 처리
        if (group.depends && group.depends.length > 0) {
          console.log(`[ScriptLoader] 그룹 ${groupName}의 의존성 처리: ${group.depends.join(', ')}`);
          for (const dep of group.depends) {
            await processGroup(dep);
          }
        }
        
        // 스크립트 URL 추가 (중복 없이)
        if (group.scripts && group.scripts.length > 0) {
          for (const script of group.scripts) {
            if (!dependencies.includes(script)) {
              dependencies.push(script);
            }
          }
        }
      }
      
      // 모든 요청된 그룹 처리
      for (const name of names) {
        await processGroup(name);
      }
      
      // 의존성 로드 (순차 로드)
      if (dependencies.length > 0) {
        console.log(`[ScriptLoader] 의존성 순차 로드 시작 (${dependencies.length}개 파일)`);
        await loadSequential(dependencies);
        console.log('[ScriptLoader] 의존성 로드 완료');
      }
      
      // 완료 콜백 실행 (있는 경우)
      if (typeof callback === 'function') {
        callback();
      }
    } catch (error) {
      console.error('[ScriptLoader] 의존성 로드 중 오류 발생:', error);
      throw error;
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
  
  // 공통 스크립트 의존성 정의 - 모든 페이지에서 사용하는 기본 모듈
  const commonDependencies = {
    // 1. 기본 유틸리티 - 다른 모든 모듈의 기초
    utils: {
      scripts: ['/static/js/common/utils.js']
    },
    
    // 2. API 클라이언트 - 서버 통신을 담당
    api: {
      depends: ['utils'],
      scripts: ['/static/js/common/api.js']
    },
    
    // 3. 인증 관련 기능 
    auth: {
      depends: ['utils', 'api'],
      scripts: ['/static/js/common/auth.js'] 
    },
    
    // 4. 알림 시스템
    alerts: {
      depends: ['utils'],
      scripts: ['/static/js/common/alerts.js']
    },
    
    // 5. 모달 다이얼로그 
    modal: {
      depends: ['utils'],
      scripts: ['/static/js/common/modal.js']
    },
    
    // 6. 페이지네이션
    pagination: {
      depends: ['utils'],
      scripts: ['/static/js/common/pagination.js']
    }
  };
  
  // 페이지별 의존성 정의 - 각 페이지에 특화된 모듈
  const pageDependencies = {
    // 대시보드 페이지 - 의존성 순서 중요
    dashboard: {
      depends: ['utils', 'api', 'auth', 'alerts', 'modal', 'pagination'],
      scripts: [
        // 모듈화된 대시보드 구성요소들 
        '/static/js/dashboard.js'  // 대시보드 통합 모듈 (dashboard-core.js와 통합됨)
      ]
    },
    
    // 인수인계 페이지
    handover: {
      depends: ['utils', 'api', 'auth', 'alerts', 'modal'],
      scripts: ['/static/js/handover.js']
    },
    
    // 시각화 페이지
    visualization: {
      depends: ['utils', 'api', 'auth', 'alerts'],
      scripts: ['/static/js/visualization.js']
    },
    
    // 사용자 관리 페이지
    users: {
      depends: ['utils', 'api', 'auth', 'alerts', 'modal'],
      scripts: ['/static/js/users.js']
    }
  };
  
  /**
   * 현재 페이지에 필요한 스크립트를 자동으로 로드합니다.
   */
  function loadPageScripts(callback) {
    // 메인 스크립트 로드
    load('/static/js/main.js').then(() => {
      // 현재 페이지 경로에 따라 의존성 결정
      const path = window.location.pathname;
      console.log(`[ScriptLoader] 페이지 스크립트 로드 시작: ${path}`);
      
      if (path.includes('/dashboard')) {
        return loadDependencies(pageDependencies, 'dashboard', callback);
      } else if (path.includes('/handover')) {
        return loadDependencies(pageDependencies, 'handover', callback);
      } else if (path.includes('/visualization')) {
        return loadDependencies(pageDependencies, 'visualization', callback);
      } else if (path.includes('/users')) {
        return loadDependencies(pageDependencies, 'users', callback);
      } else {
        // 기본적으로 공통 모듈만 로드
        return loadDependencies(commonDependencies, ['utils', 'api', 'auth', 'alerts'], callback);
      }
    }).catch(error => {
      console.error('[ScriptLoader] 주요 스크립트 로드 중 오류:', error);
    });
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

// 자동 스크립트 로드 기능 비활성화
// document.addEventListener('DOMContentLoaded', function() {}) 
// 레이아웃에서 명시적으로 호출하도록 변경

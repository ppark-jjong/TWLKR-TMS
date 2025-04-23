/**
 * 스크립트 동적 로딩 유틸리티
 */

class ScriptLoader {
  /**
   * 생성자
   */
  constructor() {
    // 로드된 스크립트 추적
    this.loadedScripts = new Set();
    
    // 모듈 정의
    this.moduleDefinitions = {
      // 공통 모듈
      common: [
        '/static/js/common/utils.js',
        '/static/js/common/api.js',
        '/static/js/common/modal.js',
        '/static/js/common/auth.js',
        '/static/js/common/pagination.js'
      ],
      
      // 대시보드 모듈
      dashboard: [
        '/static/js/dashboard/filter.js',
        '/static/js/dashboard/table.js',
        '/static/js/dashboard/modals.js',
        '/static/js/dashboard/actions.js',
        '/static/js/dashboard/init.js'
      ],
      
      // 인수인계 모듈
      handover: [
        '/static/js/handover/filter.js',
        '/static/js/handover/table.js',
        '/static/js/handover/modals.js',
        '/static/js/handover/actions.js',
        '/static/js/handover/init.js'
      ],
      
      // 시각화 모듈
      visualization: [
        '/static/js/visualization/charts.js',
        '/static/js/visualization/filter.js',
        '/static/js/visualization/actions.js',
        '/static/js/visualization/init.js'
      ],
      
      // 사용자 관리 모듈
      users: [
        '/static/js/users/table.js',
        '/static/js/users/modals.js',
        '/static/js/users/actions.js',
        '/static/js/users/init.js'
      ],
      
      // 로그인 모듈
      login: [
        '/static/js/login/login.js'
      ]
    };
    
    // 페이지별 필요 모듈 정의
    this.pageModules = {
      dashboard: ['common', 'dashboard'],
      handover: ['common', 'handover'],
      visualization: ['common', 'visualization'],
      users: ['common', 'users'],
      login: ['login']
    };
  }
  
  /**
   * 단일 스크립트 로드
   * @param {string} src - 스크립트 경로
   * @returns {Promise} - 스크립트 로드 Promise
   */
  loadScript(src) {
    // 이미 로드된 스크립트는 무시
    if (this.loadedScripts.has(src)) {
      console.log(`이미 로드된 스크립트 건너뜀: ${src}`);
      return Promise.resolve();
    }
    
    console.log(`스크립트 로드 시작: ${src}`);
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;  // 스크립트 로드 순서 보장
      
      // 버전 캐시 방지 (개발 시에만 사용)
      script.src = `${src}?v=${Date.now()}`;
      
      script.onload = () => {
        this.loadedScripts.add(src);
        console.log(`스크립트 로드 완료: ${src}`);
        resolve();
      };
      
      script.onerror = (error) => {
        console.error(`스크립트 로드 실패: ${src}`, error);
        reject(error);
      };
      
      document.head.appendChild(script);
    });
  }
  
  /**
   * 스크립트 배열 순차 로드
   * @param {Array<string>} scripts - 스크립트 경로 배열
   * @returns {Promise} - 모든 스크립트 로드 Promise
   */
  async loadScripts(scripts) {
    console.log('스크립트 순차 로드 시작:', scripts);
    
    try {
      for (const script of scripts) {
        await this.loadScript(script);
      }
      console.log('모든 스크립트 로드 완료');
    } catch (error) {
      console.error('스크립트 순차 로드 실패:', error);
      throw error;
    }
  }
  
  /**
   * 모듈 그룹 로드
   * @param {string|Array<string>} moduleNames - 모듈 이름 또는 이름 배열
   * @returns {Promise} - 모든 모듈 로드 Promise
   */
  async loadModules(moduleNames) {
    // 문자열을 배열로 변환
    const moduleNameArray = Array.isArray(moduleNames) ? moduleNames : [moduleNames];
    
    // 모든 모듈의 스크립트 경로 수집
    const scripts = [];
    
    for (const moduleName of moduleNameArray) {
      if (this.moduleDefinitions[moduleName]) {
        scripts.push(...this.moduleDefinitions[moduleName]);
      } else {
        console.warn(`정의되지 않은 모듈: ${moduleName}`);
      }
    }
    
    // 중복 제거
    const uniqueScripts = [...new Set(scripts)];
    
    // 스크립트 로드
    await this.loadScripts(uniqueScripts);
  }
  
  /**
   * 현재 페이지에 필요한 모듈 자동 로드
   * @returns {Promise} - 모듈 로드 Promise
   */
  async loadPageModules() {
    try {
      // 현재 페이지 경로에서 페이지 이름 추출
      const path = window.location.pathname;
      let pageName = 'dashboard'; // 기본값
      
      // 주요 페이지 확인
      if (path === '/' || path === '/dashboard') {
        pageName = 'dashboard';
      } else if (path === '/handover') {
        pageName = 'handover';
      } else if (path === '/visualization') {
        pageName = 'visualization';
      } else if (path === '/users') {
        pageName = 'users';
      } else if (path === '/login') {
        pageName = 'login';
      }
      
      console.log(`현재 페이지 확인: ${path} => ${pageName}`);
      
      // 페이지에 필요한 모듈 로드
      if (this.pageModules[pageName]) {
        console.log(`페이지 모듈 로드 시작: ${pageName}`);
        console.log(`로드할 모듈 목록:`, this.pageModules[pageName]);
        
        // 항상 공통 모듈을 먼저 로드
        if (pageName !== 'login' && this.moduleDefinitions['common']) {
          console.log('공통 모듈 먼저 로드');
          await this.loadScripts(this.moduleDefinitions['common']);
        }
        
        // 페이지별 모듈 로드 (공통 모듈 제외)
        const pageSpecificModules = this.pageModules[pageName].filter(m => m !== 'common');
        for (const moduleName of pageSpecificModules) {
          if (this.moduleDefinitions[moduleName]) {
            console.log(`페이지별 모듈 로드: ${moduleName}`);
            await this.loadScripts(this.moduleDefinitions[moduleName]);
          }
        }
        
        console.log(`페이지 모듈 로드 완료: ${pageName}`);
        return true;
      } else {
        console.warn(`정의되지 않은 페이지: ${pageName}`);
        return false;
      }
    } catch (error) {
      console.error('페이지 모듈 로드 중 오류 발생:', error);
      return false;
    }
  }
}

// 전역 인스턴스 생성
window.scriptLoader = new ScriptLoader();

// 문서 로드 완료 시 현재 페이지 모듈 자동 로드
document.addEventListener('DOMContentLoaded', async function() {
  try {
    await window.scriptLoader.loadPageModules();
  } catch (error) {
    console.error('페이지 모듈 로드 실패:', error);
  }
});

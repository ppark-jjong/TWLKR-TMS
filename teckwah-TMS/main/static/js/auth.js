/**
 * 인증 및 세션 관리 스크립트
 * 세션 체크, 권한 검증, 로그아웃 등 인증 관련 기능 처리
 */
document.addEventListener('DOMContentLoaded', function() {
  // 인증 관리 모듈
  const Auth = {
    // 세션 체크 타이머
    sessionCheckTimer: null,
    
    // 세션 체크 간격 (5분)
    SESSION_CHECK_INTERVAL: 5 * 60 * 1000,
    
    /**
     * 초기화 함수
     */
    init() {
      // 세션 유효성 주기적 체크 시작
      this.startSessionCheck();
      
      // 권한 필요한 페이지 체크
      this.checkPagePermission();
    },
    
    /**
     * 주기적 세션 체크 시작
     */
    startSessionCheck() {
      // 기존 타이머 정리
      if (this.sessionCheckTimer) {
        clearInterval(this.sessionCheckTimer);
      }
      
      // 새로운 타이머 설정
      this.sessionCheckTimer = setInterval(() => {
        this.checkSession();
      }, this.SESSION_CHECK_INTERVAL);
      
      // 초기 세션 체크 수행
      this.checkSession();
    },
    
    /**
     * 세션 유효성 체크
     */
    async checkSession() {
      try {
        // 세션 체크 API 호출 (간단한 ping)
        const response = await fetch('/api/check-session', {
          method: 'GET',
          credentials: 'include'
        });
        
        // 세션 만료 (401 응답)
        if (response.status === 401) {
          this.handleSessionExpired();
          return;
        }
        
        // 응답이 성공적이지 않은 경우 무시
        if (!response.ok) {
          return;
        }
        
        // 응답 처리
        const result = await response.json();
        
        // 사용자 정보 업데이트 (필요한 경우)
        if (result.user && Utils.auth) {
          Utils.auth.setCurrentUser(result.user);
        }
      } catch (error) {
        // 오류 무시 (네트워크 오류는 세션 만료로 간주하지 않음)
        console.warn('세션 체크 중 오류:', error);
      }
    },
    
    /**
     * 세션 만료 처리
     */
    handleSessionExpired() {
      // 세션 체크 중지
      if (this.sessionCheckTimer) {
        clearInterval(this.sessionCheckTimer);
        this.sessionCheckTimer = null;
      }
      
      // 로컬 사용자 정보 삭제
      if (Utils.auth) {
        Utils.auth.setCurrentUser(null);
      }
      
      // 세션 만료 대화상자 표시
      const sessionExpiredDialog = document.getElementById('sessionExpiredDialog');
      if (sessionExpiredDialog) {
        sessionExpiredDialog.classList.add('active');
      } else {
        // 대화상자가 없으면 즉시 리다이렉트
        alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/login?return_to=' + encodeURIComponent(window.location.pathname);
      }
    },
    
    /**
     * 현재 페이지의 접근 권한 체크
     */
    checkPagePermission() {
      // 사용자 관리 페이지는 관리자만 접근 가능
      if (window.location.pathname.startsWith('/users') && Utils.auth) {
        Utils.auth.checkPermission('ADMIN');
      }
    }
  };
  
  // 인증 모듈 초기화
  Auth.init();
  
  // 글로벌 스코프에 노출 (디버깅 및 다른 모듈에서 접근용)
  window.Auth = Auth;
});

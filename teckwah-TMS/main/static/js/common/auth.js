/**
 * 인증 관련 공통 유틸리티
 * 사용자 인증, 권한 등에 대한 기능 제공
 */

(function() {
  'use strict';
  
  /**
   * 현재 사용자 정보 가져오기
   * @returns {Object} 사용자 정보 (userId, userRole 등)
   */
  function getCurrentUser() {
    const body = document.body;
    
    // data-* 속성에서 정보 가져오기
    return {
      userId: body.dataset.userId || 'anonymous',
      userRole: body.dataset.userRole || 'USER'
    };
  }
  
  /**
   * 사용자가 관리자인지 확인
   * @returns {boolean} 관리자 여부
   */
  function isAdmin() {
    const userRole = document.body.dataset.userRole || 'USER';
    return userRole === 'ADMIN';
  }
  
  /**
   * 특정 요소에 대한 권한 검사
   * @param {string} requiredRole - 필요한 권한
   * @returns {boolean} 권한 있음 여부
   */
  function hasPermission(requiredRole) {
    const userRole = document.body.dataset.userRole || 'USER';
    
    // 'ADMIN'은 모든 권한을 가짐
    if (userRole === 'ADMIN') return true;
    
    // 'USER'는 'USER' 권한만 가짐
    if (userRole === 'USER' && requiredRole === 'USER') return true;
    
    return false;
  }
  
  /**
   * 현재 사용자가 특정 객체를 편집할 수 있는지 확인
   * @param {Object} object - 검사할 객체
   * @param {string} userIdField - 객체에서 사용자 ID가 저장된 필드명
   * @returns {boolean} 편집 가능 여부
   */
  function canEdit(object, userIdField = 'updatedBy') {
    if (!object) return false;
    
    const currentUser = getCurrentUser();
    
    // 관리자는 항상 편집 가능
    if (currentUser.userRole === 'ADMIN') return true;
    
    // 자신이 작성한 객체만 편집 가능
    if (object[userIdField] === currentUser.userId) return true;
    
    return false;
  }
  
  /**
   * 로그아웃 처리
   * @param {boolean} confirm - 확인 대화상자 표시 여부
   * @returns {boolean} 로그아웃 성공 여부
   */
  function logout(confirm = true) {
    if (confirm) {
      if (!window.confirm('로그아웃 하시겠습니까?')) {
        return false;
      }
    }
    
    // 로그아웃 페이지로 이동
    window.location.href = '/logout';
    return true;
  }
  
  /**
   * 토큰 기반 인증
   */
  const TokenAuth = {
    /**
     * 토큰 가져오기
     * @returns {string|null} 저장된 토큰
     */
    getToken() {
      return localStorage.getItem('auth_token');
    },
    
    /**
     * 토큰 저장
     * @param {string} token - 저장할 토큰
     */
    setToken(token) {
      localStorage.setItem('auth_token', token);
    },
    
    /**
     * 토큰 삭제
     */
    removeToken() {
      localStorage.removeItem('auth_token');
    },
    
    /**
     * 인증 헤더 가져오기
     * @returns {Object} 인증 헤더 객체
     */
    getAuthHeaders() {
      const token = this.getToken();
      if (!token) return {};
      
      return {
        'Authorization': `Bearer ${token}`
      };
    }
  };
  
  // 공개 API
  window.Auth = {
    getCurrentUser,
    isAdmin,
    hasPermission,
    canEdit,
    logout,
    TokenAuth
  };
  
  console.log('[Auth] 인증 모듈 초기화 완료');
})();
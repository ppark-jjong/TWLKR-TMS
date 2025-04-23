/**
 * 인증 관련 공통 기능
 */

/**
 * 현재 로그인한 사용자 정보
 * @type {Object|null}
 */
let currentUser = null;

/**
 * 로그인 상태 조회
 * @returns {Promise<Object>} 로그인 상태 및 사용자 정보
 */
async function checkLoginStatus() {
  try {
    const response = await fetch('/auth/status', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.success && result.data) {
      // 로그인 상태 업데이트
      currentUser = result.data;
      return { isLoggedIn: true, user: result.data };
    } else {
      // 로그아웃 상태
      currentUser = null;
      return { isLoggedIn: false, user: null };
    }
  } catch (error) {
    console.error('로그인 상태 확인 오류:', error);
    currentUser = null;
    return { isLoggedIn: false, user: null, error: error.message };
  }
}

/**
 * 로그아웃 처리
 * @returns {Promise<Object>} 로그아웃 결과
 */
async function logout() {
  try {
    const response = await fetch('/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 로그아웃 성공
      currentUser = null;
      
      // 로그인 페이지로 이동
      window.location.href = '/login';
      
      return { success: true };
    } else {
      // 로그아웃 실패
      console.error('로그아웃 실패:', result.message);
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('로그아웃 오류:', error);
    return { success: false, message: '서버 통신 중 오류가 발생했습니다' };
  }
}

/**
 * 사용자 권한 확인
 * @param {string} role - 필요한 권한
 * @returns {boolean} 권한 있음 여부
 */
function hasPermission(role) {
  if (!currentUser) return false;
  
  // ADMIN은 모든 권한 보유
  if (currentUser.user_role === 'ADMIN') return true;
  
  // 특정 권한 확인
  return currentUser.user_role === role;
}

/**
 * 사용자 정보 가져오기
 * @returns {Object|null} 현재 사용자 정보
 */
function getCurrentUser() {
  return currentUser;
}

// 세션 만료 감지 및 처리
let lastActivityTime = Date.now();

// 활동 시간 업데이트
function updateActivityTime() {
  lastActivityTime = Date.now();
}

// 세션 확인
async function checkSession() {
  // 비활성 시간이 1시간을 초과하면 세션 확인
  const inactiveTime = Date.now() - lastActivityTime;
  const sessionTimeout = 60 * 60 * 1000; // 1시간
  
  if (inactiveTime > sessionTimeout) {
    // 세션 상태 확인
    const { isLoggedIn } = await checkLoginStatus();
    
    if (!isLoggedIn) {
      // 세션 만료 이벤트 발생
      document.dispatchEvent(new CustomEvent('session-expired'));
    } else {
      // 활동 시간 업데이트
      updateActivityTime();
    }
  }
}

// 사용자 활동 이벤트 리스너
document.addEventListener('click', updateActivityTime);
document.addEventListener('keydown', updateActivityTime);
document.addEventListener('mousemove', updateActivityTime);
document.addEventListener('scroll', updateActivityTime);

// 주기적으로 세션 확인 (5분마다)
setInterval(checkSession, 5 * 60 * 1000);

// 페이지 로드 시 초기 로그인 상태 확인
document.addEventListener('DOMContentLoaded', async function() {
  // 로그인 페이지가 아닌 경우에만 세션 확인
  if (window.location.pathname !== '/login') {
    const { isLoggedIn } = await checkLoginStatus();
    
    if (!isLoggedIn) {
      // 로그인 페이지로 리다이렉션
      window.location.href = '/login';
    }
  }
});

// 전역 namespace에 등록
window.Auth = {
  checkLoginStatus,
  logout,
  hasPermission,
  getCurrentUser,
  updateActivityTime
};

/**
 * 로그인 페이지 관련 기능
 */

/**
 * 로그인 페이지 초기화
 */
function initializeLogin() {
  console.log('로그인 페이지 초기화');
  
  // 폼 제출 이벤트 등록
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }
  
  // 엔터 키 이벤트 등록
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleLoginSubmit(event);
      }
    });
  }
  
  // 에러 메시지 표시
  const errorMessage = document.getElementById('errorMessage');
  if (errorMessage && errorMessage.textContent.trim()) {
    showErrorAnimation(errorMessage);
  }
}

/**
 * 로그인 폼 제출 처리
 * @param {Event} event - 폼 제출 이벤트
 */
async function handleLoginSubmit(event) {
  event.preventDefault();
  
  const form = document.getElementById('loginForm');
  const errorMessage = document.getElementById('errorMessage');
  const submitButton = form.querySelector('button[type="submit"]');
  
  // 폼 유효성 검사
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  // 폼 데이터 수집
  const userId = document.getElementById('userId').value;
  const password = document.getElementById('password').value;
  
  // 버튼 상태 변경
  submitButton.disabled = true;
  submitButton.classList.add('loading');
  
  try {
    // 로그인 요청
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ userId, password }),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 로그인 성공 시 대시보드로 이동
      window.location.href = '/dashboard';
    } else {
      // 로그인 실패 시 에러 메시지 표시
      errorMessage.textContent = result.message || '로그인에 실패했습니다.';
      errorMessage.style.display = 'block';
      showErrorAnimation(errorMessage);
      
      // 비밀번호 필드 초기화
      document.getElementById('password').value = '';
      document.getElementById('password').focus();
    }
  } catch (error) {
    // 서버 통신 오류
    console.error('로그인 오류:', error);
    errorMessage.textContent = '서버와 통신 중 오류가 발생했습니다.';
    errorMessage.style.display = 'block';
    showErrorAnimation(errorMessage);
  } finally {
    // 버튼 상태 복원
    submitButton.disabled = false;
    submitButton.classList.remove('loading');
  }
}

/**
 * 에러 메시지 애니메이션
 * @param {HTMLElement} element - 에러 메시지 요소
 */
function showErrorAnimation(element) {
  // 에러 메시지 표시
  element.style.opacity = '0';
  element.style.display = 'block';
  
  // 페이드인 애니메이션
  let opacity = 0;
  const fadeIn = setInterval(() => {
    if (opacity >= 1) {
      clearInterval(fadeIn);
    } else {
      opacity += 0.1;
      element.style.opacity = opacity;
    }
  }, 30);
  
  // 흔들림 애니메이션
  element.classList.add('shake');
  setTimeout(() => {
    element.classList.remove('shake');
  }, 500);
}

// 전역 namespace에 등록
window.Login = {
  init: initializeLogin,
  handleLoginSubmit
};

// 문서 로드 완료 시 로그인 초기화
document.addEventListener('DOMContentLoaded', function() {
  initializeLogin();
});

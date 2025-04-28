/**
 * 로그인 페이지 스크립트
 * 로그인 폼 처리 및 검증을 담당합니다.
 */

// 로그인 네임스페이스
const Login = {
  /**
   * 설정
   */
  config: {
    loginFormId: 'loginForm',
    errorMsgId: 'loginError'
  },
  
  /**
   * 초기화
   */
  init: function() {
    console.log('[Login] 초기화 시작');
    
    // 로그인 폼 초기화
    this.initLoginForm();
    
    console.log('[Login] 초기화 완료');
  },
  
  /**
   * 로그인 폼 초기화
   */
  initLoginForm: function() {
    const loginForm = document.getElementById(this.config.loginFormId);
    
    if (loginForm) {
      // 폼 제출 이벤트
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (this.validateForm(loginForm)) {
          this.submitLogin(new FormData(loginForm));
        }
      });
      
      // 입력 필드 변경 시 오류 메시지 숨김
      const inputs = loginForm.querySelectorAll('input');
      inputs.forEach(input => {
        input.addEventListener('input', () => {
          input.classList.remove('invalid');
          this.hideErrorMessage();
        });
      });
    }
  },
  
  /**
   * 폼 유효성 검사
   * @param {HTMLFormElement} form - 로그인 폼
   * @returns {boolean} 유효성 여부
   */
  validateForm: function(form) {
    const userId = form.querySelector('input[name="user_id"]');
    const password = form.querySelector('input[name="password"]');
    let isValid = true;
    
    // 아이디 검증
    if (!userId.value.trim()) {
      userId.classList.add('invalid');
      this.showErrorMessage('아이디를 입력해주세요.');
      isValid = false;
    }
    
    // 비밀번호 검증
    if (!password.value.trim()) {
      password.classList.add('invalid');
      this.showErrorMessage('비밀번호를 입력해주세요.');
      isValid = false;
    }
    
    return isValid;
  },
  
  /**
   * 로그인 폼 제출
   * @param {FormData} formData - 폼 데이터
   */
  submitLogin: function(formData) {
    // 로딩 표시
    const loginBtn = document.querySelector('button[type="submit"]');
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 로그인 중...';
    }
    
    // FormData를 객체로 변환
    const loginData = {};
    for (const [key, value] of formData.entries()) {
      loginData[key] = value;
    }
    
    // API 호출
    fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(loginData),
      credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // 로그인 성공 시 대시보드로 이동
        window.location.href = '/dashboard';
      } else {
        // 로그인 실패
        this.showErrorMessage(data.message || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
        
        // 로그인 버튼 복원
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = '로그인';
        }
      }
    })
    .catch(error => {
      console.error('로그인 요청 오류:', error);
      this.showErrorMessage('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
      
      // 로그인 버튼 복원
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '로그인';
      }
    });
  },
  
  /**
   * 오류 메시지 표시
   * @param {string} message - 오류 메시지
   */
  showErrorMessage: function(message) {
    const errorMsg = document.getElementById(this.config.errorMsgId);
    
    if (errorMsg) {
      errorMsg.textContent = message;
      errorMsg.style.display = 'block';
      
      // 애니메이션 효과
      errorMsg.classList.remove('fade-in');
      void errorMsg.offsetWidth; // 강제 리플로우
      errorMsg.classList.add('fade-in');
    }
  },
  
  /**
   * 오류 메시지 숨김
   */
  hideErrorMessage: function() {
    const errorMsg = document.getElementById(this.config.errorMsgId);
    
    if (errorMsg) {
      errorMsg.style.display = 'none';
    }
  }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  Login.init();
});

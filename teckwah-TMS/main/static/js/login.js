/**
 * 로그인 페이지 스크립트
 * 세션 기반 인증을 처리하고 백엔드 API와 연동
 */
document.addEventListener('DOMContentLoaded', function() {
  // 폼 요소 찾기
  const loginForm = document.querySelector('form.login-form');
  
  // 폼 제출 이벤트 처리
  if (loginForm) {
    loginForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      // 폼 데이터 수집
      const formData = new FormData(loginForm);
      const loginData = {
        login_id: formData.get('login_id'),
        password: formData.get('password'),
        remember: formData.get('remember') === 'on'
      };
      
      // 필수 입력 확인
      if (!loginData.login_id || !loginData.password) {
        showErrorMessage('아이디와 비밀번호를 모두 입력해주세요.');
        return;
      }
      
      try {
        // 폼 비활성화
        disableForm(true);
        
        // 로그인 요청
        const response = await fetch('/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData),
          credentials: 'include' // 세션 쿠키를 주고받기 위해 필요
        });
        
        // 응답 처리
        if (response.ok) {
          // 로그인 성공 처리
          const data = await response.json();
          
          // 리다이렉트 URL 결정 (return_to 파라미터 또는 기본값 /dashboard)
          const returnTo = formData.get('return_to') || '/dashboard';
          
          // 성공 메시지 표시 (옵션)
          showSuccessMessage('로그인 성공! 잠시 후 이동합니다...');
          
          // 잠시 후 리다이렉트
          setTimeout(() => {
            window.location.href = returnTo;
          }, 800);
        } else {
          // 오류 응답 처리
          let errorMessage = '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';
          
          try {
            const errorData = await response.json();
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (parseError) {
            console.error('오류 응답 파싱 실패:', parseError);
          }
          
          showErrorMessage(errorMessage);
          
          // 비밀번호 필드 초기화 및 포커스
          document.getElementById('password').value = '';
          document.getElementById('password').focus();
        }
      } catch (error) {
        console.error('로그인 처리 오류:', error);
        showErrorMessage('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        // 폼 활성화
        disableForm(false);
      }
    });
  }
  
  /**
   * 오류 메시지 표시
   * @param {string} message - 표시할 메시지
   */
  function showErrorMessage(message) {
    // 기존 알림이 있으면 제거
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }
    
    // 새 알림 생성
    const alert = document.createElement('div');
    alert.className = 'alert alert-error';
    alert.innerHTML = `<i class="fa-solid fa-exclamation-circle"></i><span>${message}</span>`;
    
    // 알림 삽입
    const loginHeader = document.querySelector('.login-header');
    loginHeader.insertAdjacentElement('afterend', alert);
  }
  
  /**
   * 성공 메시지 표시
   * @param {string} message - 표시할 메시지
   */
  function showSuccessMessage(message) {
    // 기존 알림이 있으면 제거
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }
    
    // 새 알림 생성
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.innerHTML = `<i class="fa-solid fa-check-circle"></i><span>${message}</span>`;
    
    // 알림 삽입
    const loginHeader = document.querySelector('.login-header');
    loginHeader.insertAdjacentElement('afterend', alert);
  }
  
  /**
   * 폼 비활성화/활성화
   * @param {boolean} disabled - 비활성화 여부
   */
  function disableForm(disabled) {
    // 폼 내 모든 입력 요소 찾기
    const inputs = loginForm.querySelectorAll('input, button');
    
    // 비활성화 상태 설정
    inputs.forEach(input => {
      input.disabled = disabled;
    });
    
    // 로그인 버튼 업데이트
    const loginButton = loginForm.querySelector('.login-button');
    if (loginButton) {
      if (disabled) {
        loginButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 로그인 중...';
      } else {
        loginButton.innerHTML = '<i class="fa-solid fa-sign-in-alt"></i> 로그인';
      }
    }
  }
  
  // URL에서 오류 메시지 확인
  const urlParams = new URLSearchParams(window.location.search);
  const errorMsg = urlParams.get('error');
  if (errorMsg) {
    showErrorMessage(decodeURIComponent(errorMsg));
  }
  
  // 페이지 로드 시 아이디 필드에 포커스
  const loginIdInput = document.getElementById('login_id');
  if (loginIdInput) {
    loginIdInput.focus();
  }
});

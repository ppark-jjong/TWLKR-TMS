/**
 * 공통 JavaScript 함수
 */

// 페이지 로드 이벤트
document.addEventListener('DOMContentLoaded', function () {
  console.log('페이지가 로드되었습니다.');
});

// 로그아웃 함수
function logout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    // POST 요청 생성
    fetch('/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          window.location.href = '/login';
        } else {
          alert('로그아웃 중 오류가 발생했습니다.');
        }
      })
      .catch((error) => {
        console.error('로그아웃 오류:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
      });
  }
}

// 모달 닫기 함수
function closeModal() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach((modal) => {
    modal.style.display = 'none';
  });
}

// 모달 외부 클릭 시 닫기
document.addEventListener('click', function (event) {
  const modals = document.querySelectorAll('.modal');
  modals.forEach((modal) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});

// ESC 키 눌렀을 때 모달 닫기
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    closeModal();
  }
});

// 에러 메시지 표시 함수
function showError(message, containerId) {
  const container = document.getElementById(containerId || 'errorContainer');
  if (container) {
    container.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <button class="error-close" onclick="this.parentNode.remove()">×</button>
            </div>
        `;
    container.style.display = 'block';
  } else {
    alert(message);
  }
}

// 폼 데이터를 JSON으로 변환하는 헬퍼 함수
function formToJson(form) {
  const formData = new FormData(form);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
}

// API 요청 함수
async function apiRequest(url, method = 'GET', data = null) {
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || '요청 처리 중 오류가 발생했습니다.');
    }

    return result;
  } catch (error) {
    console.error('API 요청 오류:', error);
    throw error;
  }
}

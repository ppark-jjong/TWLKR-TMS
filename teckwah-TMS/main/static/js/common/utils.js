/**
 * 공통 유틸리티 함수 모음
 */

/**
 * 브라우저의 로컬 스토리지에 데이터 저장
 * @param {string} key - 저장할 키
 * @param {any} value - 저장할 값
 */
function saveToLocalStorage(key, value) {
  try {
    const jsonValue = JSON.stringify(value);
    localStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`로컬 스토리지 저장 오류 (${key}):`, error);
  }
}

/**
 * 브라우저의 로컬 스토리지에서 데이터 불러오기
 * @param {string} key - 불러올 키
 * @param {any} defaultValue - 기본값 (키가 없을 경우 반환)
 * @returns {any} 저장된 값 또는 기본값
 */
function getFromLocalStorage(key, defaultValue = null) {
  try {
    const jsonValue = localStorage.getItem(key);
    if (jsonValue === null) {
      return defaultValue;
    }
    return JSON.parse(jsonValue);
  } catch (error) {
    console.error(`로컬 스토리지 불러오기 오류 (${key}):`, error);
    return defaultValue;
  }
}

/**
 * 날짜를 yyyy-MM-dd 형식으로 포맷팅
 * @param {Date} date - 포맷팅할 날짜
 * @returns {string} 포맷팅된 날짜 문자열
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 날짜와 시간을 yyyy-MM-dd HH:mm:ss 형식으로 포맷팅
 * @param {Date} date - 포맷팅할 날짜
 * @returns {string} 포맷팅된 날짜/시간 문자열
 */
function formatDateTime(date) {
  const dateStr = formatDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}:${seconds}`;
}

/**
 * 지정된 시간(ms) 동안 대기
 * @param {number} ms - 대기 시간 (밀리초)
 * @returns {Promise<void>} 대기 Promise
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * HTML 특수 문자 이스케이프 처리
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 로딩 인디케이터 표시/숨김
 * @param {boolean} show - 표시 여부
 */
function showLoading(show) {
  let loadingEl = document.querySelector('.loading-overlay');
  
  if (!loadingEl && show) {
    loadingEl = document.createElement('div');
    loadingEl.className = 'loading-overlay';
    loadingEl.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
      </div>
    `;
    document.body.appendChild(loadingEl);
  }
  
  if (loadingEl) {
    loadingEl.style.display = show ? 'flex' : 'none';
  }
}

/**
 * 알림 메시지 표시
 * @param {string} message - 표시할 메시지
 * @param {string} type - 알림 유형 (info, success, error, warning)
 * @param {number} duration - 표시 시간 (밀리초)
 */
function showAlert(message, type = 'info', duration = 5000) {
  const container = document.getElementById('alertContainer') || createAlertContainer();
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <span>${message}</span>
    <button class="close-btn" onclick="this.parentNode.remove()">×</button>
  `;

  // 기존 같은 유형의 알림 제거 (중복 방지)
  const existingAlerts = container.querySelectorAll(`.alert-${type}`);
  existingAlerts.forEach(existingAlert => {
    const existingMessage = existingAlert.querySelector('span').textContent;
    if (existingMessage === message) {
      existingAlert.remove();
    }
  });

  container.appendChild(alert);

  // 알림에 애니메이션 효과 추가
  setTimeout(() => {
    alert.classList.add('alert-show');
  }, 10);

  // 지정 시간 후 자동 제거
  if (duration > 0) {
    setTimeout(() => {
      if (alert.parentNode) {
        alert.classList.add('alert-hide');
        setTimeout(() => {
          if (alert.parentNode) {
            alert.remove();
          }
        }, 300);
      }
    }, duration);
  }
}

/**
 * 알림 컨테이너 생성
 * @returns {HTMLElement} 생성된 알림 컨테이너
 */
function createAlertContainer() {
  const container = document.createElement('div');
  container.id = 'alertContainer';
  container.className = 'alert-container';
  document.body.appendChild(container);
  return container;
}

/**
 * 모달 닫기
 */
function closeModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.style.display = 'none';
  });
}

/**
 * 우편번호 포맷 변환 (4자리 -> 5자리)
 * @param {string} postalCode - 변환할 우편번호
 * @returns {string} 변환된 우편번호
 */
function formatPostalCode(postalCode) {
  if (!postalCode) return '';
  
  const code = postalCode.toString().trim();
  if (code.length === 4) {
    return '0' + code;
  }
  return code;
}

/**
 * 휴대폰 번호 포맷팅 (010-1234-5678)
 * @param {string} phoneNumber - 포맷팅할 번호
 * @returns {string} 포맷팅된 번호
 */
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  
  // 숫자만 추출
  const numbers = phoneNumber.replace(/\D/g, '');
  
  if (numbers.length === 10) {
    return numbers.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  } else if (numbers.length === 11) {
    return numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  
  return phoneNumber;
}

/**
 * 폼 데이터를 JSON으로 변환
 * @param {HTMLFormElement} form - 변환할 폼 엘리먼트
 * @returns {object} JSON 객체
 */
function formToJson(form) {
  const formData = new FormData(form);
  const data = {};
  
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  
  return data;
}

// 전역 변수에 유틸리티 함수 노출
window.Utils = {
  saveToLocalStorage,
  getFromLocalStorage,
  formatDate,
  formatDateTime,
  sleep,
  escapeHtml,
  showLoading,
  showAlert,
  closeModals,
  formatPostalCode,
  formatPhoneNumber,
  formToJson
};

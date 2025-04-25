/**
 * 공통 유틸리티 함수 모듈
 * 시스템 전반에서 사용하는 유틸리티 기능 제공
 */
window.Utils = {
  /**
   * 알림 메시지를 표시합니다.
   * @param {string} message - 표시할 메시지
   * @param {string} type - 알림 유형 (success, error, warning, info)
   * @param {number} duration - 표시 시간 (밀리초)
   */
  showAlert: function(message, type = 'info', duration = 5000) {
    try {
      const alertContainer = document.getElementById('alertContainer');
      
      if (!alertContainer) {
        console.error('알림 컨테이너를 찾을 수 없습니다.');
        alert(message);
        return;
      }
      
      // 중복 알림 확인 (동일 메시지, 동일 타입)
      const existingAlerts = alertContainer.querySelectorAll(`.alert-${type}`);
      for (const existingAlert of existingAlerts) {
        if (existingAlert.querySelector('.alert-message').textContent === message) {
          return; // 중복 알림 방지
        }
      }
      
      // 알림 요소 생성
      const alert = document.createElement('div');
      alert.className = `alert alert-${type} fade-in`;
      
      // 아이콘 선택
      let icon = 'info-circle';
      if (type === 'success') icon = 'check-circle';
      if (type === 'error') icon = 'exclamation-circle';
      if (type === 'warning') icon = 'exclamation-triangle';
      
      // 내용 추가
      alert.innerHTML = `
        <div class="alert-icon">
          <i class="fas fa-${icon}"></i>
        </div>
        <div class="alert-content">
          <p class="alert-message">${message}</p>
        </div>
        <button type="button" class="alert-close">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      // 닫기 버튼 이벤트 추가
      const closeBtn = alert.querySelector('.alert-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          alert.style.opacity = '0';
          setTimeout(() => {
            if (alert.parentNode) {
              alert.parentNode.removeChild(alert);
            }
          }, 300);
        });
      }
      
      // 컨테이너에 추가
      alertContainer.appendChild(alert);
      
      // 일정 시간 후 자동 제거 (error 타입은 자동 제거 안함)
      if (type !== 'error' && duration > 0) {
        setTimeout(() => {
          alert.style.opacity = '0';
          setTimeout(() => {
            if (alert.parentNode) {
              alert.parentNode.removeChild(alert);
            }
          }, 300);
        }, duration);
      }
    } catch (error) {
      console.error('알림 표시 중 오류 발생:', error);
      alert(message); // 기본 알림으로 대체
    }
  },
  
  /**
   * 로딩 인디케이터를 표시하거나 숨깁니다.
   * @param {boolean} show - 표시 여부
   */
  toggleLoading: function(show) {
    try {
      const loadingOverlay = document.querySelector('.loading-overlay');
      
      if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
      }
    } catch (error) {
      console.error('로딩 표시 전환 중 오류 발생:', error);
    }
  },
  
  /**
   * 날짜를 지정된 형식으로 포맷팅합니다.
   * @param {Date|string} date - 포맷팅할 날짜 (Date 객체 또는 문자열)
   * @param {string} format - 날짜 형식 (YYYY-MM-DD, YY-MM-DD HH:mm 등)
   * @returns {string} - 포맷팅된 날짜 문자열
   */
  formatDate: function(date, format = 'YYYY-MM-DD') {
    try {
      if (!date) return '-';
      
      // 문자열을 Date 객체로 변환
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // 유효한 날짜인지 확인
      if (isNaN(dateObj.getTime())) {
        return date; // 원본 반환
      }
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
      
      // 포맷에 따라 날짜 문자열 생성
      let formattedDate = format;
      formattedDate = formattedDate.replace('YYYY', year);
      formattedDate = formattedDate.replace('YY', String(year).slice(-2));
      formattedDate = formattedDate.replace('MM', month);
      formattedDate = formattedDate.replace('DD', day);
      formattedDate = formattedDate.replace('HH', hours);
      formattedDate = formattedDate.replace('mm', minutes);
      formattedDate = formattedDate.replace('ss', seconds);
      
      return formattedDate;
    } catch (error) {
      console.error('날짜 포맷팅 중 오류 발생:', error);
      return date; // 오류 시 원본 반환
    }
  },
  
  /**
   * 우편번호 형식을 처리합니다 (4자리 → 5자리).
   * @param {string} postalCode - 우편번호
   * @returns {string} - 처리된 우편번호
   */
  formatPostalCode: function(postalCode) {
    try {
      if (!postalCode) return '';
      
      // 숫자만 추출
      const digits = postalCode.toString().replace(/\D/g, '');
      
      // 4자리인 경우 앞에 0 추가
      if (digits.length === 4) {
        return '0' + digits;
      }
      
      return digits;
    } catch (error) {
      console.error('우편번호 포맷팅 중 오류 발생:', error);
      return postalCode; // 오류 시 원본 반환
    }
  },
  
  /**
   * 지정된 주문의 락 상태를 확인합니다.
   * @param {string|number} orderId - 주문 ID
   * @returns {Promise<Object>} - 락 상태 정보
   */
  checkLock: async function(orderId) {
    try {
      const response = await fetch(`/dashboard/lock/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '락 확인 중 오류가 발생했습니다.');
      }
      
      return await response.json();
    } catch (error) {
      console.error('락 확인 중 오류 발생:', error);
      this.showAlert(`락 확인 중 오류: ${error.message}`, 'error');
      return { hasLock: false, canEdit: false };
    }
  },
  
  /**
   * 현재 사용자의 역할을 확인합니다.
   * @returns {string} - 사용자 역할 (ADMIN 또는 USER)
   */
  getUserRole: function() {
    const body = document.body;
    return body.dataset.userRole || 'USER';
  },
  
  /**
   * 지정된 요소에 이벤트 위임을 설정합니다.
   * @param {Element} element - 이벤트를 위임할 부모 요소
   * @param {string} eventType - 이벤트 유형 (예: 'click')
   * @param {string} selector - 자식 요소 선택자
   * @param {Function} handler - 이벤트 핸들러
   */
  delegateEvent: function(element, eventType, selector, handler) {
    if (!element) return;
    
    element.addEventListener(eventType, function(event) {
      const targetElement = event.target.closest(selector);
      
      if (targetElement && element.contains(targetElement)) {
        handler.call(targetElement, event, targetElement);
      }
    });
  },
  
  /**
   * 문자열이 비어있는지 확인합니다.
   * @param {string} value - 확인할 문자열
   * @returns {boolean} - 비어있으면 true, 그렇지 않으면 false
   */
  isEmpty: function(value) {
    return value === undefined || value === null || value.trim() === '';
  },
  
  /**
   * localStorage에 데이터를 저장합니다.
   * @param {string} key - 키
   * @param {*} value - 저장할 값 (객체는 자동으로 JSON 변환)
   */
  saveToStorage: function(key, value) {
    try {
      const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
      localStorage.setItem(key, valueToStore);
    } catch (error) {
      console.error('로컬 스토리지 저장 중 오류 발생:', error);
    }
  },
  
  /**
   * localStorage에서 데이터를 불러옵니다.
   * @param {string} key - 키
   * @param {*} defaultValue - 기본값
   * @returns {*} - 저장된 값 또는 기본값
   */
  getFromStorage: function(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      
      // JSON 형식인 경우 파싱 시도
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (error) {
      console.error('로컬 스토리지 로드 중 오류 발생:', error);
      return defaultValue;
    }
  },
  
  /**
   * 폼 데이터를 객체로 변환합니다.
   * @param {HTMLFormElement} form - 폼 요소
   * @returns {Object} - 폼 데이터 객체
   */
  getFormData: function(form) {
    if (!form || !(form instanceof HTMLFormElement)) return {};
    
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  },
  
  /**
   * 페이지 URL을 쿼리 매개변수와 함께 업데이트합니다 (페이지 새로고침 없음).
   * @param {Object} params - 쿼리 매개변수 객체
   * @param {boolean} merge - 기존 매개변수와 병합 여부
   */
  updateUrlParams: function(params, merge = true) {
    const url = new URL(window.location.href);
    
    if (!merge) {
      // 기존 매개변수 제거
      [...url.searchParams.keys()].forEach(key => {
        url.searchParams.delete(key);
      });
    }
    
    // 새 매개변수 추가
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    });
    
    // URL 업데이트 (페이지 새로고침 없음)
    window.history.pushState({}, '', url);
  },
  
  /**
   * URL에서 쿼리 매개변수를 가져옵니다.
   * @param {string} paramName - 매개변수 이름
   * @param {string} defaultValue - 기본값
   * @returns {string} - 매개변수 값 또는 기본값
   */
  getUrlParam: function(paramName, defaultValue = '') {
    const url = new URL(window.location.href);
    return url.searchParams.get(paramName) || defaultValue;
  },
  
  /**
   * 첫 글자를 대문자로 변환합니다.
   * @param {string} str - 변환할 문자열
   * @returns {string} - 변환된 문자열
   */
  capitalize: function(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

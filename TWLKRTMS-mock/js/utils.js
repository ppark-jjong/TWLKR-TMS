/**
 * 공통 유틸리티 함수 모음 (개선된 버전)
 */

// 날짜 관련 유틸리티
const dateUtils = {
  /**
   * 오늘 날짜를 YYYY-MM-DD 형식의 문자열로 반환
   */
  getCurrentDate() {
    const today = new Date();
    return this.formatDate(today);
  },
  
  /**
   * Date 객체를 YYYY-MM-DD 형식의 문자열로 변환
   */
  formatDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('유효하지 않은 날짜:', date);
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  },
  
  /**
   * YYYY-MM-DD 형식의 문자열을 Date 객체로 변환
   */
  parseDate(dateString) {
    try {
      if (!dateString) return null;
      
      // YYYY-MM-DD 형식 확인
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        console.warn('날짜 형식이 올바르지 않습니다:', dateString);
        return null;
      }
      
      const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
      const date = new Date(year, month - 1, day);
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        console.warn('유효하지 않은 날짜:', dateString);
        return null;
      }
      
      return date;
    } catch (error) {
      console.error('날짜 파싱 오류:', error);
      return null;
    }
  },
  
  /**
   * 날짜를 yyyy-MM-dd HH:mm 형식의 문자열로 변환
   */
  formatDateTime(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('유효하지 않은 날짜:', date);
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },
  
  /**
   * 문자열 날짜를 한국어 로케일로 포맷팅
   */
  formatDateTimeLocale(dateStr) {
    if (!dateStr) return '-';
    
    try {
      const date = new Date(dateStr);
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.warn('날짜 포맷팅 오류:', e);
      return dateStr;
    }
  },
  
  /**
   * Excel 날짜 값을 JS Date 객체로 변환
   * Excel 날짜는 1900년 1월 1일부터 일수로 저장됨 (윤년 버그 포함)
   */
  excelDateToDate(excelDate) {
    try {
      if (!excelDate || isNaN(excelDate)) return null;
      
      // Excel 날짜는 1900년 1월 0일부터 시작하므로 1900년 1월 1일로 변환
      const jsDate = new Date(1900, 0, excelDate - 1);
      
      // 유효한 날짜인지 확인
      if (isNaN(jsDate.getTime())) {
        console.warn('Excel 날짜 변환 실패:', excelDate);
        return null;
      }
      
      return jsDate;
    } catch (error) {
      console.error('Excel 날짜 변환 오류:', error);
      return null;
    }
  },
  
  /**
   * 두 날짜 사이의 일수 계산
   */
  daysBetween(date1, date2) {
    if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
      return 0;
    }
    
    // UTC 시간으로 변환하여 시간대 차이 제거
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    
    // 일수로 변환 (밀리초를 일로 변환)
    const diffDays = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
};

// 메시지 유틸리티 (개선된 버전)
const messageUtils = {
  messageTimer: null,
  
  /**
   * 메시지 표시
   */
  showMessage(message, type = 'info', duration = 3000) {
    const messageEl = document.getElementById('messagePopup');
    if (!messageEl) return;
    
    const messageText = messageEl.querySelector('.message-text');
    const messageIcon = messageEl.querySelector('.message-icon');
    
    // 타입에 따른 아이콘과 클래스 설정
    let iconClass = 'fa-info-circle';
    messageEl.className = 'message-popup';
    
    if (type === 'success') {
      iconClass = 'fa-check-circle';
      messageEl.classList.add('message-success');
    } else if (type === 'error') {
      iconClass = 'fa-times-circle';
      messageEl.classList.add('message-error');
    } else if (type === 'warning') {
      iconClass = 'fa-exclamation-triangle';
      messageEl.classList.add('message-warning');
    } else {
      messageEl.classList.add('message-info');
    }
    
    // 아이콘 및 메시지 설정
    messageIcon.className = `fa-solid ${iconClass} message-icon`;
    messageText.textContent = message;
    
    // 메시지 표시 - 기존 애니메이션 클래스 제거 후 추가
    messageEl.classList.remove('active');
    
    // Forcing a reflow to ensure animation plays again even if already active
    void messageEl.offsetWidth;
    
    messageEl.classList.add('active');
    
    // 타이머 설정
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
    }
    
    this.messageTimer = setTimeout(() => {
      messageEl.classList.remove('active');
    }, duration);
  },
  
  /**
   * 성공 메시지
   */
  success(message, duration = 3000) {
    this.showMessage(message, 'success', duration);
  },
  
  /**
   * 에러 메시지
   */
  error(message, duration = 3000) {
    this.showMessage(message, 'error', duration);
  },
  
  /**
   * 경고 메시지
   */
  warning(message, duration = 3000) {
    this.showMessage(message, 'warning', duration);
  },
  
  /**
   * 정보 메시지
   */
  info(message, duration = 3000) {
    this.showMessage(message, 'info', duration);
  }
};

// 상태 유틸리티 (개선된 버전)
const statusUtils = {
  // 상태 텍스트 매핑 (요청대로 5가지 상태로 제한)
  statusText: {
    'PENDING': '대기',
    'IN_PROGRESS': '진행',
    'COMPLETE': '완료',
    'ISSUE': '이슈',
    'CANCEL': '취소'
  },
  
  // 상태 색상 매핑
  statusColors: {
    'PENDING': 'bg-yellow',
    'IN_PROGRESS': 'bg-blue',
    'COMPLETE': 'bg-green',
    'ISSUE': 'bg-red',
    'CANCEL': 'bg-gray'
  },
  
  // 상태 아이콘 매핑
  statusIcons: {
    'PENDING': 'fa-clock',
    'IN_PROGRESS': 'fa-spinner',
    'COMPLETE': 'fa-check-circle',
    'ISSUE': 'fa-exclamation-triangle',
    'CANCEL': 'fa-ban'
  },
  
  /**
   * 상태에 따른 텍스트 반환
   */
  getStatusText(status) {
    return this.statusText[status] || status;
  },
  
  /**
   * 상태에 따른 색상 클래스 반환
   */
  getStatusClass(status) {
    return this.statusColors[status] || 'bg-gray';
  },
  
  /**
   * 상태에 따른 아이콘 클래스 반환
   */
  getStatusIcon(status) {
    return this.statusIcons[status] || 'fa-question-circle';
  },
  
  // 우선순위 텍스트 매핑
  priorityText: {
    'LOW': '낮음',
    'MEDIUM': '중간',
    'HIGH': '높음',
    'URGENT': '긴급'
  },
  
  // 우선순위 클래스 매핑
  priorityClasses: {
    'LOW': 'priority-low',
    'MEDIUM': 'priority-medium',
    'HIGH': 'priority-high',
    'URGENT': 'priority-urgent'
  },
  
  /**
   * 우선순위에 따른 텍스트 반환
   */
  getPriorityText(priority) {
    return this.priorityText[priority] || priority;
  },
  
  /**
   * 우선순위에 따른 클래스 반환
   */
  getPriorityClass(priority) {
    return this.priorityClasses[priority] || 'priority-medium';
  }
};

// 모달 제어 유틸 (개선된 버전)
const modalUtils = {
  /**
   * 모달 열기
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      
      // 모달 내 첫 번째 입력 필드에 포커스
      setTimeout(() => {
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    }
  },
  
  /**
   * 모달 닫기
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },
  
  /**
   * 모든 모달 닫기
   */
  closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.classList.remove('active');
    });
  },
  
  /**
   * 모달 초기화 (모든 모달에 닫기 이벤트 추가)
   */
  initModals() {
    // 모달 닫기 버튼에 이벤트 리스너 추가
    const closeButtons = document.querySelectorAll('[data-modal]');
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const modalId = button.getAttribute('data-modal');
        this.closeModal(modalId);
      });
    });
    
    // 모달 바깥 영역 클릭 시 닫기
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
    
    // ESC 키 누를 때 모달 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
          activeModal.classList.remove('active');
        }
      }
    });
  }
};

// 문자열 유틸리티
const stringUtils = {
  /**
   * 텍스트 길이 제한 및 말줄임표 처리
   */
  truncate(text, maxLength = 50) {
    if (!text) return '';
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  },
  
  /**
   * 문자열이 비어있는지 확인
   */
  isEmpty(text) {
    return !text || text.trim() === '';
  },
  
  /**
   * HTML 특수 문자 이스케이프
   */
  escapeHTML(text) {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

// 검증 유틸리티
const validationUtils = {
  /**
   * 이메일 형식 검증
   */
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },
  
  /**
   * 전화번호 형식 검증 (한국 번호 기준)
   */
  isValidPhoneNumber(phone) {
    // 하이픈 제거
    const cleanPhone = phone.replace(/-/g, '');
    
    // 한국 전화번호 패턴 (010, 011, 016, 017, 018, 019 + 7-8자리)
    const regex = /^(01[016789])[0-9]{7,8}$/;
    return regex.test(cleanPhone);
  },
  
  /**
   * 우편번호 형식 검증 (한국 5자리 또는 구 6자리 우편번호)
   */
  isValidPostalCode(postalCode) {
    const cleanPostal = postalCode.replace(/-/g, '');
    return /^\d{5}(\d{1})?$/.test(cleanPostal);
  },
  
  /**
   * 빈 문자열 또는 null/undefined 체크
   */
  isEmptyOrNull(value) {
    return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
  }
};

// 데이터 포맷 유틸리티
const formatUtils = {
  /**
   * 숫자에 천 단위 구분자 추가
   */
  formatNumber(number) {
    if (number === null || number === undefined) {
      return '0';
    }
    
    return Number(number).toLocaleString('ko-KR');
  },
  
  /**
   * 전화번호 포맷팅 (010-1234-5678)
   */
  formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // 하이픈 및 공백 제거
    const cleaned = phone.replace(/[- ]/g, '');
    
    // 패턴에 따라 하이픈 추가
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    
    return phone;
  },
  
  /**
   * 주소 문자열 줄임
   */
  shortenAddress(address, maxLength = 30) {
    if (!address) return '';
    
    if (address.length <= maxLength) {
      return address;
    }
    
    return address.substring(0, maxLength) + '...';
  }
};

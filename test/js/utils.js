/**
 * 유틸리티 함수 모음
 */

// 모달 제어
const modalUtils = {
  /**
   * 모달 열기
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
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
  }
};

// 메시지 표시 유틸
const messageUtils = {
  /**
   * 메시지 표시
   */
  showMessage(message, type = 'info', duration = 3000) {
    const messageEl = document.getElementById('messagePopup');
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
    
    // 메시지 표시
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

// 날짜 처리 유틸
const dateUtils = {
  /**
   * 날짜를 yyyy-MM-dd 형식으로 변환
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  },
  
  /**
   * 날짜를 yyyy-MM-dd HH:mm 형식으로 변환
   */
  formatDateTime(dateString) {
    const date = new Date(dateString);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },
  
  /**
   * 현재 날짜시간 문자열 반환
   */
  getCurrentDateTime() {
    return this.formatDateTime(new Date());
  },
  
  /**
   * 현재 날짜 문자열 반환
   */
  getCurrentDate() {
    return this.formatDate(new Date());
  },
  
  /**
   * Excel 날짜 숫자를 JavaScript Date 객체로 변환
   */
  excelDateToDate(excelDate) {
    if (!excelDate || isNaN(excelDate)) return null;
    
    // Excel의 날짜는 1900년 1월 1일부터 시작, 1900년은 윤년이 아닌데 Excel이 윤년으로 계산하는 버그가 있어 -1 조정
    const utcDays = excelDate - 25569; // 1970년 1월 1일과 1900년 1월 1일의 차이
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const date = new Date(utcDays * millisecondsPerDay);
    
    return date;
  },
  
  /**
   * 날짜를 datetime-local input 형식으로 변환 (yyyy-MM-ddTHH:mm)
   */
  formatDateTimeForInput(dateString) {
    const date = new Date(dateString);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
};

// 상태 유틸
const statusUtils = {
  // 상태 텍스트 매핑
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
    'ASSIGNED': 'bg-blue',
    'IN_PROGRESS': 'bg-blue-dark',
    'COMPLETE': 'bg-green',
    'ISSUE': 'bg-red',
    'CANCEL': 'bg-gray'
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

// DOM 유틸
const domUtils = {
  /**
   * Select 요소에 옵션 채우기
   */
  populateSelect(selectId, options, valueKey = null, textKey = null, emptyOption = true) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // 기존 옵션 제거
    select.innerHTML = '';
    
    // 빈 옵션 추가
    if (emptyOption) {
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '전체';
      select.appendChild(emptyOpt);
    }
    
    // 옵션 추가
    options.forEach(option => {
      const opt = document.createElement('option');
      
      if (typeof option === 'object' && valueKey && textKey) {
        opt.value = option[valueKey];
        opt.textContent = option[textKey];
      } else {
        opt.value = option;
        opt.textContent = option;
      }
      
      select.appendChild(opt);
    });
  },
  
  /**
   * 현재 시간 표시 업데이트
   */
  updateCurrentTime() {
    const timeEl = document.getElementById('currentDateTime');
    if (timeEl) {
      timeEl.textContent = dateUtils.getCurrentDateTime();
    }
  }
};

/**
 * 대시보드 페이지 관련 기능
 */

// 유틸리티 함수들
const utils = {
  // 날짜 유틸
  date: {
    formatDate(date) {
      if (!date) return '';
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    },
    
    formatDateTime(date) {
      if (!date) return '';
      const d = new Date(date);
      const dateStr = d.toISOString().split('T')[0];
      const timeStr = d.toTimeString().split(' ')[0].substring(0, 5);
      return `${dateStr} ${timeStr}`;
    }
  },
  
  // 상태 관련 유틸
  status: {
    // 상태 텍스트 매핑
    text: {
      'PENDING': '대기',
      'IN_PROGRESS': '진행',
      'COMPLETE': '완료',
      'ISSUE': '이슈',
      'CANCEL': '취소'
    },
    
    // 상태 색상 매핑
    colors: {
      'PENDING': 'bg-yellow',
      'ASSIGNED': 'bg-blue',
      'IN_PROGRESS': 'bg-blue-dark',
      'COMPLETE': 'bg-green',
      'ISSUE': 'bg-red',
      'CANCEL': 'bg-gray'
    },
    
    getText(status) {
      return this.text[status] || status;
    },
    
    getClass(status) {
      return this.colors[status] || 'bg-gray';
    }
  },
  
  // 모달 제어 유틸
  modal: {
    open(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('active');
    },
    
    close(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('active');
    },
    
    init() {
      // 모달 닫기 버튼에 이벤트 추가
      document.querySelectorAll('[data-modal]').forEach(button => {
        button.addEventListener('click', () => {
          const modalId = button.getAttribute('data-modal');
          this.close(modalId);
        });
      });
      
      // 모달 바깥 영역 클릭 시 닫기
      document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.classList.remove('active');
          }
        });
      });
    }
  },
  
  // 메시지 표시 유틸
  message: {
    timer: null,
    
    show(message, type = 'info', duration = 3000) {
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
      
      // 메시지 표시
      messageEl.classList.add('active');
      
      // 타이머 설정
      if (this.timer) {
        clearTimeout(this.timer);
      }
      
      this.timer = setTimeout(() => {
        messageEl.classList.remove('active');
      }, duration);
    },
    
    success(message, duration = 3000) {
      this.show(message, 'success', duration);
    },
    
    error(message, duration = 3000) {
      this.show(message, 'error', duration);
    },
    
    warning(message, duration = 3000) {
      this.show(message, 'warning', duration);
    },
    
    info(message, duration = 3000) {
      this.show(message, 'info', duration);
    }
  },
  
  // 로딩 표시기 제어
  loading: {
    show() {
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) overlay.style.display = 'flex';
    },
    
    hide() {
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) overlay.style.display = 'none';
    }
  }
};

/**
 * 대시보드 페이지 클래스
 */
class Dashboard {
  constructor() {
    // 상태 초기화
    this.currentPage = 1;
    this.pageSize = 10;
    this.filters = {};
    this.selectedItems = new Set();
    this.dashboardData = []; // 전체 데이터
    this.filteredData = []; // 필터링된 데이터
    
    // 요소 초기화
    this.elements = {
      tableBody: document.getElementById('dashboardTableBody'),
      selectAll: document.getElementById('selectAll'),
      pageInfo: document.getElementById('pageInfo'),
      totalOrders: document.getElementById('totalOrders'),
      inProgressOrders: document.getElementById('inProgressOrders'),
      progressOrders: document.getElementById('progressOrders'),
      completedOrders: document.getElementById('completedOrders')
    };
    
    // 이벤트 핸들러 바인딩 및 초기화
    this.init();
  }
  
  /**
   * 초기화 및 이벤트 바인딩
   */
  init() {
    // 모달 초기화
    utils.modal.init();
    
    // 이벤트 리스너 설정
    this.bindEvents();
    
    // 날짜 기본값 설정
    this.setDefaultDates();
    
    // 데이터 로드
    this.loadData();
  }
  
  /**
   * 이
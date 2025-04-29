/**
 * 공통 유틸리티 함수 모듈
 * 인증, 권한, HTTP 요청 등의 공통 기능 제공
 */

const Utils = {
  /**
   * 인증 관련 유틸리티
   */
  auth: {
    /**
     * 현재 로그인한 사용자 정보를 로컬 스토리지에서 가져오기
     * @returns {Object|null} 사용자 정보 또는 null
     */
    getCurrentUser() {
      try {
        const userStr = localStorage.getItem('tms_user');
        return userStr ? JSON.parse(userStr) : null;
      } catch (e) {
        console.error('사용자 정보 파싱 오류:', e);
        return null;
      }
    },

    /**
     * 사용자 정보를 로컬 스토리지에 저장
     * @param {Object} user - 저장할 사용자 정보
     */
    setCurrentUser(user) {
      if (user) {
        localStorage.setItem('tms_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('tms_user');
      }
    },

    /**
     * 관리자 권한 확인
     * @returns {boolean} 관리자 여부
     */
    isAdmin() {
      const user = this.getCurrentUser();
      return user && user.user_role === 'ADMIN';
    },

    /**
     * 현재 페이지에서 권한 확인
     * 권한이 없으면 경고 메시지 표시 후 대시보드로 리다이렉트
     * @param {string} requiredRole - 필요한 권한 ('ADMIN' 또는 'USER')
     * @returns {boolean} 권한 있음 여부
     */
    checkPermission(requiredRole = 'USER') {
      const user = this.getCurrentUser();
      
      // 사용자 정보가 없음
      if (!user) {
        Utils.message.error('로그인이 필요합니다.');
        setTimeout(() => {
          window.location.href = `/login?return_to=${encodeURIComponent(window.location.pathname)}`;
        }, 1000);
        return false;
      }
      
      // 관리자 권한 필요한데 일반 사용자인 경우
      if (requiredRole === 'ADMIN' && user.user_role !== 'ADMIN') {
        Utils.message.error('접근 권한이 없습니다.');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
        return false;
      }
      
      return true;
    },

    /**
     * 로그아웃 처리
     */
    logout() {
      fetch('/logout', {
        method: 'POST',
        credentials: 'include'
      }).finally(() => {
        // 로컬 사용자 정보 삭제
        this.setCurrentUser(null);
        
        // 로그인 페이지로 리다이렉트
        window.location.href = '/login';
      });
    }
  },
  /**
   * 메시지 팝업 유틸리티
   */
  message: {
    /**
     * 메시지 팝업 표시
     * @param {string} text - 표시할 메시지 텍스트
     * @param {string} type - 메시지 유형 (success, error, warning, info)
     * @param {number} duration - 표시 시간 (밀리초)
     */
    show(text, type = 'info', duration = 3000) {
      const messageEl = document.getElementById('messagePopup');
      if (!messageEl) return;

      // 이전 타이머 제거
      if (this.timer) {
        clearTimeout(this.timer);
      }

      // 메시지 유형에 따른 아이콘 설정
      const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
      };

      // 필요한 요소 찾기
      const messageIcon = messageEl.querySelector('.message-icon');
      const messageText = messageEl.querySelector('.message-text');

      // 메시지 내용 및 스타일 설정
      messageEl.className = 'message-popup';
      messageEl.classList.add(`message-${type}`);
      messageIcon.className = `fa-solid ${iconMap[type]} message-icon`;
      messageText.textContent = text;

      // 메시지 표시
      messageEl.classList.add('active');

      // 일정 시간 후 메시지 숨김
      this.timer = setTimeout(() => {
        messageEl.classList.remove('active');
      }, duration);
    },

    // 메시지 타이머 저장용 변수
    timer: null,

    /**
     * 성공 메시지 표시
     * @param {string} text - 메시지 내용
     * @param {number} duration - 표시 시간 (밀리초)
     */
    success(text, duration = 3000) {
      this.show(text, 'success', duration);
    },

    /**
     * 오류 메시지 표시
     * @param {string} text - 메시지 내용
     * @param {number} duration - 표시 시간 (밀리초)
     */
    error(text, duration = 3000) {
      this.show(text, 'error', duration);
    },

    /**
     * 경고 메시지 표시
     * @param {string} text - 메시지 내용
     * @param {number} duration - 표시 시간 (밀리초)
     */
    warning(text, duration = 3000) {
      this.show(text, 'warning', duration);
    },

    /**
     * 정보 메시지 표시
     * @param {string} text - 메시지 내용
     * @param {number} duration - 표시 시간 (밀리초)
     */
    info(text, duration = 3000) {
      this.show(text, 'info', duration);
    }
  },

  /**
   * 날짜 관련 유틸리티
   */
  date: {
    /**
     * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
     * @returns {string} YYYY-MM-DD 형식의 날짜
     */
    today() {
      const now = new Date();
      return this.format(now);
    },

    /**
     * 날짜 객체를 YYYY-MM-DD 형식으로 변환
     * @param {Date} date - 날짜 객체
     * @returns {string} YYYY-MM-DD 형식의 날짜
     */
    format(date) {
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
     * 날짜 및 시간을 YYYY-MM-DD HH:MM 형식으로 변환
     * @param {Date} date - 날짜 객체
     * @returns {string} YYYY-MM-DD HH:MM 형식의 날짜 및 시간
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
     * 문자열을 Date 객체로 변환
     * @param {string} dateStr - 날짜 문자열
     * @returns {Date|null} 변환된 Date 객체 또는 null
     */
    parse(dateStr) {
      if (!dateStr) return null;
      
      try {
        return new Date(dateStr);
      } catch (e) {
        console.warn('날짜 파싱 오류:', dateStr, e);
        return null;
      }
    }
  },

  /**
   * HTTP 요청 관련 유틸리티
   */
  http: {
    /**
     * 기본 fetch 래퍼 함수
     * @param {string} url - 요청 URL
     * @param {Object} options - fetch 옵션
     * @returns {Promise} fetch 응답 Promise
     */
    async fetch(url, options = {}) {
      try {
        // 기본 헤더 설정
        const headers = {
          'Content-Type': 'application/json',
          ...options.headers
        };

        // 로딩 표시
        if (options.showLoading !== false) {
          this.showLoading();
        }

        // 세션 쿠키 포함 설정
        const fetchOptions = {
          ...options,
          headers,
          credentials: 'include' // 항상 세션 쿠키 포함
        };

        // fetch 요청
        const response = await fetch(url, fetchOptions);

        // 로딩 숨김
        if (options.showLoading !== false) {
          this.hideLoading();
        }

        // 응답 처리
        if (!response.ok) {
          // 세션 만료 처리 (401 상태코드)
          if (response.status === 401) {
            Utils.message.error('세션이 만료되었습니다. 다시 로그인해주세요.');
            // 현재 URL을 저장하여 로그인 후 복귀할 수 있도록 함
            const returnPath = encodeURIComponent(window.location.pathname + window.location.search);
            setTimeout(() => {
              window.location.href = `/login?return_to=${returnPath}`;
            }, 1500);
            throw new Error('Unauthorized');
          }
          
          // 권한 없음 처리 (403 상태코드)
          if (response.status === 403) {
            Utils.message.error('해당 작업에 대한 권한이 없습니다.');
            throw new Error('Forbidden');
          }

          // 기타 에러 처리
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || `요청 실패: ${response.status} ${response.statusText}`;
          throw new Error(errorMessage);
        }

        // 빈 응답 처리
        if (response.status === 204) {
          return null;
        }

        // JSON 응답 처리
        return await response.json();
      } catch (error) {
        // 로딩 숨김
        if (options.showLoading !== false) {
          this.hideLoading();
        }

        // 네트워크 오류 처리
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          Utils.message.error('네트워크 오류: 서버에 연결할 수 없습니다.');
        } else if (!['Unauthorized', 'Forbidden'].includes(error.message)) {
          Utils.message.error(error.message || '요청 처리 중 오류가 발생했습니다.');
        }

        throw error;
      }
    },

    /**
     * GET 요청
     * @param {string} url - 요청 URL
     * @param {Object} options - fetch 옵션
     * @returns {Promise} fetch 응답 Promise
     */
    async get(url, options = {}) {
      return this.fetch(url, {
        method: 'GET',
        ...options
      });
    },

    /**
     * POST 요청
     * @param {string} url - 요청 URL
     * @param {Object} data - 전송할 데이터
     * @param {Object} options - fetch 옵션
     * @returns {Promise} fetch 응답 Promise
     */
    async post(url, data, options = {}) {
      return this.fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        ...options
      });
    },

    /**
     * PUT 요청
     * @param {string} url - 요청 URL
     * @param {Object} data - 전송할 데이터
     * @param {Object} options - fetch 옵션
     * @returns {Promise} fetch 응답 Promise
     */
    async put(url, data, options = {}) {
      return this.fetch(url, {
        method: 'PUT',
        body: JSON.stringify(data),
        ...options
      });
    },

    /**
     * DELETE 요청
     * @param {string} url - 요청 URL
     * @param {Object} options - fetch 옵션
     * @returns {Promise} fetch 응답 Promise
     */
    async delete(url, options = {}) {
      return this.fetch(url, {
        method: 'DELETE',
        ...options
      });
    },

    /**
     * 로딩 오버레이 표시
     */
    showLoading() {
      const loadingEl = document.getElementById('loadingOverlay');
      if (loadingEl) {
        loadingEl.style.display = 'flex';
      }
    },

    /**
     * 로딩 오버레이 숨김
     */
    hideLoading() {
      const loadingEl = document.getElementById('loadingOverlay');
      if (loadingEl) {
        loadingEl.style.display = 'none';
      }
    }
  },

  /**
   * 폼 관련 유틸리티
   */
  form: {
    /**
     * 폼 필드 유효성 검사
     * @param {HTMLFormElement} form - 검사할 폼 요소
     * @returns {boolean} 유효성 여부
     */
    validate(form) {
      if (!form) return false;
      
      // HTML5 내장 유효성 검사 사용
      if (form.checkValidity()) {
        return true;
      } else {
        // 첫 번째 오류 필드에 포커스
        const invalidField = form.querySelector(':invalid');
        if (invalidField) {
          invalidField.focus();
        }
        return false;
      }
    },

    /**
     * 폼 데이터를 객체로 변환
     * @param {HTMLFormElement} form - 변환할 폼 요소
     * @returns {Object} 폼 데이터 객체
     */
    getValues(form) {
      if (!form) return {};
      
      const formData = new FormData(form);
      const data = {};
      
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }
      
      return data;
    },

    /**
     * 객체 데이터로 폼 필드 설정
     * @param {HTMLFormElement} form - 대상 폼 요소
     * @param {Object} data - 설정할 데이터 객체
     */
    setValues(form, data) {
      if (!form || !data) return;
      
      for (const [key, value] of Object.entries(data)) {
        const field = form.querySelector(`[name="${key}"]`);
        if (field) {
          // 폼 요소 유형에 따라 처리
          if (field.type === 'checkbox') {
            field.checked = Boolean(value);
          } else if (field.type === 'radio') {
            const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
            if (radio) {
              radio.checked = true;
            }
          } else if (field.tagName === 'SELECT') {
            field.value = value || '';
          } else if (field.tagName === 'TEXTAREA') {
            field.value = value || '';
          } else {
            field.value = value || '';
          }
        }
      }
    },

    /**
     * 폼 초기화
     * @param {HTMLFormElement} form - 초기화할 폼 요소
     */
    reset(form) {
      if (form) {
        form.reset();
      }
    }
  },

  /**
   * 상태 관련 유틸리티
   */
  status: {
    /**
     * 상태 코드에 따른 텍스트 반환
     * @param {string} status - 상태 코드
     * @returns {string} 상태 텍스트
     */
    getText(status) {
      const statusMap = {
        'WAITING': '대기',
        'PENDING': '대기',
        'IN_PROGRESS': '진행',
        'COMPLETE': '완료',
        'ISSUE': '이슈',
        'CANCEL': '취소'
      };
      
      return statusMap[status] || status;
    },

    /**
     * 상태 코드에 따른 CSS 클래스 반환
     * @param {string} status - 상태 코드
     * @returns {string} CSS 클래스명
     */
    getClass(status) {
      const classMap = {
        'WAITING': 'status-waiting',
        'PENDING': 'status-waiting',
        'IN_PROGRESS': 'status-progress',
        'COMPLETE': 'status-complete',
        'ISSUE': 'status-issue',
        'CANCEL': 'status-cancel'
      };
      
      return classMap[status] || '';
    }
  },

  /**
   * 우편번호 관련 유틸리티
   */
  postal: {
    /**
     * 우편번호 자동 보완 (4자리 -> 5자리)
     * @param {string} code - 우편번호
     * @returns {string} 보완된 우편번호
     */
    formatCode(code) {
      if (!code) return '';
      
      const cleaned = code.replace(/[^0-9]/g, '');
      
      // 4자리인 경우 앞에 0 추가
      if (cleaned.length === 4) {
        return '0' + cleaned;
      }
      
      return cleaned;
    }
  },

  /**
   * 문자열 유틸리티
   */
  string: {
    /**
     * 텍스트를 일정 길이로 자르고 말줄임표 처리
     * @param {string} text - 원본 텍스트
     * @param {number} maxLength - 최대 길이
     * @returns {string} 처리된 텍스트
     */
    truncate(text, maxLength = 50) {
      if (!text) return '';
      
      if (text.length <= maxLength) {
        return text;
      }
      
      return text.substring(0, maxLength) + '...';
    }
  },

  /**
   * DOM 유틸리티
   */
  dom: {
    /**
     * 클립보드에 텍스트 복사
     * @param {string} text - 복사할 텍스트
     * @returns {Promise<boolean>} 성공 여부
     */
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        Utils.message.success('복사되었습니다.');
        return true;
      } catch (err) {
        console.error('클립보드 복사 실패:', err);
        Utils.message.error('클립보드 복사에 실패했습니다.');
        return false;
      }
    }
  }
};

// 글로벌 스코프에 Utils 노출
window.Utils = Utils;

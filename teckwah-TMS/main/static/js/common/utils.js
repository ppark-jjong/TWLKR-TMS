/**
 * 공통 유틸리티 함수 모음
 * 날짜 포맷, 숫자 포맷, 문자열 처리 등 범용 함수를 제공합니다.
 */

const Utils = {
  /**
   * 날짜를 지정된 포맷으로 변환
   * @param {Date|string} date - 변환할 날짜 또는 날짜 문자열
   * @param {string} format - 포맷 (기본값: 'YYYY-MM-DD')
   * @returns {string} 포맷된 날짜 문자열
   */
  formatDate: function(date, format = 'YYYY-MM-DD') {
    if (!date) return '-';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) return '-';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes);
  },
  
  /**
   * 숫자에 천 단위 구분자 추가
   * @param {number} num - 포맷할 숫자
   * @returns {string} 포맷된 숫자 문자열
   */
  formatNumber: function(num) {
    if (num === null || num === undefined) return '-';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },
  
  /**
   * 문자열 자르기 (말줄임표 추가)
   * @param {string} str - 원본 문자열
   * @param {number} maxLength - 최대 길이
   * @returns {string} 잘린 문자열
   */
  truncateString: function(str, maxLength) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  },
  
  /**
   * URL 파라미터 가져오기
   * @param {string} name - 파라미터 이름
   * @returns {string|null} 파라미터 값 또는 null
   */
  getUrlParam: function(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  },
  
  /**
   * URL 파라미터 설정하기 (현재 URL 업데이트)
   * @param {string} name - 파라미터 이름
   * @param {string} value - 파라미터 값
   * @param {boolean} reload - 페이지 새로고침 여부
   */
  setUrlParam: function(name, value, reload = false) {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(name, value);
    } else {
      url.searchParams.delete(name);
    }
    
    window.history.replaceState({}, '', url);
    
    if (reload) {
      window.location.reload();
    }
  },
  
  /**
   * 엘리먼트 표시/숨김 토글
   * @param {HTMLElement|string} el - 대상 엘리먼트 또는 셀렉터
   * @param {boolean} show - 표시 여부
   */
  toggleElement: function(el, show) {
    const element = typeof el === 'string' ? document.querySelector(el) : el;
    if (!element) return;
    
    if (show === undefined) {
      element.style.display = element.style.display === 'none' ? '' : 'none';
    } else {
      element.style.display = show ? '' : 'none';
    }
  },
  
  /**
   * 디바운스 함수 (연속 호출 방지)
   * @param {Function} func - 실행할 함수
   * @param {number} wait - 대기 시간 (ms)
   * @returns {Function} 디바운스된 함수
   */
  debounce: function(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
};

// 필요한 경우 전역 접근을 위해 window 객체에 등록
window.Utils = Utils;

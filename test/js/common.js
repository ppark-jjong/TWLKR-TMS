// 공통 유틸리티 함수

/**
 * 모달 창을 토글합니다.
 * @param {string} modalId - 모달 요소의 ID
 * @param {boolean} show - 표시 여부
 */
function toggleModal(modalId, show) {
  const modal = document.getElementById(modalId);
  if (show) {
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
}

/**
 * 현재 날짜와 시간을 포맷팅된 문자열로 반환합니다.
 * @param {boolean} includeSeconds - 초 포함 여부
 * @returns {string} 포맷팅된 날짜/시간 문자열 (YYYY-MM-DD HH:MM:SS)
 */
function getCurrentDateTime(includeSeconds = true) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  if (includeSeconds) {
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 날짜 문자열을 포맷팅합니다.
 * @param {string} dateStr - 날짜 문자열
 * @param {string} format - 포맷 (기본값: YYYY-MM-DD)
 * @returns {string} 포맷팅된 날짜 문자열
 */
function formatDate(dateStr, format = 'YYYY-MM-DD') {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // 포맷에 따라 다르게 반환
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY-MM-DD HH:MM':
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case 'YYYY-MM-DD HH:MM:SS':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'MM-DD HH:MM':
      return `${month}-${day} ${hours}:${minutes}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * 전화번호를 포맷팅합니다.
 * @param {string} phone - 전화번호
 * @returns {string} 포맷팅된 전화번호 (010-1234-5678)
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';

  // 숫자만 추출
  const cleaned = ('' + phone).replace(/\D/g, '');

  // 전화번호 형식 적용
  const match = cleaned.match(/^(\d{3})(\d{3,4})(\d{4})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  return phone;
}

/**
 * 숫자에 천단위 콤마를 추가합니다.
 * @param {number} number - 숫자
 * @returns {string} 천단위 콤마가 추가된 문자열
 */
function formatNumber(number) {
  if (number === undefined || number === null) return '';
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 문자열의 바이트 길이를 계산합니다.
 * @param {string} str - 문자열
 * @returns {number} 바이트 길이
 */
function getByteLength(str) {
  if (!str) return 0;

  let byte = 0;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode <= 0x00007f) {
      byte += 1;
    } else if (charCode <= 0x0007ff) {
      byte += 2;
    } else if (charCode <= 0x00ffff) {
      byte += 3;
    } else {
      byte += 4;
    }
  }

  return byte;
}

/**
 * 문자열을 제한된 길이로 자르고 말줄임표를 추가합니다.
 * @param {string} str - 문자열
 * @param {number} maxLength - 최대 길이
 * @returns {string} 자른 문자열
 */
function truncateString(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * HTML 태그를 이스케이프합니다 (XSS 방지)
 * @param {string} html - HTML 문자열
 * @returns {string} 이스케이프된 문자열
 */
function escapeHtml(html) {
  if (!html) return '';
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * URL 파라미터를 파싱합니다.
 * @returns {Object} 파라미터 객체
 */
function getUrlParams() {
  const params = {};
  const queryString = window.location.search.substring(1);
  const pairs = queryString.split('&');

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split('=');
    if (pair[0]) {
      params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
  }

  return params;
}

/**
 * 배열을 특정 키를 기준으로 정렬합니다.
 * @param {Array} array - 배열
 * @param {string} key - 정렬 키
 * @param {boolean} ascending - 오름차순 여부
 * @returns {Array} 정렬된 배열
 */
function sortArrayByKey(array, key, ascending = true) {
  if (!array || !array.length) return [];

  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return ascending ? -1 : 1;
    if (a[key] > b[key]) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * 배열을 특정 조건으로 필터링합니다.
 * @param {Array} array - 배열
 * @param {Function} predicate - 필터 함수
 * @returns {Array} 필터링된 배열
 */
function filterArray(array, predicate) {
  if (!array || !array.length) return [];
  return array.filter(predicate);
}

/**
 * 객체 깊은 복사
 * @param {Object} obj - 복사할 객체
 * @returns {Object} 복사된 객체
 */
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 로컬 스토리지에 데이터 저장
 * @param {string} key - 키
 * @param {any} value - 값 (객체는 자동으로 JSON으로 변환)
 */
function setLocalStorage(key, value) {
  try {
    const serializedValue =
      typeof value === 'object' ? JSON.stringify(value) : value;
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error('로컬 스토리지 저장 오류:', error);
  }
}

/**
 * 로컬 스토리지에서 데이터 가져오기
 * @param {string} key - 키
 * @param {any} defaultValue - 기본값
 * @returns {any} 값 (JSON은 자동으로 파싱)
 */
function getLocalStorage(key, defaultValue = null) {
  try {
    const serializedValue = localStorage.getItem(key);
    if (serializedValue === null) return defaultValue;

    // JSON 파싱 시도
    try {
      return JSON.parse(serializedValue);
    } catch (e) {
      // JSON이 아니면 원래 값 반환
      return serializedValue;
    }
  } catch (error) {
    console.error('로컬 스토리지 조회 오류:', error);
    return defaultValue;
  }
}

/**
 * 로컬 스토리지에서 데이터 삭제
 * @param {string} key - 키
 */
function removeLocalStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('로컬 스토리지 삭제 오류:', error);
  }
}

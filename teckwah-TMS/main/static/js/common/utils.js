/**
 * 공통 유틸리티 함수 모음
 */

// 날짜 형식 변환 (YYYY-MM-DD)
function formatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// 날짜 및 시간 형식 변환 (YYYY-MM-DD HH:MM:SS)
function formatDateTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 날짜 및 시간을 datetime-local 입력용 형식으로 변환 (YYYY-MM-DDTHH:MM)
function formatDateTimeForInput(date) {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
function getTodayDate() {
  const today = formatDate(new Date());
  console.log('오늘 날짜:', today);
  return today;
}

// 우편번호 형식 검증 (5자리 숫자)
function validatePostalCode(code) {
  if (!code) return false;
  
  // 5자리 숫자인지 확인
  const regex = /^[0-9]{5}$/;
  return regex.test(code);
}

// 우편번호 자동 보완 (4자리일 경우 앞에 0 추가)
function formatPostalCode(code) {
  if (!code) return '';
  
  // 숫자만 추출
  const numericCode = String(code).replace(/[^0-9]/g, '');
  
  // 4자리이면 앞에 0 추가
  if (numericCode.length === 4) {
    return '0' + numericCode;
  }
  
  return numericCode;
}

// 연락처 형식 검증 (010-XXXX-XXXX)
function validateContact(contact) {
  if (!contact) return false;
  
  const regex = /^010-\d{4}-\d{4}$/;
  return regex.test(contact);
}

// 연락처 형식 자동 변환 (01012345678 -> 010-1234-5678)
function formatContact(contact) {
  if (!contact) return '';
  
  // 숫자만 추출
  const numericContact = String(contact).replace(/[^0-9]/g, '');
  
  // 길이가 11자리이고 010으로 시작하는 경우
  if (numericContact.length === 11 && numericContact.startsWith('010')) {
    return `010-${numericContact.slice(3, 7)}-${numericContact.slice(7)}`;
  }
  
  return contact;
}

// localStorage에 데이터 저장
function saveToLocalStorage(key, data) {
  try {
    // 데이터 저장 시도
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`localStorage에 저장 성공: ${key}`, data);
    return true;
  } catch (error) {
    // 오류 세부 정보 기록
    console.error(`localStorage 저장 오류 (${key}):`, error);
    
    // localStorage 접근 가능 여부 확인
    try {
      const temp = '_test_' + Date.now();
      localStorage.setItem(temp, temp);
      localStorage.removeItem(temp);
      console.warn('localStorage는 접근 가능하지만 데이터 저장에 실패했습니다. 데이터 크기 또는 형식 문제일 수 있습니다.');
    } catch (e) {
      console.error('localStorage에 접근할 수 없습니다. 프라이빗 브라우징 모드이거나 브라우저 설정 문제일 수 있습니다.');
    }
    
    return false;
  }
}

// localStorage에서 데이터 불러오기
function loadFromLocalStorage(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      console.log(`localStorage에서 ${key}에 대한 데이터를 찾을 수 없음, 기본값 사용:`, defaultValue);
      return defaultValue;
    }
    
    const parsedData = JSON.parse(data);
    console.log(`localStorage에서 로드 성공: ${key}`, parsedData);
    return parsedData;
  } catch (error) {
    console.error(`localStorage 로드 오류 (${key}):`, error);
    console.warn('기본값을 반환합니다:', defaultValue);
    return defaultValue;
  }
}

// URL 파라미터 추출
function getUrlParameter(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// URL 파라미터 업데이트 및 페이지 이동
function updateUrlAndNavigate(params = {}) {
  const url = new URL(window.location.href);
  
  // 파라미터 업데이트
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  
  // 페이지 이동
  window.location.href = url.toString();
}

// 문자열 제한 (최대 길이 초과 시 '...' 추가)
function truncateString(str, maxLength = 50) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  
  return str.substring(0, maxLength) + '...';
}

// Element를 찾거나 null 반환 (querySelector 래퍼)
function findElement(selector) {
  return document.querySelector(selector);
}

// Element를 모두 찾거나 빈 배열 반환 (querySelectorAll 래퍼)
function findAllElements(selector) {
  return Array.from(document.querySelectorAll(selector));
}

// Element의 위치로 스크롤
function scrollToElement(element, offset = 0) {
  if (!element) return;
  
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  window.scrollTo({
    top: scrollTop + rect.top - offset,
    behavior: 'smooth'
  });
}

// 숫자 포맷팅 (천 단위 구분자)
function formatNumber(num) {
  if (num === null || num === undefined) return '';
  return new Intl.NumberFormat().format(num);
}

// 객체를 FormData로 변환
function objectToFormData(obj) {
  const formData = new FormData();
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });
  
  return formData;
}

// FormData를 객체로 변환
function formDataToObject(formData) {
  const obj = {};
  
  for (const [key, value] of formData.entries()) {
    obj[key] = value;
  }
  
  return obj;
}

// 문서에서 모든 폼 입력 요소 비활성화
function disableAllInputs() {
  const inputs = document.querySelectorAll('input, select, textarea, button');
  inputs.forEach(input => {
    input.disabled = true;
  });
}

// 문서에서 모든 폼 입력 요소 활성화
function enableAllInputs() {
  const inputs = document.querySelectorAll('input, select, textarea, button');
  inputs.forEach(input => {
    input.disabled = false;
  });
}

// 공개 API
window.Utils = {
  formatDate,
  formatDateTime,
  formatDateTimeForInput,
  getTodayDate,
  validatePostalCode,
  formatPostalCode,
  validateContact,
  formatContact,
  saveToLocalStorage,
  loadFromLocalStorage,
  getUrlParameter,
  updateUrlAndNavigate,
  truncateString,
  findElement,
  findAllElements,
  scrollToElement,
  formatNumber,
  objectToFormData,
  formDataToObject,
  disableAllInputs,
  enableAllInputs
};

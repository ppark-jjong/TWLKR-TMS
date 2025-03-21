// src/utils/AppUtils.js
import dayjs from 'dayjs';

/**
 * 애플리케이션 공통 유틸리티 함수 모음
 */
const AppUtils = {
  /**
   * 날짜 시간 포맷팅
   * @param {string|Date} date - 날짜
   * @param {string} format - 포맷 (기본값: YYYY-MM-DD HH:mm)
   * @returns {string} 포맷된 날짜 문자열
   */
  formatDateTime: (date, format = 'YYYY-MM-DD HH:mm') => {
    if (!date) return '-';
    return dayjs(date).format(format);
  },

  /**
   * 전화번호 포맷팅
   * @param {string} phone - 전화번호
   * @returns {string} 포맷된 전화번호
   */
  formatPhoneNumber: (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.length < 4) return cleaned;
    if (cleaned.length < 7) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(
      7,
      11
    )}`;
  },

  /**
   * 숫자 포맷팅 (천단위 콤마)
   * @param {number} number - 숫자
   * @returns {string} 포맷된 숫자
   */
  formatNumber: (number) => {
    if (number === undefined || number === null) return '-';
    return number.toLocaleString('ko-KR');
  },

  /**
   * 거리 포맷팅
   * @param {number} distance - 거리(km)
   * @returns {string} 포맷된 거리
   */
  formatDistance: (distance) => {
    if (!distance) return '-';
    return `${distance}km`;
  },

  /**
   * 소요시간 포맷팅
   * @param {number} duration - 소요시간(분)
   * @returns {string} 포맷된 소요시간
   */
  formatDuration: (duration) => {
    if (!duration) return '-';
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    if (hours === 0) return `${minutes}분`;
    return `${hours}시간 ${minutes}분`;
  },

  /**
   * ETA 선택 제한 (현재 시간 이후만 선택 가능)
   * @param {dayjs} current - 현재 선택된 날짜
   * @returns {boolean} 비활성화 여부
   */
  disabledDate: (current) => {
    return current && current < dayjs().startOf('day');
  },

  /**
   * 시간 선택 제한 (오늘 날짜인 경우 현재 시간 이전 비활성화)
   * @param {dayjs} current - 현재 선택된 날짜
   * @returns {Object} 비활성화 시간 및 분 설정
   */
  disabledTime: (current) => {
    const now = dayjs();
    if (current && current.isSame(now, 'day')) {
      return {
        disabledHours: () => Array.from({ length: now.hour() }, (_, i) => i),
        disabledMinutes: (hour) =>
          hour === now.hour()
            ? Array.from({ length: now.minute() }, (_, i) => i)
            : [],
      };
    }
    return {};
  },

  /**
   * 연락처 형식 검증
   * @param {string} contact - 검증할 연락처
   * @returns {boolean} 유효성 여부
   */
  isValidContact: (contact) => {
    if (!contact) return false;
    return /^\d{2,3}-\d{3,4}-\d{4}$/.test(contact);
  },

  /**
   * 우편번호 형식 검증
   * @param {string} postalCode - 검증할 우편번호
   * @returns {boolean} 유효성 여부
   */
  isValidPostalCode: (postalCode) => {
    if (!postalCode) return false;
    return /^\d{5}$/.test(postalCode);
  },

  /**
   * URL 파라미터 추출
   * @param {string} paramName - 추출할 파라미터 이름
   * @returns {string|null} 파라미터 값
   */
  getUrlParam: (paramName) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(paramName);
  },

  /**
   * 객체를 쿼리 문자열로 변환
   * @param {Object} params - 변환할 객체
   * @returns {string} 쿼리 문자열
   */
  objectToQueryString: (params) => {
    return Object.keys(params)
      .filter(
        (key) =>
          params[key] !== undefined &&
          params[key] !== null &&
          params[key] !== ''
      )
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join('&');
  },

  /**
   * 락 타입에 따른 표시 텍스트 반환
   * @param {string} lockType - 락 타입
   * @returns {string} 표시 텍스트
   */
  getLockTypeText: (lockType) => {
    switch (lockType) {
      case 'EDIT':
        return '편집';
      case 'STATUS':
        return '상태 변경';
      case 'ASSIGN':
        return '배차';
      case 'REMARK':
        return '메모 작성';
      default:
        return '수정';
    }
  },
};

export default AppUtils;

// src/utils/validators.js - 모든 유효성 검증 함수 통합
import dayjs from 'dayjs';

// 메시지 템플릿은 통합된 messages.js에서 가져오지만,
// 순환 의존성 방지를 위해 여기서는 임시로 정의
const MessageTemplates = {
  VALIDATION: {
    CONTACT_FORMAT: '올바른 연락처 형식이 아닙니다',
    POSTAL_FORMAT: '올바른 우편번호 형식이 아닙니다',
    FUTURE_DATE: '미래 날짜는 선택할 수 없습니다',
    REQUIRED_FIELD: (field) => `${field}을(를) 입력해주세요`,
    NUMERIC_ONLY: '숫자만 입력 가능합니다',
  },
};

/**
 * 연락처 형식 검증
 * @param {string} contact - 검증할 연락처
 * @returns {string|undefined} - 에러 메시지 또는 undefined
 */
export const validateContact = (contact) => {
  if (!contact) return undefined;
  return /^\d{2,3}-\d{3,4}-\d{4}$/.test(contact)
    ? undefined
    : MessageTemplates.VALIDATION.CONTACT_FORMAT;
};

/**
 * 우편번호 형식 검증
 * @param {string} postalCode - 검증할 우편번호
 * @returns {string|undefined} - 에러 메시지 또는 undefined
 */
export const validatePostalCode = (postalCode) => {
  if (!postalCode) return undefined;
  return /^\d{5}$/.test(postalCode)
    ? undefined
    : MessageTemplates.VALIDATION.POSTAL_FORMAT;
};

/**
 * ETA 시간 검증 (현재 이후인지)
 * @param {dayjs} eta - 검증할 ETA 시간
 * @returns {string|undefined} - 에러 메시지 또는 undefined
 */
export const validateEta = (eta) => {
  if (!eta) return undefined;
  return eta.isBefore(dayjs())
    ? MessageTemplates.VALIDATION.FUTURE_DATE
    : undefined;
};

/**
 * 필수 입력값 검증
 * @param {any} value - 검증할 값
 * @param {string} fieldName - 필드 이름
 * @returns {string|undefined} - 에러 메시지 또는 undefined
 */
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return MessageTemplates.VALIDATION.REQUIRED_FIELD(fieldName);
  }
  return undefined;
};

/**
 * 대시보드 생성/수정 폼 검증
 * @param {Object} values - 폼 값
 * @returns {Object} - 필드별 에러 메시지
 */
export const validateDashboardForm = (values) => {
  const errors = {};

  // 필수 필드 검증
  const requiredFields = {
    type: '배송 종류',
    order_no: '주문번호',
    warehouse: '출발 허브',
    sla: 'SLA',
    eta: 'ETA',
    postal_code: '우편번호',
    address: '주소',
    customer: '수령인',
    contact: '연락처',
  };

  Object.entries(requiredFields).forEach(([field, label]) => {
    const error = validateRequired(values[field], label);
    if (error) errors[field] = error;
  });

  // 개별 필드 검증
  if (values.contact) {
    const contactError = validateContact(values.contact);
    if (contactError) errors.contact = contactError;
  }

  if (values.postal_code) {
    const postalError = validatePostalCode(values.postal_code);
    if (postalError) errors.postal_code = postalError;
  }

  if (values.eta) {
    const etaError = validateEta(values.eta);
    if (etaError) errors.eta = etaError;
  }

  // 주문번호는 숫자만 입력 가능
  if (values.order_no && !/^\d+$/.test(values.order_no)) {
    errors.order_no = MessageTemplates.VALIDATION.NUMERIC_ONLY;
  }

  return errors;
};

/**
 * 배차 정보 폼 검증
 * @param {Object} values - 폼 값
 * @returns {Object} - 필드별 에러 메시지
 */
export const validateAssignmentForm = (values) => {
  const errors = {};

  // 필수 필드 검증
  if (!values.driver_name?.trim()) {
    errors.driver_name =
      MessageTemplates.VALIDATION.REQUIRED_FIELD('배송 담당자');
  }

  if (!values.driver_contact?.trim()) {
    errors.driver_contact =
      MessageTemplates.VALIDATION.REQUIRED_FIELD('연락처');
  } else {
    const contactError = validateContact(values.driver_contact);
    if (contactError) errors.driver_contact = contactError;
  }

  return errors;
};

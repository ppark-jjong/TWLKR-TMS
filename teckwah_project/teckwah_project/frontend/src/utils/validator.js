// frontend/src/utils/validator.js
import dayjs from 'dayjs';
import { MessageTemplates } from './message';

export const validateContact = (contact) => {
  if (!contact) return undefined;
  return /^\d{2,3}-\d{3,4}-\d{4}$/.test(contact)
    ? undefined
    : MessageTemplates.VALIDATION.CONTACT_FORMAT;
};

export const validatePostalCode = (postalCode) => {
  if (!postalCode) return undefined;
  return /^\d{5}$/.test(postalCode)
    ? undefined
    : MessageTemplates.VALIDATION.POSTAL_FORMAT;
};

export const validateEta = (eta) => {
  if (!eta) return undefined;
  return eta.isBefore(dayjs())
    ? MessageTemplates.VALIDATION.FUTURE_DATE
    : undefined;
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return MessageTemplates.VALIDATION.REQUIRED_FIELD(fieldName);
  }
  return undefined;
};

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

  return errors;
};

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

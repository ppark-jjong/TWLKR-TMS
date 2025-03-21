// src/utils/Validator.js
import { MessageTemplates } from './Constants';
import AppUtils from './AppUtils';

/**
 * 통합 유효성 검증 유틸리티
 */
class Validator {
  /**
   * 대시보드 생성/수정 폼 검증
   * @param {Object} values - 폼 값
   * @returns {Object} - 필드별 에러 메시지
   */
  static validateDashboardForm(values) {
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
      const error = this.validateRequired(values[field], label);
      if (error) errors[field] = error;
    });

    // 우편번호 검증
    if (values.postal_code && !AppUtils.isValidPostalCode(values.postal_code)) {
      errors.postal_code = MessageTemplates.VALIDATION.POSTAL_FORMAT;
    }

    // 연락처 검증
    if (values.contact && !AppUtils.isValidContact(values.contact)) {
      errors.contact = MessageTemplates.VALIDATION.CONTACT_FORMAT;
    }

    // 주문번호는 숫자만 입력 가능
    if (values.order_no && !/^\d+$/.test(values.order_no)) {
      errors.order_no = MessageTemplates.VALIDATION.NUMERIC_ONLY;
    }

    return errors;
  }

  /**
   * 배차 정보 폼 검증
   * @param {Object} values - 폼 값
   * @returns {Object} - 필드별 에러 메시지
   */
  static validateAssignmentForm(values) {
    const errors = {};

    // 필수 필드 검증
    if (!values.driver_name?.trim()) {
      errors.driver_name =
        MessageTemplates.VALIDATION.REQUIRED_FIELD('배송 담당자');
    }

    if (!values.driver_contact?.trim()) {
      errors.driver_contact =
        MessageTemplates.VALIDATION.REQUIRED_FIELD('연락처');
    } else if (!AppUtils.isValidContact(values.driver_contact)) {
      errors.driver_contact = MessageTemplates.VALIDATION.CONTACT_FORMAT;
    }

    return errors;
  }

  /**
   * 필수 입력값 검증
   * @param {any} value - 검증할 값
   * @param {string} fieldName - 필드 이름
   * @returns {string|undefined} - 에러 메시지 또는 undefined
   */
  static validateRequired(value, fieldName) {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return MessageTemplates.VALIDATION.REQUIRED_FIELD(fieldName);
    }
    return undefined;
  }
}

export default Validator;

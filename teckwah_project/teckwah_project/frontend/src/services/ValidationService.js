// frontend/src/services/ValidationService.js
import dayjs from 'dayjs';
import { MESSAGES } from '../utils/Constants';

class ValidationService {
  // 상태 변경 검증
  validateStatusChange(currentStatus, newStatus, isAdmin = false) {
    // 관리자는 모든 상태 변경 가능
    if (isAdmin) return true;

    const ALLOWED_TRANSITIONS = {
      WAITING: ['IN_PROGRESS', 'CANCEL'],
      IN_PROGRESS: ['COMPLETE', 'ISSUE', 'CANCEL'],
      COMPLETE: [],
      ISSUE: [],
      CANCEL: [],
    };

    return ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
  }

  // 배차 가능 여부 검증
  validateAssignment(selectedRows) {
    const invalidItems = selectedRows.filter((row) => row.status !== 'WAITING');
    if (invalidItems.length > 0) {
      const orderNos = invalidItems.map((item) => item.order_no).join(', ');
      return {
        isValid: false,
        message: `다음 주문은 대기 상태가 아니어서 배차할 수 없습니다: ${orderNos}`,
      };
    }
    return { isValid: true };
  }

  // 연락처 형식 검증
  validateContact(contact) {
    if (!contact) return true;
    return /^\d{2,3}-\d{3,4}-\d{4}$/.test(contact);
  }

  // 우편번호 검증
  validatePostalCode(postalCode) {
    return /^\d{5}$/.test(postalCode);
  }

  // ETA 검증
  validateEta(eta) {
    if (!eta) return false;
    return eta.isAfter(dayjs());
  }

  // 대시보드 생성 폼 검증
  validateDashboardForm(values) {
    const errors = {};

    // 필수 필드 검증
    const requiredFields = {
      type: '배송 종류',
      warehouse: '출발 허브',
      order_no: '주문번호',
      eta: 'ETA',
      postal_code: '우편번호',
      address: '주소',
      customer: '수령인',
    };

    Object.entries(requiredFields).forEach(([field, label]) => {
      if (!values[field]) {
        errors[field] = `${label}을(를) 입력해주세요`;
      }
    });

    // 주문번호 형식 검증
    if (values.order_no && !/^\d+$/.test(values.order_no)) {
      errors.order_no = '주문번호는 숫자만 입력 가능합니다';
    }

    // 우편번호 형식 검증
    if (values.postal_code && !this.validatePostalCode(values.postal_code)) {
      errors.postal_code = '우편번호는 5자리 숫자여야 합니다';
    }

    // 연락처 형식 검증
    if (values.contact && !this.validateContact(values.contact)) {
      errors.contact = '올바른 연락처 형식이 아닙니다';
    }

    // ETA 검증
    if (values.eta && !this.validateEta(values.eta)) {
      errors.eta = 'ETA는 현재 시간 이후여야 합니다';
    }

    return errors;
  }

  // 배차 정보 검증
  validateDriverAssignment(values) {
    const errors = {};

    if (!values.driver_name?.trim()) {
      errors.driver_name = '배송 담당자를 입력해주세요';
    }

    if (!values.driver_contact?.trim()) {
      errors.driver_contact = '연락처를 입력해주세요';
    } else if (!this.validateContact(values.driver_contact)) {
      errors.driver_contact = '올바른 연락처 형식이 아닙니다';
    }

    return errors;
  }
}

export default new ValidationService();

// frontend/src/utils/message.js
import { message } from 'antd';

export const MessageTypes = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
};

export const MessageKeys = {
  AUTH: {
    LOGIN: 'auth-login',
    LOGOUT: 'auth-logout',
    SESSION: 'auth-session',
    SESSION_EXPIRED: 'auth-session-expired',
    TOKEN_REFRESH: 'auth-token-refresh',
  },
  DASHBOARD: {
    LOAD: 'dashboard-load',
    CREATE: 'dashboard-create',
    UPDATE: 'dashboard-update',
    DELETE: 'dashboard-delete',
    DETAIL: 'dashboard-detail',
    STATUS: 'dashboard-status',
    ASSIGN: 'dashboard-assign',
    MEMO: 'dashboard-memo',
  },
  VISUALIZATION: {
    LOAD: 'visualization-load',
    DATE: 'visualization-date',
  },
};

export const MessageTemplates = {
  // 데이터 조회 관련
  DATA: {
    LOAD_SUCCESS: '데이터를 조회했습니다',
    LOAD_EMPTY: '조회된 데이터가 없습니다',
    LOAD_ERROR: '데이터 조회 중 오류가 발생했습니다',
    INVALID_DATE: '유효하지 않은 날짜입니다',
  },

  // 인증 관련
  AUTH: {
    LOGIN_SUCCESS: '로그인되었습니다',
    LOGIN_FAILED: '아이디 또는 비밀번호가 잘못되었습니다',
    LOGOUT_SUCCESS: '로그아웃되었습니다',
    SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요',
    TOKEN_REFRESH_ERROR: '인증 토큰 갱신에 실패했습니다',
    PERMISSION_DENIED: '접근 권한이 없습니다',
  },

  // 대시보드 관련
  DASHBOARD: {
    CREATE_SUCCESS: '대시보드가 생성되었습니다',
    CREATE_ERROR: '대시보드 생성 중 오류가 발생했습니다',
    STATUS_SUCCESS: (status) => `${status} 상태로 변경되었습니다`,
    STATUS_ERROR: '상태 변경 중 오류가 발생했습니다',
    DELETE_SUCCESS: '선택한 항목이 삭제되었습니다',
    DELETE_ERROR: '삭제 처리 중 오류가 발생했습니다',
    DETAIL_ERROR: '상세 정보 조회 중 오류가 발생했습니다',
    ASSIGN_SUCCESS: '배차 처리가 완료되었습니다',
    ASSIGN_ERROR: '배차 처리 중 오류가 발생했습니다',
    REMARK_SUCCESS: '메모가 업데이트되었습니다',
    REMARK_ERROR: '메모 업데이트 중 오류가 발생했습니다',
    INVALID_POSTAL: '올바른 우편번호 형식이 아닙니다',
    INVALID_PHONE: '올바른 연락처 형식이 아닙니다',
    INVALID_WAITING: (orderNos) =>
      `대기 상태가 아닌 주문이 포함되어 있습니다: ${orderNos}`,
  },

  // 유효성 검사 관련
  VALIDATION: {
    CONTACT_FORMAT: '올바른 연락처 형식이 아닙니다',
    REQUIRED_FIELD: (field) => `${field}을(를) 입력해주세요`,
    POSTAL_FORMAT: '올바른 우편번호 형식이 아닙니다',
    INVALID_DATE: '올바른 날짜를 선택해주세요',
    FUTURE_DATE: '미래 날짜는 선택할 수 없습니다',
    NUMERIC_ONLY: '숫자만 입력 가능합니다',
    MAX_LENGTH: (field, length) =>
      `${field}은(는) ${length}자를 초과할 수 없습니다`,
  },

  // 네트워크/서버 오류
  ERROR: {
    NETWORK: '네트워크 연결을 확인해주세요',
    SERVER: '서버 오류가 발생했습니다',
    TIMEOUT: '요청 시간이 초과되었습니다',
    UNKNOWN: '알 수 없는 오류가 발생했습니다',
  },

  // 처리 상태 관련
  PROCESSING: {
    LOADING: '처리 중...',
    SAVING: '저장 중...',
    DELETING: '삭제 중...',
    UPDATING: '업데이트 중...',
  },
};

class MessageService {
  static messageQueue = new Map();
  static processingMessageKeys = new Set();

  constructor() {
    this.defaultDuration = {
      [MessageTypes.SUCCESS]: 2,
      [MessageTypes.ERROR]: 3,
      [MessageTypes.INFO]: 2,
      [MessageTypes.WARNING]: 3,
    };
  }

  show(type, content, key, duration) {
    // 이미 표시 중인 메시지 키가 있으면 이전 메시지 제거
    if (key && MessageService.processingMessageKeys.has(key)) {
      message.destroy(key);
    }

    const finalDuration = duration ?? this.defaultDuration[type];

    message[type]({
      content,
      key,
      duration: finalDuration,
      onClose: () => {
        if (key) {
          MessageService.processingMessageKeys.delete(key);
        }
      },
    });

    if (key) {
      MessageService.processingMessageKeys.add(key);
    }
  }

  success(content, key) {
    this.show(MessageTypes.SUCCESS, content, key);
  }

  error(content, key) {
    this.show(MessageTypes.ERROR, content, key);
  }

  info(content, key) {
    this.show(MessageTypes.INFO, content, key);
  }

  warning(content, key) {
    this.show(MessageTypes.WARNING, content, key);
  }

  loading(content, key) {
    message.loading({
      content,
      key,
      duration: 0,
    });
  }

  loadingToSuccess(content, key) {
    message.loading({ content: MessageTemplates.PROCESSING.LOADING, key });
    setTimeout(() => {
      this.success(content, key);
    }, 500);
  }

  loadingToError(content, key) {
    message.loading({ content: MessageTemplates.PROCESSING.LOADING, key });
    setTimeout(() => {
      this.error(content, key);
    }, 500);
  }

  destroy(key) {
    if (key) {
      message.destroy(key);
      MessageService.processingMessageKeys.delete(key);
    } else {
      message.destroy();
      MessageService.processingMessageKeys.clear();
    }
  }
}

export default new MessageService();

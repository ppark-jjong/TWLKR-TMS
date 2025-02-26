// frontend/src/utils/message.js
import { message } from 'antd';

export const MessageTypes = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
  LOADING: 'loading',
};

export const MessageKeys = {
  AUTH: {
    LOGIN: 'auth-login',
    LOGOUT: 'auth-logout',
    SESSION: 'auth-session',
    SESSION_EXPIRED: 'auth-session-expired',
    PERMISSION: 'auth-permission',
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
  },

  // 네트워크/서버 오류
  ERROR: {
    NETWORK: '네트워크 연결을 확인해주세요',
    SERVER: '서버 오류가 발생했습니다',
    TIMEOUT: '요청 시간이 초과되었습니다',
  },

  // 인증 관련
  AUTH: {
    LOGIN_SUCCESS: '로그인되었습니다',
    LOGIN_FAILED: '아이디 또는 비밀번호가 잘못되었습니다',
    LOGOUT_SUCCESS: '로그아웃되었습니다',
    SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요',
  },
};

// 활성 메시지 관리
const activeMessages = new Map();

// 중복 메시지 방지 및 대기열 관리
class MessageService {
  constructor() {
    // 메시지 타입별 기본 지속 시간 (초)
    this.defaultDurations = {
      [MessageTypes.SUCCESS]: 2,
      [MessageTypes.ERROR]: 3,
      [MessageTypes.INFO]: 2,
      [MessageTypes.WARNING]: 3,
      [MessageTypes.LOADING]: 0, // 0은 수동으로 닫을 때까지 유지
    };
  }

  /**
   * 메시지 표시 기본 메서드
   */
  show(type, content, key, duration) {
    // 이미 표시 중인 메시지가 있으면 제거
    if (key && activeMessages.has(key)) {
      message.destroy(key);
    }

    const finalDuration = duration ?? this.defaultDurations[type];

    message[type]({
      content,
      key,
      duration: finalDuration,
      onClose: () => {
        if (key) {
          activeMessages.delete(key);
        }
      },
    });

    if (key) {
      activeMessages.set(key, type);
    }
  }

  /**
   * 성공 메시지
   */
  success(content, key) {
    this.show(MessageTypes.SUCCESS, content, key);
  }

  /**
   * 에러 메시지
   */
  error(content, key) {
    this.show(MessageTypes.ERROR, content, key);
  }

  /**
   * 정보 메시지
   */
  info(content, key) {
    this.show(MessageTypes.INFO, content, key);
  }

  /**
   * 경고 메시지
   */
  warning(content, key) {
    this.show(MessageTypes.WARNING, content, key);
  }

  /**
   * 로딩 메시지
   */
  loading(content, key) {
    this.show(MessageTypes.LOADING, content, key);
  }

  /**
   * 로딩에서 성공으로 상태 전환
   */
  loadingToSuccess(content, key) {
    if (key && activeMessages.has(key)) {
      message.success({
        content,
        key,
        duration: this.defaultDurations[MessageTypes.SUCCESS],
      });
      activeMessages.set(key, MessageTypes.SUCCESS);
    } else {
      this.success(content, key);
    }
  }

  /**
   * 로딩에서 에러로 상태 전환
   */
  loadingToError(content, key) {
    if (key && activeMessages.has(key)) {
      message.error({
        content,
        key,
        duration: this.defaultDurations[MessageTypes.ERROR],
      });
      activeMessages.set(key, MessageTypes.ERROR);
    } else {
      this.error(content, key);
    }
  }

  /**
   * 로딩에서 정보로 상태 전환
   */
  loadingToInfo(content, key) {
    if (key && activeMessages.has(key)) {
      message.info({
        content,
        key,
        duration: this.defaultDurations[MessageTypes.INFO],
      });
      activeMessages.set(key, MessageTypes.INFO);
    } else {
      this.info(content, key);
    }
  }

  /**
   * 특정 메시지 혹은 모든 메시지 제거
   */
  destroy(key) {
    if (key) {
      message.destroy(key);
      activeMessages.delete(key);
    } else {
      message.destroy();
      activeMessages.clear();
    }
  }

  /**
   * 모든 활성 메시지 목록 조회
   */
  getActiveMessages() {
    return Array.from(activeMessages.keys());
  }
}

export default new MessageService();

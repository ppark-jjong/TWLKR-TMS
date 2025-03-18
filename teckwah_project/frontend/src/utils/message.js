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
    SEARCH: 'dashboard-search',
    LOCK_ACQUIRE: 'dashboard-lock-acquire',
    LOCK_RELEASE: 'dashboard-lock-release',
    OPTIMISTIC_LOCK: 'dashboard-optimistic-lock',
    PESSIMISTIC_LOCK: 'dashboard-pessimistic-lock',
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
    SEARCH_SUCCESS: (count) => `검색 결과: ${count}건`,
    SEARCH_EMPTY: (keyword) =>
      `주문번호 "${keyword}"에 대한 검색 결과가 없습니다`,
    SEARCH_ERROR: '검색 중 오류가 발생했습니다',
    LOCK_ACQUIRE_SUCCESS: '편집 모드가 활성화되었습니다',
    LOCK_ACQUIRE_ERROR: '편집 모드 활성화에 실패했습니다',
    LOCK_RELEASE_SUCCESS: '편집 모드가 종료되었습니다',
    OPTIMISTIC_LOCK_ERROR:
      '다른 사용자가 이미 데이터를 수정했습니다. 최신 정보를 확인하세요.',
    PESSIMISTIC_LOCK_ERROR: (lockedBy, lockType) =>
      `현재 ${lockedBy}님이 ${lockType} 중입니다. 잠시 후 다시 시도해주세요.`,
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

    // 문자열이 아닌 경우 안전하게 처리
    const safeContent =
      typeof content === 'string'
        ? content
        : content?.toString?.() || '알 수 없는 메시지';

    message[type]({
      content: safeContent,
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
   * 로딩에서 경고로 상태 전환
   */
  loadingToWarning(content, key) {
    if (key && activeMessages.has(key)) {
      message.warning({
        content,
        key,
        duration: this.defaultDurations[MessageTypes.WARNING],
      });
      activeMessages.set(key, MessageTypes.WARNING);
    } else {
      this.warning(content, key);
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

  /**
   * API 응답에서 메시지 추출하여 표시
   * @param {Object} response - API 응답 객체
   * @param {string} key - 메시지 키
   * @param {string} defaultSuccessMessage - 기본 성공 메시지
   * @param {string} defaultErrorMessage - 기본 에러 메시지
   */
  handleApiResponse(response, key, defaultSuccessMessage, defaultErrorMessage) {
    if (!response) return;

    if (response.success) {
      this.loadingToSuccess(response.message || defaultSuccessMessage, key);
    } else {
      this.loadingToError(
        response.message || response.error?.detail || defaultErrorMessage,
        key
      );
    }
  }

  /**
   * 오류 응답 처리
   * @param {Error} error - 오류 객체
   * @param {string} key - 메시지 키
   * @param {string} defaultMessage - 기본 오류 메시지
   */
  handleApiError(error, key, defaultMessage) {
    const response = error.response?.data;
    const statusCode = error.response?.status;

    // 서버에서 메시지가 제공된 경우
    if (response?.message) {
      this.loadingToError(response.message, key);
      return;
    }

    // 오류 세부 정보가 제공된 경우
    if (response?.error?.detail) {
      this.loadingToError(response.error.detail, key);
      return;
    }

    // 상태 코드별 메시지
    if (statusCode) {
      switch (statusCode) {
        case 401:
          this.loadingToError('인증이 필요합니다. 다시 로그인해주세요.', key);
          break;
        case 403:
          this.loadingToError('접근 권한이 없습니다.', key);
          break;
        case 404:
          this.loadingToError('요청한 리소스를 찾을 수 없습니다.', key);
          break;
        case 409:
          this.loadingToError('다른 사용자가 이미 데이터를 수정했습니다.', key);
          break;
        case 423:
          this.loadingToError('다른 사용자가 편집 중입니다.', key);
          break;
        case 500:
          this.loadingToError('서버 오류가 발생했습니다.', key);
          break;
        default:
          this.loadingToError(defaultMessage, key);
      }
      return;
    }

    // 네트워크 오류
    if (error.request && !error.response) {
      this.loadingToError(
        '서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요.',
        key
      );
      return;
    }

    // 기본 메시지
    this.loadingToError(defaultMessage, key);
  }
}

export default new MessageService();

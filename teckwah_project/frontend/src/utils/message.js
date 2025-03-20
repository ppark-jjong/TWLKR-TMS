// src/utils/message.js
import { message } from 'antd';
import { useLogger } from './LogUtils';

// 로거 초기화
const logger = useLogger('MessageService');

/**
 * 메시지 타입 상수
 */
export const MessageTypes = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
  LOADING: 'loading',
};

/**
 * 메시지 키 상수
 * 중복 메시지 방지 및 메시지 업데이트를 위한 고유 식별자
 */
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
  ERROR: {
    BAD_REQUEST: 'error-bad-request',
    UNAUTHORIZED: 'error-unauthorized',
    FORBIDDEN: 'error-forbidden',
    NOT_FOUND: 'error-not-found',
    SERVER: 'error-server',
    NETWORK: 'error-network',
    TIMEOUT: 'error-timeout',
    UNKNOWN: 'error-unknown',
  },
  VALIDATION: {
    FIELD_ERROR: 'validation-field-error',
    FORM_ERROR: 'validation-form-error',
  },
};

/**
 * 메시지 템플릿 상수
 * 일관된 메시지 형식 제공
 */
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
    STATUS_SUCCESS: (status) => {
      const statusText =
        {
          WAITING: '대기',
          IN_PROGRESS: '진행',
          COMPLETE: '완료',
          ISSUE: '이슈',
          CANCEL: '취소',
        }[status] || status;

      return `${statusText} 상태로 변경되었습니다`;
    },
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

    // 메시지 우선순위 (높을수록 우선)
    this.messagePriority = {
      [MessageTypes.ERROR]: 5,
      [MessageTypes.WARNING]: 4,
      [MessageTypes.SUCCESS]: 3,
      [MessageTypes.INFO]: 2,
      [MessageTypes.LOADING]: 1,
    };

    // 대기 큐 (동시에 표시할 수 있는 메시지 수 제한용)
    this.messageQueue = [];

    // 최대 동시 표시 메시지 수
    this.maxVisibleMessages = 3;

    // 비관적 락 관련 메시지 표시 최소 간격 (ms)
    this.lockMessageDebounceTime = 5000;
    this.lastLockMessageTime = {};
  }

  /**
   * 메시지 표시 기본 메서드
   * @param {string} type - 메시지 타입
   * @param {string} content - 메시지 내용
   * @param {string} key - 메시지 고유 키
   * @param {number} duration - 메시지 표시 시간(초)
   */
  show(type, content, key, duration) {
    // 이미 표시 중인 메시지가 있으면 제거
    if (key && activeMessages.has(key)) {
      message.destroy(key);
    }

    // 기본 지속 시간 사용 (없으면 타입별 기본값)
    const finalDuration = duration ?? this.defaultDurations[type];

    // 문자열이 아닌 경우 안전하게 처리
    const safeContent =
      typeof content === 'string'
        ? content
        : content?.toString?.() || '알 수 없는 메시지';

    logger.debug(`메시지 표시(${type}): ${safeContent}`);

    // 메시지 표시
    message[type]({
      content: safeContent,
      key,
      duration: finalDuration,
      onClose: () => {
        if (key) {
          activeMessages.delete(key);
          logger.debug(
            `메시지 닫힘(${key}): ${activeMessages.size}개 활성 메시지 남음`
          );

          // 대기 큐에서 다음 메시지 처리
          this._processQueue();
        }
      },
    });

    // 활성 메시지에 추가
    if (key) {
      activeMessages.set(key, type);
    }
  }

  /**
   * 큐 처리 함수
   * 최대 표시 메시지 수를 초과하는 메시지는 큐에 저장
   * @private
   */
  _processQueue() {
    // 표시 가능한 공간이 있고, 큐에 대기 중인 메시지가 있는 경우
    while (
      activeMessages.size < this.maxVisibleMessages &&
      this.messageQueue.length > 0
    ) {
      const { type, content, key, duration } = this.messageQueue.shift();
      this.show(type, content, key, duration);
    }
  }

  /**
   * 메시지 추가 - 우선순위 및 큐 관리 적용
   * @param {string} type - 메시지 타입
   * @param {string} content - 메시지 내용
   * @param {string} key - 메시지 고유 키
   * @param {number} duration - 메시지 표시 시간(초)
   * @private
   */
  _addMessage(type, content, key, duration) {
    // 이미 활성 상태인 동일 키의 메시지가 있는 경우
    if (key && activeMessages.has(key)) {
      // 기존 메시지의 타입
      const existingType = activeMessages.get(key);

      // 새 메시지가 더 높은 우선순위를 가지는 경우에만 교체
      if (this.messagePriority[type] > this.messagePriority[existingType]) {
        this.show(type, content, key, duration);
        return;
      } else {
        // 동일하거나 낮은 우선순위면 무시
        logger.debug(
          `메시지 무시(${key}): 우선순위 낮음 (${type} < ${existingType})`
        );
        return;
      }
    }

    // 활성 메시지 수가 최대치를 초과하면 큐에 추가
    if (activeMessages.size >= this.maxVisibleMessages) {
      logger.debug(`메시지 큐 추가(${key}): ${content}`);
      this.messageQueue.push({ type, content, key, duration });
    } else {
      // 그렇지 않으면 바로 표시
      this.show(type, content, key, duration);
    }
  }
}

// src/utils/message.js
import { message as antMessage } from 'antd';
import { useLogger } from './LogUtils';

// 로거 초기화
const logger = useLogger('MessageService');

/**
 * 메시지 키 상수
 * 중복 메시지 방지 및 메시지 업데이트를 위한 고유 식별자
 */
export const MessageKeys = {
  AUTH: {
    LOGIN: 'auth-login',
    LOGOUT: 'auth-logout',
    SESSION: 'auth-session',
    PERMISSION: 'auth-permission',
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
    PESSIMISTIC_LOCK: 'dashboard-pessimistic-lock',
    OPTIMISTIC_LOCK: 'dashboard-optimistic-lock',
    LOCK_WARNING: 'dashboard-lock-warning',
    LOCK_EXPIRED: 'dashboard-lock-expired',
  },
  VISUALIZATION: {
    LOAD: 'visualization-load',
  },
  ERROR: {
    NETWORK: 'error-network',
    SERVER: 'error-server',
    UNKNOWN: 'error-unknown',
  },
  VALIDATION: {
    FIELD_ERROR: 'validation-field-error',
  },
};

/**
 * 메시지 템플릿 상수
 * 일관된 메시지 형식 제공
 */
export const MessageTemplates = {
  DASHBOARD: {
    CREATE_SUCCESS: '대시보드가 생성되었습니다',
    STATUS_SUCCESS: (status) => {
      const statusMap = {
        WAITING: '대기',
        IN_PROGRESS: '진행',
        COMPLETE: '완료',
        ISSUE: '이슈',
        CANCEL: '취소',
      };
      return `${statusMap[status] || status} 상태로 변경되었습니다`;
    },
    DELETE_SUCCESS: '선택한 항목이 삭제되었습니다',
    ASSIGN_SUCCESS: '배차 처리가 완료되었습니다',
    INVALID_POSTAL: '올바른 우편번호 형식이 아닙니다',
    INVALID_PHONE: '올바른 연락처 형식이 아닙니다',
    INVALID_WAITING: (orderNos) =>
      `대기 상태가 아닌 주문이 포함되어 있습니다: ${orderNos}`,
  },
  AUTH: {
    LOGIN_FAILED: '아이디 또는 비밀번호가 잘못되었습니다',
    SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요',
  },
};

// 활성 메시지 관리
const activeMessages = new Map();

/**
 * 간소화된 메시지 서비스
 * 중복 메시지 방지 및 연속 메시지 처리
 */
const messageService = {
  /**
   * 성공 메시지 표시
   * @param {string} content - 메시지 내용
   * @param {string} key - 메시지 키 (중복 방지용)
   * @param {number} duration - 표시 시간 (초)
   */
  success: (content, key, duration = 2) => {
    if (key && activeMessages.has(key)) {
      antMessage.destroy(key);
    }

    logger.debug(`성공 메시지: ${content}`);
    antMessage.success({
      content,
      key,
      duration,
      onClose: () => {
        if (key) activeMessages.delete(key);
      },
    });

    if (key) activeMessages.set(key, 'success');
  },

  /**
   * 에러 메시지 표시
   * @param {string} content - 메시지 내용
   * @param {string} key - 메시지 키 (중복 방지용)
   * @param {number} duration - 표시 시간 (초)
   */
  error: (content, key, duration = 3) => {
    if (key && activeMessages.has(key)) {
      antMessage.destroy(key);
    }

    logger.debug(`에러 메시지: ${content}`);
    antMessage.error({
      content,
      key,
      duration,
      onClose: () => {
        if (key) activeMessages.delete(key);
      },
    });

    if (key) activeMessages.set(key, 'error');
  },

  /**
   * 정보 메시지 표시
   * @param {string} content - 메시지 내용
   * @param {string} key - 메시지 키 (중복 방지용)
   * @param {number} duration - 표시 시간 (초)
   */
  info: (content, key, duration = 2) => {
    if (key && activeMessages.has(key)) {
      antMessage.destroy(key);
    }

    logger.debug(`정보 메시지: ${content}`);
    antMessage.info({
      content,
      key,
      duration,
      onClose: () => {
        if (key) activeMessages.delete(key);
      },
    });

    if (key) activeMessages.set(key, 'info');
  },

  /**
   * 경고 메시지 표시
   * @param {string} content - 메시지 내용
   * @param {string} key - 메시지 키 (중복 방지용)
   * @param {number} duration - 표시 시간 (초)
   */
  warning: (content, key, duration = 3) => {
    if (key && activeMessages.has(key)) {
      antMessage.destroy(key);
    }

    logger.debug(`경고 메시지: ${content}`);
    antMessage.warning({
      content,
      key,
      duration,
      onClose: () => {
        if (key) activeMessages.delete(key);
      },
    });

    if (key) activeMessages.set(key, 'warning');
  },

  /**
   * 로딩 메시지 표시
   * @param {string} content - 메시지 내용
   * @param {string} key - 메시지 키 (중복 방지용)
   * @param {number} duration - 표시 시간 (초, 0이면 무기한)
   */
  loading: (content, key, duration = 0) => {
    if (key && activeMessages.has(key)) {
      antMessage.destroy(key);
    }

    logger.debug(`로딩 메시지: ${content}`);
    antMessage.loading({
      content,
      key,
      duration,
      onClose: () => {
        if (key) activeMessages.delete(key);
      },
    });

    if (key) activeMessages.set(key, 'loading');
  },

  /**
   * 로딩 메시지를 성공 메시지로 전환
   * @param {string} content - 성공 메시지 내용
   * @param {string} key - 메시지 키
   * @param {number} duration - 표시 시간 (초)
   */
  loadingToSuccess: (content, key, duration = 2) => {
    logger.debug(`로딩→성공 메시지: ${content}`);
    antMessage.success({
      content,
      key,
      duration,
      onClose: () => {
        if (key) activeMessages.delete(key);
      },
    });
  },

  /**
   * 로딩 메시지를 에러 메시지로 전환
   * @param {string} content - 에러 메시지 내용
   * @param {string} key - 메시지 키
   * @param {number} duration - 표시 시간 (초)
   */
  loadingToError: (content, key, duration = 3) => {
    logger.debug(`로딩→에러 메시지: ${content}`);
    antMessage.error({
      content,
      key,
      duration,
      onClose: () => {
        if (key) activeMessages.delete(key);
      },
    });
  },

  /**
   * 로딩 메시지를 정보 메시지로 전환
   * @param {string} content - 정보 메시지 내용
   * @param {string} key - 메시지 키
   * @param {number} duration - 표시 시간 (초)
   */
  loadingToInfo: (content, key, duration = 2) => {
    logger.debug(`로딩→정보 메시지: ${content}`);
    antMessage.info({
      content,
      key,
      duration,
      onClose: () => {
        if (key) activeMessages.delete(key);
      },
    });
  },

  /**
   * 메시지 제거
   * @param {string} key - 제거할 메시지 키
   */
  destroy: (key) => {
    if (key) {
      antMessage.destroy(key);
      activeMessages.delete(key);
    }
  },

  /**
   * 모든 메시지 제거
   */
  destroyAll: () => {
    antMessage.destroy();
    activeMessages.clear();
  },
};

export default messageService;

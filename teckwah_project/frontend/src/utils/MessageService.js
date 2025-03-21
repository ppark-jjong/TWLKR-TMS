// src/utils/MessageService.js (수정)
import { message as antMessage } from 'antd';

/**
 * 통합 메시지 서비스
 * 중복 메시지 방지 및 연속 메시지 처리 최적화 (간소화 버전)
 */
const MessageService = {
  /**
   * 성공 메시지 표시
   */
  success: (content, key, duration = 2) => {
    antMessage.success({
      content,
      key,
      duration,
    });
  },

  /**
   * 에러 메시지 표시
   */
  error: (content, key, duration = 3) => {
    antMessage.error({
      content,
      key,
      duration,
    });
  },

  /**
   * 정보 메시지 표시
   */
  info: (content, key, duration = 2) => {
    antMessage.info({
      content,
      key,
      duration,
    });
  },

  /**
   * 경고 메시지 표시
   */
  warning: (content, key, duration = 3) => {
    antMessage.warning({
      content,
      key,
      duration,
    });
  },

  /**
   * 로딩 메시지 표시
   */
  loading: (content, key, duration = 0) => {
    antMessage.loading({
      content,
      key,
      duration,
    });
  },

  /**
   * 로딩 메시지를 성공 메시지로 전환
   */
  loadingToSuccess: (content, key, duration = 2) => {
    antMessage.success({
      content,
      key,
      duration,
    });
  },

  /**
   * 로딩 메시지를 에러 메시지로 전환
   */
  loadingToError: (content, key, duration = 3) => {
    antMessage.error({
      content,
      key,
      duration,
    });
  },

  /**
   * 메시지 제거
   */
  destroy: (key) => {
    if (key) {
      antMessage.destroy(key);
    }
  },

  /**
   * 모든 메시지 제거
   */
  destroyAll: () => {
    antMessage.destroy();
  },
};

export default MessageService;

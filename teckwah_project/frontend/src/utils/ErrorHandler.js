// src/utils/ErrorHandler.js (수정)
import MessageService from './MessageService';
import { MessageKeys } from './Constants';

/**
 * 간소화된 에러 처리 유틸리티
 */
class ErrorHandler {
  /**
   * 오류 처리 메인 메서드
   * @param {Error} error - 처리할 오류 객체
   * @param {string} context - 오류 발생 컨텍스트 정보
   * @returns {Error} - 처리 후 오류 객체
   */
  handle(error, context = '') {
    // 이미 처리된 오류는 다시 처리하지 않음
    if (error.handled) return error;

    let errorMessage = '오류가 발생했습니다';
    let messageKey = `error-${Date.now()}`;

    // HTTP 응답 오류 (axios 오류)
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      const errorDetail = errorData?.error?.detail || errorData?.detail || '';

      // 기본 메시지 설정
      errorMessage =
        errorDetail || `서버에서 오류가 발생했습니다 (${statusCode})`;

      // 특별한 상태 코드 처리
      if (statusCode === 401) {
        messageKey = MessageKeys.AUTH.SESSION;
      } else if (statusCode === 403) {
        messageKey = MessageKeys.AUTH.PERMISSION;
      } else if (statusCode === 404) {
        messageKey = MessageKeys.ERROR.NOT_FOUND;
      } else if (statusCode === 409) {
        messageKey = MessageKeys.DASHBOARD.OPTIMISTIC_LOCK;
      } else if (statusCode === 423) {
        messageKey = MessageKeys.DASHBOARD.PESSIMISTIC_LOCK;
      } else {
        messageKey = MessageKeys.ERROR.UNKNOWN;
      }
    }
    // 네트워크 오류 (요청이 전송되었지만 응답 없음)
    else if (error.request) {
      errorMessage = '서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요';
      messageKey = MessageKeys.ERROR.NETWORK;
    }

    // 메시지 표시
    MessageService.error(errorMessage, messageKey);

    // 오류 객체에 처리 정보 추가
    error.handled = true;
    error.errorMessage = errorMessage;

    return error;
  }

  /**
   * 오류 유형 확인 유틸리티 함수들
   */
  isAuthenticationError(error) {
    return error?.response?.status === 401;
  }

  isPermissionError(error) {
    return error?.response?.status === 403;
  }

  isNotFoundError(error) {
    return error?.response?.status === 404;
  }

  isPessimisticLockError(error) {
    return error?.response?.status === 423;
  }
}

// 단일 인스턴스 생성 및 내보내기
const errorHandler = new ErrorHandler();
export default errorHandler;

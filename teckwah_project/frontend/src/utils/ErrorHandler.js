// frontend/src/utils/ErrorHandler.js
import { MessageKeys, MessageTemplates } from './message';
import messageService from './message';

class ErrorHandler {
  static handle(error, context = '') {
    // 이미 처리된 에러는 다시 처리하지 않음
    if (error.handled) return;

    let errorMessage = error.response?.data?.detail || '오류가 발생했습니다';
    let messageKey = `error-${Date.now()}`;

    // HTTP 상태 코드별 처리
    if (error.response) {
      switch (error.response.status) {
        case 400: // Bad Request
          if (error.response.data.detail.includes('우편번호')) {
            errorMessage = MessageTemplates.DASHBOARD.INVALID_POSTAL;
            messageKey = 'postal-code-error';
          } else if (error.response.data.detail.includes('연락처')) {
            errorMessage = MessageTemplates.DASHBOARD.INVALID_PHONE;
            messageKey = 'phone-format-error';
          }
          break;

        case 401: // Unauthorized
          if (error.response.data.detail.includes('아이디 또는 비밀번호')) {
            errorMessage = MessageTemplates.AUTH.LOGIN_FAILED;
            messageKey = MessageKeys.AUTH.LOGIN;
          } else if (error.response.data.detail.includes('만료')) {
            errorMessage = MessageTemplates.AUTH.SESSION_EXPIRED;
            messageKey = MessageKeys.AUTH.SESSION_EXPIRED;
          }
          break;

        case 403: // Forbidden
          errorMessage = '접근 권한이 없습니다';
          messageKey = 'permission-error';
          break;

        case 404: // Not Found
          if (context === 'dashboard') {
            errorMessage = '대시보드를 찾을 수 없습니다';
            messageKey = MessageKeys.DASHBOARD.LOAD;
          }
          break;

        case 422: // Validation Error
          if (Array.isArray(error.response.data.detail)) {
            errorMessage = error.response.data.detail
              .map((err) => err.msg)
              .join('\n');
            messageKey = 'validation-error';
          }
          break;

        case 500: // Internal Server Error
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요';
          messageKey = 'server-error';
          break;
      }
    } else if (error.request) {
      // 요청은 보냈으나 응답을 받지 못한 경우
      errorMessage = '서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요';
      messageKey = 'network-error';
    }

    // 배송 상태 관련 특별 처리
    if (error.response?.data?.detail?.includes('대기 상태가 아니')) {
      const orderNos = error.response.data.detail.split(':')[1]?.trim() || '';
      errorMessage = MessageTemplates.DASHBOARD.INVALID_WAITING(orderNos);
    }

    messageService.error(errorMessage, messageKey);
    error.handled = true;

    // 개발 환경에서 로깅
    if (process.env.NODE_ENV === 'development') {
      console.error('Error occurred:', {
        message: errorMessage,
        originalError: error,
        context,
        status: error.response?.status,
      });
    }

    return {
      message: errorMessage,
      originalError: error,
    };
  }

  static handleValidationErrors(errors) {
    return Object.entries(errors).map(([field, messages]) => ({
      field,
      messages: Array.isArray(messages) ? messages : [messages],
    }));
  }

  static isNetworkError(error) {
    return !error.response && error.request;
  }

  static isAuthError(error) {
    return error.response?.status === 401;
  }

  static isValidationError(error) {
    return error.response?.status === 422;
  }
}

export default ErrorHandler;

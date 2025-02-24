// frontend/src/utils/ErrorHandler.js
import { MessageKeys, MessageTemplates } from './message';
import messageService from './message';

class ErrorHandler {
  static errorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    BUSINESS_ERROR: 'BUSINESS_ERROR',
  };

  static getErrorData(error) {
    if (error.response) {
      const { status, data } = error.response;
      return { status, data };
    }
    return { status: 0, data: null };
  }

  static getErrorCode(status, errorMessage) {
    if (status === 422) return this.errorCodes.VALIDATION_ERROR;
    if (status === 401 || status === 403)
      return this.errorCodes.AUTHORIZATION_ERROR;
    if (status === 404) return this.errorCodes.NOT_FOUND;
    if (status >= 500) return this.errorCodes.SERVER_ERROR;
    if (!status) return this.errorCodes.NETWORK_ERROR;
    return this.errorCodes.BUSINESS_ERROR;
  }

  static getErrorMessage(error, context = '') {
    const { status, data } = this.getErrorData(error);
    let errorMessage = data?.detail || '오류가 발생했습니다';
    let messageKey = `error-${Date.now()}`;

    // HTTP 상태 코드별 처리
    switch (status) {
      case 422: // Validation Error
        if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((err) => err.msg).join('\n');
        }
        break;

      case 400: // Bad Request
        if (errorMessage.includes('우편번호')) {
          errorMessage = MessageTemplates.DASHBOARD.INVALID_POSTAL;
          messageKey = 'postal-code-error';
        } else if (errorMessage.includes('연락처')) {
          errorMessage = MessageTemplates.DASHBOARD.INVALID_PHONE;
          messageKey = 'phone-format-error';
        }
        break;

      case 401: // Unauthorized
        if (errorMessage.includes('아이디 또는 비밀번호')) {
          errorMessage = MessageTemplates.AUTH.LOGIN_FAILED;
          messageKey = MessageKeys.AUTH.LOGIN;
        } else if (errorMessage.includes('만료')) {
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

      case 500: // Internal Server Error
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요';
        messageKey = 'server-error';
        break;

      default:
        if (!status) {
          // Network Error
          errorMessage =
            '서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요';
          messageKey = 'network-error';
        }
        break;
    }

    // 배송 상태 관련 특별 처리
    if (data?.detail?.includes('대기 상태가 아니')) {
      const orderNos = data.detail.split(':')[1]?.trim() || '';
      errorMessage = MessageTemplates.DASHBOARD.INVALID_WAITING(orderNos);
    }

    return {
      message: errorMessage,
      messageKey,
      errorCode: this.getErrorCode(status, errorMessage),
    };
  }

  static handle(error, context = '') {
    // 이미 처리된 에러는 다시 처리하지 않음
    if (error.handled) return;

    const {
      message: errorMessage,
      messageKey,
      errorCode,
    } = this.getErrorMessage(error, context);

    // 에러 메시지 표시
    messageService.error(errorMessage, messageKey);
    error.handled = true;

    // 개발 환경에서 추가 로깅
    if (process.env.NODE_ENV === 'development') {
      console.error('Error occurred:', {
        code: errorCode,
        message: errorMessage,
        originalError: error,
        context,
        status: error.response?.status,
      });
    }

    return {
      errorCode,
      message: errorMessage,
      originalError: error,
    };
  }

  static handleValidationError(validationErrors) {
    const errors = {};

    validationErrors.forEach((error) => {
      const field = error.field || 'general';
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(error.message);
    });

    return errors;
  }

  static isNetworkError(error) {
    return !error.response && error.request;
  }

  static isAuthenticationError(error) {
    return error.response?.status === 401;
  }

  static isAuthorizationError(error) {
    return error.response?.status === 403;
  }

  static isValidationError(error) {
    return error.response?.status === 422;
  }

  static isServerError(error) {
    return error.response?.status >= 500;
  }
}

export default ErrorHandler;

// src/utils/ErrorHandler.js
import { MessageKeys, MessageTemplates } from './message';
import messageService from './message';
import { useLogger } from './LogUtils';

/**
 * 애플리케이션 전반의 에러 처리를 담당하는 유틸리티 클래스
 * 백엔드 API 응답 구조와 일치하는 에러 처리 로직 제공
 */
class ErrorHandler {
  constructor() {
    this.logger = useLogger('ErrorHandler');
    this.initErrorCodes();
  }

  /**
   * 에러 코드 맵 초기화
   * @private
   */
  initErrorCodes() {
    this.errorCodeMap = {
      VALIDATION_ERROR: 'VALIDATION_ERROR', // 유효성 검증 실패
      AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR', // 인증 실패
      PERMISSION_ERROR: 'PERMISSION_ERROR', // 권한 부족
      NETWORK_ERROR: 'NETWORK_ERROR', // 네트워크 연결 문제
      SERVER_ERROR: 'SERVER_ERROR', // 서버 내부 오류
      NOT_FOUND_ERROR: 'NOT_FOUND_ERROR', // 리소스 없음
      BUSINESS_ERROR: 'BUSINESS_ERROR', // 비즈니스 로직 오류
      OPTIMISTIC_LOCK_ERROR: 'OPTIMISTIC_LOCK_ERROR', // 낙관적 락 충돌
      PESSIMISTIC_LOCK_ERROR: 'PESSIMISTIC_LOCK_ERROR', // 비관적 락 충돌
      RESOURCE_CONFLICT: 'RESOURCE_CONFLICT', // 리소스 충돌
    };
  }

  /**
   * 에러 코드와 메시지 세부 정보 추출
   * @param {Error} error - 발생한 에러 객체
   * @param {string} context - 에러 발생 컨텍스트 정보
   * @returns {Object} - 에러 세부 정보 객체
   */
  getErrorDetails(error, context = '') {
    let statusCode = 0;
    let errorCode = this.errorCodeMap.BUSINESS_ERROR;
    let errorData = null;
    let errorMessage = '오류가 발생했습니다';
    let messageKey = `error-${Date.now()}`;

    // HTTP 응답 에러 (axios 에러)
    if (error.response) {
      statusCode = error.response.status;
      errorData = error.response.data;

      // API 응답 구조 분석 - 백엔드 명세 기반
      const errorDetail = errorData?.error?.detail || errorData?.detail || '';
      const errorFields = errorData?.error?.fields || {};

      this.logger.debug('에러 응답 데이터:', errorData);

      // HTTP 상태 코드별 처리
      switch (statusCode) {
        case 400: // Bad Request - 유효성 검증 실패
          errorCode = this.errorCodeMap.VALIDATION_ERROR;
          errorMessage = this._extractValidationErrorMessage(
            errorData,
            errorDetail,
            context
          );
          messageKey = 'validation-error';
          break;

        case 401: // Unauthorized - 인증 실패
          errorCode = this.errorCodeMap.AUTHENTICATION_ERROR;
          errorMessage = this._extractAuthErrorMessage(errorData, errorDetail);
          messageKey = MessageKeys.AUTH.SESSION;
          break;

        case 403: // Forbidden - 권한 없음
          errorCode = this.errorCodeMap.PERMISSION_ERROR;
          errorMessage = '접근 권한이 없습니다';
          messageKey = 'permission-error';
          break;

        case 404: // Not Found - 리소스 없음
          errorCode = this.errorCodeMap.NOT_FOUND_ERROR;
          errorMessage = this._extractNotFoundErrorMessage(
            context,
            errorDetail
          );
          messageKey =
            context === 'dashboard'
              ? MessageKeys.DASHBOARD.LOAD
              : 'not-found-error';
          break;

        case 409: // Conflict - 낙관적 락 충돌
          errorCode = this.errorCodeMap.OPTIMISTIC_LOCK_ERROR;
          errorMessage = this._extractOptimisticLockErrorMessage(errorData);
          messageKey = 'optimistic-lock-error';
          break;

        case 423: // Locked - 비관적 락 충돌
          errorCode = this.errorCodeMap.PESSIMISTIC_LOCK_ERROR;
          errorMessage = this._extractPessimisticLockErrorMessage(errorData);
          messageKey = 'pessimistic-lock-error';
          break;

        case 422: // Validation Error - 세부 유효성 검증 실패
          errorCode = this.errorCodeMap.VALIDATION_ERROR;
          errorMessage = this._extractValidationDetailsMessage(
            errorData,
            errorDetail,
            errorFields
          );
          messageKey = 'validation-error';
          break;

        case 500: // Internal Server Error - 서버 오류
          errorCode = this.errorCodeMap.SERVER_ERROR;
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요';
          messageKey = 'server-error';
          break;

        default:
          errorMessage =
            errorDetail || `서버에서 오류가 발생했습니다 (${statusCode})`;
          errorCode =
            statusCode >= 500
              ? this.errorCodeMap.SERVER_ERROR
              : this.errorCodeMap.BUSINESS_ERROR;
      }
    }
    // 네트워크 에러 (요청이 전송되었지만 응답 없음)
    else if (error.request) {
      errorMessage = '서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요';
      messageKey = 'network-error';
      errorCode = this.errorCodeMap.NETWORK_ERROR;
    }

    // 특수 에러 메시지 처리 (백엔드 응답에서 추가 정보 추출)
    errorMessage = this._extractSpecialErrorMessage(errorData, errorMessage);

    return {
      statusCode,
      errorCode,
      errorMessage,
      messageKey,
      originalError: error,
      errorData,
    };
  }

  /**
   * 유효성 검증 에러 메시지 추출
   * @private
   */
  _extractValidationErrorMessage(errorData, errorDetail, context) {
    // 특정 컨텍스트별 커스텀 메시지
    if (context === 'dashboard') {
      if (errorDetail?.includes('우편번호')) {
        return MessageTemplates.DASHBOARD.INVALID_POSTAL;
      } else if (errorDetail?.includes('연락처')) {
        return MessageTemplates.DASHBOARD.INVALID_PHONE;
      }
    }

    return errorDetail || '입력값이 올바르지 않습니다';
  }

  /**
   * 인증 에러 메시지 추출
   * @private
   */
  _extractAuthErrorMessage(errorData, errorDetail) {
    if (errorDetail?.includes('아이디 또는 비밀번호')) {
      return MessageTemplates.AUTH.LOGIN_FAILED;
    } else if (errorDetail?.includes('만료')) {
      return MessageTemplates.AUTH.SESSION_EXPIRED;
    } else {
      return '인증이 필요합니다. 다시 로그인해주세요';
    }
  }

  /**
   * 리소스 없음 에러 메시지 추출
   * @private
   */
  _extractNotFoundErrorMessage(context, errorDetail) {
    if (context === 'dashboard') {
      return '대시보드를 찾을 수 없습니다. 이미 삭제되었거나 존재하지 않는 항목입니다.';
    }
    return errorDetail || '요청한 자원을 찾을 수 없습니다';
  }

  /**
   * 낙관적 락 에러 메시지 추출
   * @private
   */
  _extractOptimisticLockErrorMessage(errorData) {
    // 서버 응답에서 버전 정보 추출
    const currentVersion = this._extractVersionInfo(errorData);
    const conflictedOrders = this._extractConflictedOrders(errorData);

    // 충돌한 주문번호가 있는 경우 표시
    if (conflictedOrders && conflictedOrders.length > 0) {
      return `다음 주문(${conflictedOrders.join(
        ', '
      )})이 이미 다른 사용자에 의해 수정되었습니다.`;
    } else if (currentVersion) {
      return '다른 사용자가 이미 데이터를 수정했습니다. 최신 정보를 확인 후 다시 시도해주세요.';
    } else {
      return (
        errorData?.error?.detail ||
        errorData?.detail ||
        '데이터 충돌이 발생했습니다'
      );
    }
  }

  /**
   * 비관적 락 에러 메시지 추출
   * @private
   */
  _extractPessimisticLockErrorMessage(errorData) {
    const detail = errorData?.error?.detail || errorData?.detail || {};
    const lockedBy = detail.locked_by || '다른 사용자';
    const lockType = detail.lock_type || '';

    // 락 타입에 따른 메시지 차별화
    return `현재 ${lockedBy}님이 이 데이터를 ${this._getLockTypeText(
      lockType
    )} 중입니다. 잠시 후 다시 시도해주세요.`;
  }

  /**
   * 세부 유효성 검증 에러 메시지 추출
   * @private
   */
  _extractValidationDetailsMessage(errorData, errorDetail, errorFields) {
    let validationMessage = '';

    // fields 객체 형태로 오는 경우
    if (errorFields && Object.keys(errorFields).length > 0) {
      validationMessage = Object.entries(errorFields)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join('\n');
    }
    // 배열 형태로 오는 경우
    else if (Array.isArray(errorDetail)) {
      validationMessage = errorDetail
        .map((err) => err.msg || err.message)
        .join('\n');
    }
    // 문자열로 오는 경우
    else {
      validationMessage = errorDetail || '입력값 검증에 실패했습니다';
    }

    return validationMessage;
  }

  /**
   * 특수 에러 메시지 처리
   * @private
   */
  _extractSpecialErrorMessage(errorData, defaultMessage) {
    if (errorData?.detail?.includes('대기 상태가 아니')) {
      const orderNos = errorData.detail.split(':')[1]?.trim() || '';
      return MessageTemplates.DASHBOARD.INVALID_WAITING(orderNos);
    }
    return defaultMessage;
  }

  /**
   * 버전 정보 추출
   * @private
   */
  _extractVersionInfo(errorData) {
    return (
      errorData?.version_info?.current_version ||
      errorData?.error?.detail?.current_version ||
      errorData?.detail?.current_version
    );
  }

  /**
   * 충돌 주문 목록 추출
   * @private
   */
  _extractConflictedOrders(errorData) {
    return (
      errorData?.error?.detail?.conflicted_orders ||
      errorData?.detail?.conflicted_orders ||
      []
    );
  }

  /**
   * 락 타입에 따른 표시 텍스트 반환
   * @private
   */
  _getLockTypeText(lockType) {
    switch (lockType) {
      case 'EDIT':
        return '편집';
      case 'STATUS':
        return '상태 변경';
      case 'ASSIGN':
        return '배차';
      case 'REMARK':
        return '메모 작성';
      default:
        return '수정';
    }
  }

  /**
   * 에러 처리 메인 메서드
   * @param {Error} error - 처리할 에러 객체
   * @param {string} context - 에러 발생 컨텍스트 정보
   * @returns {Error} - 처리 후 에러 객체
   */
  handle(error, context = '') {
    // 이미 처리된 에러는 다시 처리하지 않음
    if (error.handled) return error;

    const { errorMessage, messageKey, errorCode, errorData } =
      this.getErrorDetails(error, context);

    // 메시지 표시
    messageService.error(errorMessage, messageKey);
    error.handled = true;
    error.errorCode = errorCode;
    error.errorData = errorData;

    // 개발 환경에서 추가 로깅
    if (process.env.NODE_ENV === 'development') {
      console.error('Error occurred:', {
        code: errorCode,
        message: errorMessage,
        originalError: error,
        context,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack,
      });
    }

    return error;
  }

  /**
   * 유효성 검증 에러 처리
   * @param {Array|Object} errors - 유효성 검증 에러 배열 또는 객체
   * @returns {Object} - 필드별 포맷팅된 에러 메시지
   */
  handleValidationErrors(errors) {
    const formattedErrors = {};

    // 배열 형태로 온 경우 (일반적인 폼 에러)
    if (Array.isArray(errors)) {
      errors.forEach((error) => {
        const field = error.field || error.loc?.[1] || 'general';
        if (!formattedErrors[field]) {
          formattedErrors[field] = [];
        }
        formattedErrors[field].push(error.message || error.msg);
      });
    }
    // API 응답의 fields 객체 형태로 온 경우
    else if (errors && errors.fields && typeof errors.fields === 'object') {
      Object.entries(errors.fields).forEach(([field, message]) => {
        formattedErrors[field] = Array.isArray(message) ? message : [message];
      });
    }
    // 단순 객체 형태로 온 경우
    else if (typeof errors === 'object' && errors !== null) {
      Object.entries(errors).forEach(([field, message]) => {
        formattedErrors[field] = Array.isArray(message) ? message : [message];
      });
    }

    return formattedErrors;
  }

  /**
   * 폼 에러 설정
   * @param {Object} form - Ant Design 폼 인스턴스
   * @param {Object} errors - 필드별 에러 메시지
   */
  setFormErrors(form, errors) {
    if (!form || !errors) return;

    const fieldsWithErrors = {};

    // errors 객체 처리
    Object.entries(errors).forEach(([field, messages]) => {
      // 메시지 배열 또는 단일 문자열 처리
      const errorMessages = Array.isArray(messages) ? messages : [messages];
      fieldsWithErrors[field] = { errors: errorMessages };
    });

    // 폼에 에러 설정
    form.setFields(
      Object.entries(fieldsWithErrors).map(([name, value]) => ({
        name,
        errors: value.errors,
      }))
    );
  }

  /**
   * 에러 유형 확인 유틸리티 함수들
   */
  isAuthenticationError(error) {
    return (
      error?.response?.status === 401 ||
      error?.errorCode === this.errorCodeMap.AUTHENTICATION_ERROR
    );
  }

  isPermissionError(error) {
    return (
      error?.response?.status === 403 ||
      error?.errorCode === this.errorCodeMap.PERMISSION_ERROR
    );
  }

  isValidationError(error) {
    return (
      error?.response?.status === 400 ||
      error?.response?.status === 422 ||
      error?.errorCode === this.errorCodeMap.VALIDATION_ERROR
    );
  }

  isNotFoundError(error) {
    return (
      error?.response?.status === 404 ||
      error?.errorCode === this.errorCodeMap.NOT_FOUND_ERROR
    );
  }

  isOptimisticLockError(error) {
    return (
      error?.response?.status === 409 ||
      error?.errorCode === this.errorCodeMap.OPTIMISTIC_LOCK_ERROR
    );
  }

  isPessimisticLockError(error) {
    return (
      error?.response?.status === 423 ||
      error?.errorCode === this.errorCodeMap.PESSIMISTIC_LOCK_ERROR
    );
  }

  isServerError(error) {
    return (
      (error?.response?.status >= 500 && error?.response?.status < 600) ||
      error?.errorCode === this.errorCodeMap.SERVER_ERROR
    );
  }

  isNetworkError(error) {
    return (
      (error.request && !error.response) ||
      error?.errorCode === this.errorCodeMap.NETWORK_ERROR
    );
  }
}

// 단일 인스턴스 생성 및 내보내기
const errorHandler = new ErrorHandler();
export default errorHandler;

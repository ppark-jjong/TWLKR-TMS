// src/utils/ErrorHandler.js
import { MessageKeys, MessageTemplates } from './message';
import messageService from './message';
import { useLogger } from './LogUtils';

/**
 * 애플리케이션 전반의 오류 처리를 담당하는 유틸리티 클래스
 * 백엔드 API 응답 구조와 일치하는 오류 처리 로직 제공
 * 비관적 락 충돌 관련 오류 처리 개선
 */
class ErrorHandler {
  constructor() {
    this.logger = useLogger('ErrorHandler');
    this.initErrorCodes();
  }

  /**
   * 오류 코드 맵 초기화
   * @private
   */
  initErrorCodes() {
    this.errorCodeMap = {
      // 입력 및 검증 관련 오류
      VALIDATION_ERROR: 'VALIDATION_ERROR', // 유효성 검증 실패

      // 인증 및 권한 관련 오류
      AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR', // 인증 실패
      PERMISSION_ERROR: 'PERMISSION_ERROR', // 권한 부족

      // 네트워크 및 서버 관련 오류
      NETWORK_ERROR: 'NETWORK_ERROR', // 네트워크 연결 문제
      SERVER_ERROR: 'SERVER_ERROR', // 서버 내부 오류
      NOT_FOUND_ERROR: 'NOT_FOUND_ERROR', // 리소스 없음
      TIMEOUT_ERROR: 'TIMEOUT_ERROR', // 요청 타임아웃

      // 비즈니스 로직 관련 오류
      BUSINESS_ERROR: 'BUSINESS_ERROR', // 비즈니스 로직 오류

      // 락 관련 오류 (비관적 락 중심)
      PESSIMISTIC_LOCK_ERROR: 'PESSIMISTIC_LOCK_ERROR', // 비관적 락 충돌
      LOCK_EXPIRED_ERROR: 'LOCK_EXPIRED_ERROR', // 락 만료
      LOCK_ACQUIRE_ERROR: 'LOCK_ACQUIRE_ERROR', // 락 획득 실패

      // 기타 오류
      RESOURCE_CONFLICT: 'RESOURCE_CONFLICT', // 리소스 충돌
      UNKNOWN_ERROR: 'UNKNOWN_ERROR', // 알 수 없는 오류
    };
  }

  /**
   * 오류 코드와 메시지 세부 정보 추출
   * @param {Error} error - 발생한 오류 객체
   * @param {string} context - 오류 발생 컨텍스트 정보
   * @returns {Object} - 오류 세부 정보 객체
   */
  getErrorDetails(error, context = '') {
    let statusCode = 0;
    let errorCode = this.errorCodeMap.UNKNOWN_ERROR;
    let errorData = null;
    let errorMessage = '오류가 발생했습니다';
    let messageKey = `error-${Date.now()}`;
    let recoverable = true; // 복구 가능 여부
    let fieldErrors = null; // 필드별 오류 (폼 검증용)

    // HTTP 응답 오류 (axios 오류)
    if (error.response) {
      statusCode = error.response.status;
      errorData = error.response.data;

      // API 응답 구조 분석 - 백엔드 명세 기반
      const errorDetail = errorData?.error?.detail || errorData?.detail || '';
      const errorFields = errorData?.error?.fields || {};

      this.logger.debug('오류 응답 데이터:', errorData);

      // HTTP 상태 코드별 처리
      switch (statusCode) {
        case 400: // Bad Request - 유효성 검증 실패
          errorCode = this.errorCodeMap.VALIDATION_ERROR;
          errorMessage = this._extractValidationErrorMessage(
            errorData,
            errorDetail,
            context
          );
          messageKey = MessageKeys.VALIDATION.FIELD_ERROR;
          fieldErrors = errorFields;
          recoverable = true;
          break;

        case 401: // Unauthorized - 인증 실패
          errorCode = this.errorCodeMap.AUTHENTICATION_ERROR;
          errorMessage = this._extractAuthErrorMessage(errorData, errorDetail);
          messageKey = MessageKeys.AUTH.SESSION;
          recoverable = false; // 인증 오류는 재로그인 필요
          break;

        case 403: // Forbidden - 권한 없음
          errorCode = this.errorCodeMap.PERMISSION_ERROR;
          errorMessage = '접근 권한이 없습니다';
          messageKey = MessageKeys.AUTH.PERMISSION;
          recoverable = false;
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
              : MessageKeys.ERROR.NOT_FOUND;
          recoverable = false;
          break;

        case 408: // Request Timeout
          errorCode = this.errorCodeMap.TIMEOUT_ERROR;
          errorMessage = '요청 시간이 초과되었습니다. 다시 시도해 주세요.';
          messageKey = MessageKeys.ERROR.TIMEOUT;
          recoverable = true;
          break;

        case 423: // Locked - 비관적 락 충돌 (중요: 락 메커니즘 핵심)
          errorCode = this.errorCodeMap.PESSIMISTIC_LOCK_ERROR;
          errorMessage = this._extractPessimisticLockErrorMessage(errorData);
          messageKey = MessageKeys.DASHBOARD.PESSIMISTIC_LOCK;
          recoverable = true; // 락은 재시도 가능
          break;

        case 422: // Validation Error - 세부 유효성 검증 실패
          errorCode = this.errorCodeMap.VALIDATION_ERROR;
          errorMessage = this._extractValidationDetailsMessage(
            errorData,
            errorDetail,
            errorFields
          );
          messageKey = MessageKeys.VALIDATION.FIELD_ERROR;
          fieldErrors = errorFields;
          recoverable = true;
          break;

        case 500: // Internal Server Error - 서버 오류
          errorCode = this.errorCodeMap.SERVER_ERROR;
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요';
          messageKey = MessageKeys.ERROR.SERVER;
          recoverable = true; // 서버 오류는 재시도 가능할 수 있음
          break;

        default:
          errorMessage =
            errorDetail || `서버에서 오류가 발생했습니다 (${statusCode})`;
          errorCode =
            statusCode >= 500
              ? this.errorCodeMap.SERVER_ERROR
              : this.errorCodeMap.BUSINESS_ERROR;
          recoverable = statusCode < 500; // 500번대는 재시도 가능성 있음
      }
    }
    // 네트워크 오류 (요청이 전송되었지만 응답 없음)
    else if (error.request) {
      errorMessage = '서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요';
      messageKey = MessageKeys.ERROR.NETWORK;
      errorCode = this.errorCodeMap.NETWORK_ERROR;
      recoverable = true; // 네트워크 오류는 연결 복구 후 재시도 가능
    }

    // 특수 오류 메시지 처리 (백엔드 응답에서 추가 정보 추출)
    errorMessage = this._extractSpecialErrorMessage(errorData, errorMessage);

    return {
      statusCode,
      errorCode,
      errorMessage,
      messageKey,
      originalError: error,
      errorData,
      recoverable,
      fieldErrors,
      context,
    };
  }

  /**
   * 유효성 검증 오류 메시지 추출
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

    // 필드별 오류가 있는 경우
    if (
      errorData?.error?.fields &&
      Object.keys(errorData.error.fields).length > 0
    ) {
      const firstField = Object.keys(errorData.error.fields)[0];
      const firstError = errorData.error.fields[firstField];
      return Array.isArray(firstError) ? firstError[0] : firstError;
    }

    return errorDetail || '입력값이 올바르지 않습니다';
  }

  /**
   * 인증 오류 메시지 추출
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
   * 리소스 없음 오류 메시지 추출
   * @private
   */
  _extractNotFoundErrorMessage(context, errorDetail) {
    if (context === 'dashboard') {
      return '대시보드를 찾을 수 없습니다. 이미 삭제되었거나 존재하지 않는 항목입니다.';
    }
    return errorDetail || '요청한 자원을 찾을 수 없습니다';
  }

  /**
   * 비관적 락 오류 메시지 추출 - 낙관적 락 코드 제거
   * @private
   */
  _extractPessimisticLockErrorMessage(errorData) {
    const detail = errorData?.error?.detail || errorData?.detail || {};
    const lockedBy = detail.locked_by || '다른 사용자';
    const lockType = detail.lock_type || '';
    const expiresAt = detail.expires_at ? new Date(detail.expires_at) : null;

    // 락 만료 시간 포맷팅 (있는 경우)
    const expiryInfo = expiresAt
      ? ` (만료: ${expiresAt.toLocaleTimeString()})`
      : '';

    // 락 타입에 따른 메시지 차별화
    return `현재 ${lockedBy}님이 이 데이터를 ${this._getLockTypeText(
      lockType
    )} 중입니다${expiryInfo}. 잠시 후 다시 시도해주세요.`;
  }

  /**
   * 세부 유효성 검증 오류 메시지 추출
   * @private
   */
  _extractValidationDetailsMessage(errorData, errorDetail, errorFields) {
    // fields 객체 형태로 오는 경우
    if (errorFields && Object.keys(errorFields).length > 0) {
      const firstField = Object.keys(errorFields)[0];
      const firstError = errorFields[firstField];
      return Array.isArray(firstError) ? firstError[0] : firstError;
    }
    // 배열 형태로 오는 경우
    else if (Array.isArray(errorDetail)) {
      return (
        errorDetail[0]?.msg ||
        errorDetail[0]?.message ||
        '입력값 검증에 실패했습니다'
      );
    }
    // 문자열로 오는 경우
    else {
      return errorDetail || '입력값 검증에 실패했습니다';
    }
  }

  /**
   * 특수 오류 메시지 처리
   * @private
   */
  _extractSpecialErrorMessage(errorData, defaultMessage) {
    // 특정 비즈니스 로직 오류 처리
    if (errorData?.detail?.includes('대기 상태가 아니')) {
      const orderNos = errorData.detail.split(':')[1]?.trim() || '';
      return MessageTemplates.DASHBOARD.INVALID_WAITING(orderNos);
    }

    // 락 관련 특수 메시지
    if (
      errorData?.detail?.includes('락') ||
      errorData?.detail?.includes('lock')
    ) {
      const lockedBy =
        errorData?.detail?.locked_by ||
        errorData?.detail?.split('by ')[1]?.split('.')[0] ||
        '다른 사용자';
      return `${lockedBy}님이 현재 이 데이터를 편집 중입니다. 잠시 후 다시 시도해주세요.`;
    }

    return defaultMessage;
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
   * 오류 처리 메인 메서드
   * 비관적 락 충돌 처리 강화
   *
   * @param {Error} error - 처리할 오류 객체
   * @param {string} context - 오류 발생 컨텍스트 정보
   * @returns {Error} - 처리 후 오류 객체
   */
  handle(error, context = '') {
    // 이미 처리된 오류는 다시 처리하지 않음
    if (error.handled) return error;

    const {
      errorMessage,
      messageKey,
      errorCode,
      errorData,
      recoverable,
      fieldErrors,
    } = this.getErrorDetails(error, context);

    // 메시지 표시 (락 오류는 경고로 표시)
    if (errorCode === this.errorCodeMap.PESSIMISTIC_LOCK_ERROR) {
      messageService.warning(errorMessage, messageKey);
    } else {
      messageService.error(errorMessage, messageKey);
    }

    // 오류 객체에 처리 정보 추가
    error.handled = true;
    error.errorCode = errorCode;
    error.errorData = errorData;
    error.errorMessage = errorMessage;
    error.recoverable = recoverable;
    error.fieldErrors = fieldErrors;
    error.context = context;

    // 개발 환경에서 추가 로깅
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', {
        code: errorCode,
        message: errorMessage,
        originalError: error,
        context,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack,
        recoverable,
      });
    }

    return error;
  }

  /**
   * 유효성 검증 오류 처리
   * @param {Array|Object} errors - 유효성 검증 오류 배열 또는 객체
   * @returns {Object} - 필드별 포맷팅된 오류 메시지
   */
  handleValidationErrors(errors) {
    const formattedErrors = {};

    // 배열 형태로 온 경우 (일반적인 폼 오류)
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
   * 폼 오류 설정
   * @param {Object} form - Ant Design 폼 인스턴스
   * @param {Object} errors - 필드별 오류 메시지
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

    // 폼에 오류 설정
    form.setFields(
      Object.entries(fieldsWithErrors).map(([name, value]) => ({
        name,
        errors: value.errors,
      }))
    );
  }

  /**
   * 오류 유형 확인 유틸리티 함수들
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

  isPessimisticLockError(error) {
    return (
      error?.response?.status === 423 ||
      error?.errorCode === this.errorCodeMap.PESSIMISTIC_LOCK_ERROR
    );
  }

  isLockExpiredError(error) {
    return error?.errorCode === this.errorCodeMap.LOCK_EXPIRED_ERROR;
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

  /**
   * 오류가 재시도 가능한지 확인
   * @param {Error} error - 확인할 오류 객체
   * @returns {boolean} - 재시도 가능 여부
   */
  isRecoverable(error) {
    // 이미 처리된 오류인 경우 recoverable 속성 사용
    if (error.recoverable !== undefined) {
      return error.recoverable;
    }

    // 상태 코드 기반 판단
    if (error.response) {
      // 400, 404, 422, 423은 재시도 가능
      const recoverableCodes = [400, 404, 422, 423];
      return (
        recoverableCodes.includes(error.response.status) ||
        error.response.status >= 500
      );
    }

    // 네트워크 오류는 재시도 가능
    if (error.request && !error.response) {
      return true;
    }

    return false;
  }
}

// 단일 인스턴스 생성 및 내보내기
const errorHandler = new ErrorHandler();
export default errorHandler;

import { message } from "antd";
import { getErrorType } from "../types";

/**
 * API 오류 처리 함수
 * @param {Error} error - 오류 객체
 * @param {Object} options - 오류 처리 옵션
 * @param {Function} options.onAuthError - 인증 오류 발생 시 실행할 콜백
 * @param {Function} options.onNetworkError - 네트워크 오류 발생 시 실행할 콜백
 * @param {Function} options.onValidationError - 유효성 검증 오류 발생 시 실행할 콜백
 * @param {Function} options.onServerError - 서버 오류 발생 시 실행할 콜백
 * @param {Function} options.onUnknownError - 알 수 없는 오류 발생 시 실행할 콜백
 * @param {boolean} options.showMessage - 오류 메시지를 화면에 표시할지 여부 (기본값: true)
 * @param {boolean} options.refreshOnServerError - 서버 오류 발생 시 페이지를 새로고침할지 여부 (기본값: true)
 */
export const handleApiError = (error, options = {}) => {
  const {
    onAuthError,
    onNetworkError,
    onValidationError,
    onServerError,
    onUnknownError,
    showMessage = true,
    refreshOnServerError = true,
  } = options;

  // 에러 정보 로깅
  console.error("API 에러 발생:", error);

  // 오류 유형 확인
  const errorType = getErrorType(error);
  const errorMsg = error.response?.data?.message || "오류가 발생했습니다";

  // 오류 유형별 처리
  switch (errorType) {
    case "auth":
      if (showMessage)
        message.error("인증에 실패했습니다. 다시 로그인해주세요");
      if (onAuthError) onAuthError(error);
      break;

    case "network":
      if (showMessage) message.error("네트워크 연결을 확인해주세요");
      if (onNetworkError) onNetworkError(error);
      break;

    case "validation":
      if (showMessage) message.error(errorMsg || "입력 내용을 확인해주세요");
      if (onValidationError) onValidationError(error);
      break;

    case "server":
      if (showMessage)
        message.error("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요");
      if (onServerError) onServerError(error);

      // 서버 오류 시 자동 새로고침
      if (refreshOnServerError) {
        console.log("서버 오류 발생, 페이지 새로고침 예정...");
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
      break;

    default:
      if (showMessage)
        message.error(errorMsg || "알 수 없는 오류가 발생했습니다");
      if (onUnknownError) onUnknownError(error);
      break;
  }
};

/**
 * 모달, 폼 등에서 발생하는 일반 오류 처리
 * @param {Error} error - 오류 객체
 * @param {string} context - 오류 발생 컨텍스트
 * @param {Function} onComplete - 오류 처리 후 실행할 콜백
 */
export const handleFormError = (error, context = "작업", onComplete) => {
  console.error(`${context} 중 오류 발생:`, error);
  message.error(`${context} 중 오류가 발생했습니다`);

  if (onComplete) onComplete();
};

/**
 * 비동기 작업에 대한 안전한 실행 함수
 * @param {Function} asyncFn - 실행할 비동기 함수
 * @param {Object} options - 옵션
 * @param {string} options.context - 작업 컨텍스트
 * @param {Function} options.onSuccess - 성공 시 실행할 콜백
 * @param {Function} options.onError - 오류 발생 시 실행할 콜백
 * @param {Function} options.onComplete - 성공/실패 후 공통으로 실행할 콜백
 * @returns {Promise<any>} - 비동기 작업 결과
 */
export const safeAsync = async (asyncFn, options = {}) => {
  const { context = "작업", onSuccess, onError, onComplete } = options;

  try {
    const result = await asyncFn();

    if (onSuccess) onSuccess(result);
    return result;
  } catch (error) {
    handleApiError(error, {
      showMessage: true,
      onUnknownError: () => {
        console.error(`${context} 중 오류 발생:`, error);
        message.error(`${context} 중 오류가 발생했습니다`);
      },
    });

    if (onError) onError(error);
    return null;
  } finally {
    if (onComplete) onComplete();
  }
};

/**
 * 뒤로가기 함수
 * 현재 페이지에서 이전 페이지로 돌아갑니다
 */
export const goBack = () => {
  window.history.back();
};

/**
 * 홈으로 이동 함수
 * 사용자 권한에 따라 적절한 홈페이지로 이동합니다
 * @param {string} role - 사용자 권한 ('ADMIN' 또는 'USER')
 */
export const goHome = (role) => {
  if (role === "ADMIN") {
    window.location.href = "/admin";
  } else {
    window.location.href = "/dashboard";
  }
};

import { message, notification } from 'antd';

// 에러 코드에 따른 사용자 친화적 메시지
const errorMessages = {
  INVALID_CREDENTIALS: '아이디 또는 비밀번호가 올바르지 않습니다.',
  UNAUTHORIZED: '권한이 없습니다. 다시 로그인해주세요.',
  FORBIDDEN: '해당 작업을 수행할 권한이 없습니다.',
  LOCK_CONFLICT: '이미 다른 사용자가 편집 중입니다.',
  NOT_FOUND: '요청한 정보를 찾을 수 없습니다.',
  VALIDATION_ERROR: '입력한 정보가 올바르지 않습니다.',
  INTERNAL_SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

// 최근 표시된 에러 메시지 추적 (중복 방지)
const recentMessages = new Set();
const MESSAGE_TIMEOUT = 3000; // 3초

// 중복 메시지 방지 함수
const showUniqueMessage = (content, type = 'error') => {
  if (recentMessages.has(content)) return;

  recentMessages.add(content);
  setTimeout(() => recentMessages.delete(content), MESSAGE_TIMEOUT);

  if (type === 'error') {
    message.error(content);
  } else if (type === 'warning') {
    message.warning(content);
  } else if (type === 'info') {
    message.info(content);
  }
};

/**
 * API 오류를 처리하는 함수
 * @param {Error} error - 에러 객체
 * @param {Object} options - 옵션
 * @param {string} options.context - 오류 컨텍스트
 * @param {boolean} options.showMessage - 사용자에게 메시지 표시 여부
 */
export const handleApiError = (error, options = {}) => {
  const { context = '', showMessage = true } = options;

  // 메시지 표시가 비활성화된 경우 빠르게 반환
  if (!showMessage) return;

  // 응답이 없는 경우 (네트워크 오류)
  if (!error.response) {
    console.error(`${context} - 네트워크 오류:`, error);
    showUniqueMessage('네트워크 연결을 확인해주세요.');
    return;
  }

  // 백엔드 응답에서 에러 정보 추출
  const { status, data } = error.response;
  const errorCode = data?.error_code || '';
  const errorMessage = data?.message || '오류가 발생했습니다.';

  // 에러 로깅
  console.error(`${context} - HTTP ${status} 오류:`, error);

  // 상태 코드별 처리
  switch (status) {
    case 401: // 인증 오류
      showUniqueMessage('인증이 필요합니다. 다시 로그인해주세요.');
      // 로그인 페이지로 리다이렉션은 api.js에서 처리
      break;

    case 403: // 권한 오류
      showUniqueMessage('해당 작업을 수행할 권한이 없습니다.');
      break;

    case 404: // 리소스 없음
      showUniqueMessage('요청한 정보를 찾을 수 없습니다.');
      break;

    case 422: // 유효성 검증 오류
      showUniqueMessage(errorMessage);
      break;

    case 500: // 서버 오류
      notification.error({
        message: '서버 오류',
        description: '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        key: 'server-error',
      });
      break;

    default: // 기타 오류
      // 에러 코드에 따른 메시지 또는 서버에서 온 메시지 사용
      const userMessage = errorMessages[errorCode] || errorMessage;
      showUniqueMessage(userMessage);
  }
};

/**
 * 모달, 폼 등에서 발생하는 일반 오류 처리
 * @param {Error} error - 오류 객체
 * @param {string} context - 오류 발생 컨텍스트
 * @param {Function} onComplete - 오류 처리 후 실행할 콜백
 */
export const handleFormError = (error, context = '작업', onComplete) => {
  console.error(`${context} 중 오류 발생:`, error);
  showUniqueMessage(`${context} 중 오류가 발생했습니다`);

  if (onComplete) onComplete();
};

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
  ROW_LOCK_TIMEOUT: '데이터 잠금 시간이 초과되었습니다. 다시 시도해주세요.',
  DEADLOCK_DETECTED:
    '데이터 접근 충돌이 발생했습니다. 잠시 후 다시 시도해주세요.',
  QUERY_TIMEOUT: '데이터베이스 요청 시간이 초과되었습니다. 다시 시도해주세요.',
  INTEGRITY_ERROR: '데이터 무결성 오류가 발생했습니다.',
  DB_CONNECTION: '데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
  NETWORK_ERROR: '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.',
};

// 최근 표시된 에러 메시지와 시간 추적 (중복 방지)
const messageRegistry = new Map();
const MESSAGE_TIMEOUT = 3000; // 3초
const CLEAR_INTERVAL = 60000; // 1분마다 오래된 메시지 제거

// 주기적으로 오래된 메시지 정보 제거
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of messageRegistry.entries()) {
    if (now - timestamp > MESSAGE_TIMEOUT) {
      messageRegistry.delete(key);
    }
  }
}, CLEAR_INTERVAL);

/**
 * 중복 메시지 방지 기능이 있는 메시지 표시 함수
 * 같은 메시지는 일정 시간 내에 한 번만 표시됩니다.
 *
 * @param {string} content - 표시할 메시지 내용
 * @param {string} type - 메시지 유형 ('error', 'warning', 'info', 'success')
 * @param {number} duration - 메시지 표시 시간 (밀리초)
 * @returns {boolean} 메시지가 표시되었는지 여부
 */
export const showUniqueMessage = (
  content,
  type = 'error',
  duration = MESSAGE_TIMEOUT
) => {
  // 빈 메시지 무시
  if (!content) return false;

  const key = `${type}:${content}`;
  const now = Date.now();

  // 이미 표시된 메시지인지 확인
  if (messageRegistry.has(key)) {
    const lastShown = messageRegistry.get(key);
    if (now - lastShown < MESSAGE_TIMEOUT) {
      return false; // 중복 메시지 표시 방지
    }
  }

  // 새 메시지 등록
  messageRegistry.set(key, now);

  // 메시지 유형에 따라 적절한 함수 호출
  switch (type) {
    case 'error':
      message.error({ content, key, duration });
      break;
    case 'warning':
      message.warning({ content, key, duration });
      break;
    case 'info':
      message.info({ content, key, duration });
      break;
    case 'success':
      message.success({ content, key, duration });
      break;
    default:
      message.info({ content, key, duration });
  }

  return true;
};

/**
 * API 오류를 처리하는 함수
 * 백엔드 응답 형식에 맞게 오류를 분석하고 적절한 메시지를 표시합니다.
 *
 * @param {Error} error - 에러 객체
 * @param {Object} options - 옵션
 * @param {string} options.context - 오류 컨텍스트
 * @param {boolean} options.showMessage - 사용자에게 메시지 표시 여부
 * @returns {Object} 처리된 오류 정보
 */
export const handleApiError = (error, options = {}) => {
  const { context = '', showMessage = true } = options;
  const errorInfo = { handled: false, message: null, errorCode: null };

  // 메시지 표시가 비활성화된 경우 빠르게 반환
  if (!showMessage) return errorInfo;

  // 응답이 없는 경우 (네트워크 오류)
  if (!error.response) {
    console.error(`${context} - 네트워크 오류:`, error);
    errorInfo.message = '네트워크 연결을 확인해주세요.';
    errorInfo.errorCode = 'NETWORK_ERROR';
    showUniqueMessage(errorInfo.message);
    return { ...errorInfo, handled: true };
  }

  // 백엔드 응답에서 에러 정보 추출
  const { status, data } = error.response;
  const errorCode = data?.error_code || '';
  const errorMessage = data?.message || '오류가 발생했습니다.';

  // 에러 로깅
  console.error(`${context} - HTTP ${status} 오류:`, {
    status,
    errorCode,
    message: errorMessage,
    data,
  });

  errorInfo.errorCode = errorCode;

  // 상태 코드별 처리
  switch (status) {
    case 401: // 인증 오류
      errorInfo.message = '인증이 필요합니다. 다시 로그인해주세요.';
      showUniqueMessage(errorInfo.message);
      // 로그인 페이지로 리다이렉션은 api.js에서 처리
      break;

    case 403: // 권한 오류
      errorInfo.message = '해당 작업을 수행할 권한이 없습니다.';
      showUniqueMessage(errorInfo.message);
      break;

    case 404: // 리소스 없음
      errorInfo.message = '요청한 정보를 찾을 수 없습니다.';
      showUniqueMessage(errorInfo.message);
      break;

    case 409: // 충돌 (락 등)
      if (errorCode === 'LOCK_CONFLICT') {
        // 락 충돌은 별도 모달에서 처리하므로 메시지 표시 안함
        errorInfo.message = errorMessage;
        errorInfo.handled = true;
        return errorInfo;
      }
      errorInfo.message = errorMessages[errorCode] || errorMessage;
      showUniqueMessage(errorInfo.message);
      break;

    case 422: // 유효성 검증 오류
      errorInfo.message = errorMessage;
      showUniqueMessage(errorInfo.message);
      break;

    case 500: // 서버 오류
      errorInfo.message =
        '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      // 서버 오류는 알림으로 표시 (더 눈에 띄게)
      notification.error({
        message: '서버 오류',
        description: errorInfo.message,
        key: 'server-error',
      });
      break;

    default: // 기타 오류
      // 에러 코드에 따른 메시지 또는 서버에서 온 메시지 사용
      errorInfo.message = errorMessages[errorCode] || errorMessage;
      showUniqueMessage(errorInfo.message);
  }

  errorInfo.handled = true;
  return errorInfo;
};

/**
 * 모달, 폼 등에서 발생하는 일반 오류 처리
 * 간단한 형태의 오류 처리와 메시지 표시를 제공합니다.
 *
 * @param {Error} error - 오류 객체
 * @param {string} context - 오류 발생 컨텍스트
 * @param {Function} onComplete - 오류 처리 후 실행할 콜백
 */
export const handleFormError = (error, context = '작업', onComplete) => {
  console.error(`${context} 중 오류 발생:`, error);
  showUniqueMessage(`${context} 중 오류가 발생했습니다`);

  if (onComplete) onComplete();
};

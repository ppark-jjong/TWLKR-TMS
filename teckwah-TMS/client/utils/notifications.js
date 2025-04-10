import { notification } from 'antd';

/**
 * 표준화된 알림 유틸리티
 * Ant Design의 notification API를 활용합니다.
 */

// 성공 알림
export const showSuccess = (message, description = '', duration = 3) => {
  notification.success({
    message: message || '성공',
    description,
    duration,
    placement: 'topRight'
  });
};

// 오류 알림
export const showError = (message, description = '', duration = 5) => {
  notification.error({
    message: message || '오류가 발생했습니다',
    description,
    duration,
    placement: 'topRight'
  });
};

// 경고 알림
export const showWarning = (message, description = '', duration = 4) => {
  notification.warning({
    message: message || '주의',
    description,
    duration,
    placement: 'topRight'
  });
};

// 정보 알림
export const showInfo = (message, description = '', duration = 3) => {
  notification.info({
    message: message || '알림',
    description,
    duration,
    placement: 'topRight'
  });
};

// API 응답 기반 알림 처리
export const handleApiResponse = (response, successMsg, errorMsg = null) => {
  if (response.success) {
    showSuccess(successMsg || response.message);
    return true;
  } else {
    showError(errorMsg || response.message, response.error_code || '');
    return false;
  }
};

// API 에러 처리
export const handleApiError = (error, fallbackMsg = '요청 중 오류가 발생했습니다') => {
  const errorMessage = error.response?.data?.message || error.message || fallbackMsg;
  const errorCode = error.response?.data?.error_code || '';
  
  showError(errorMessage, errorCode);
  return false;
};

export default {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  handleApiResponse,
  handleApiError
};
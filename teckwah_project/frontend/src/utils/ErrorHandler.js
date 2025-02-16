// frontend/src/utils/ErrorHandler.js
import { message } from 'antd';

/**
 * 전역 에러 핸들러
 * - axios 에러 응답 처리
 * - 사용자 친화적 에러 메시지 표시
 */
class ErrorHandler {
  static handle(error) {
    // 이미 에러 메시지가 표시된 경우 중복 표시 방지
    if (error.handled) return;

    let errorMessage = '오류가 발생했습니다.';

    if (error.response) {
      // 서버에서 전달된 에러 메시지가 있는 경우
      errorMessage = error.response.data?.detail || errorMessage;
      
      // 특정 HTTP 상태 코드에 대한 처리
      switch (error.response.status) {
        case 400:
          errorMessage = error.response.data?.detail || '잘못된 요청입니다.';
          break;
        case 401:
          errorMessage = '인증이 필요합니다. 다시 로그인해주세요.';
          // 로그인 페이지로 리다이렉트는 axios 인터셉터에서 처리
          break;
        case 403:
          errorMessage = '접근 권한이 없습니다.';
          break;
        case 404:
          errorMessage = '요청한 리소스를 찾을 수 없습니다.';
          break;
        case 500:
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
          break;
      }
    } else if (error.request) {
      // 요청은 보냈으나 응답을 받지 못한 경우
      errorMessage = '서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요.';
    }

    message.error({
      content: errorMessage,
      key: 'error', // 동일한 key를 사용하여 중복 메시지 방지
      duration: 3
    });

    // 에러가 처리되었음을 표시
    error.handled = true;
  }
}

export default ErrorHandler;
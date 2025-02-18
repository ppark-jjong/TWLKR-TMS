// frontend/src/utils/message.js
import { message } from 'antd';

// 전역 message 설정
message.config({
  maxCount: 1,
  duration: 2,
});

// 메시지 키 정의
export const MessageKeys = {
  AUTH: {
    LOGIN: 'auth-login',
    LOGOUT: 'auth-logout',
    SESSION: 'auth-session'
  },
  DASHBOARD: {
    LOAD: 'dashboard-load',
    CREATE: 'dashboard-create',
    UPDATE: 'dashboard-update',
    DELETE: 'dashboard-delete',
    DETAIL: 'dashboard-detail',
    STATUS: 'dashboard-status',
    ASSIGN: 'dashboard-assign',
    MEMO: 'dashboard-memo'
  },
  VISUALIZATION: {
    LOAD: 'visualization-load',
    DATE: 'visualization-date'
  }
};

// 메시지 템플릿 정의
export const MessageTemplates = {
  // 인증 관련
  AUTH: {
    LOGIN_SUCCESS: '로그인되었습니다',
    LOGIN_FAIL: '아이디 또는 비밀번호가 올바르지 않습니다',
    LOGOUT_SUCCESS: '로그아웃되었습니다',
    SESSION_EXPIRE: '세션이 만료되었습니다. 다시 로그인해주세요'
  },
  // 대시보드 관련
  DASHBOARD: {
    LOAD_SUCCESS: '데이터를 조회했습니다',
    LOAD_FAIL: '데이터 조회 중 오류가 발생했습니다',
    CREATE_SUCCESS: '대시보드가 생성되었습니다',
    CREATE_FAIL: '대시보드 생성 중 오류가 발생했습니다',
    DELETE_SUCCESS: '선택한 항목이 삭제되었습니다',
    DELETE_FAIL: '삭제 중 오류가 발생했습니다',
    DETAIL_FAIL: '상세 정보 조회 중 오류가 발생했습니다',
    STATUS_SUCCESS: (status) => `${status} 상태로 변경되었습니다`,
    STATUS_FAIL: '상태 변경 중 오류가 발생했습니다',
    ASSIGN_SUCCESS: '배차가 완료되었습니다',
    ASSIGN_FAIL: '배차 처리 중 오류가 발생했습니다',
    MEMO_SUCCESS: '메모가 업데이트되었습니다',
    MEMO_FAIL: '메모 업데이트 중 오류가 발생했습니다',
    VALIDATION: {
      WAITING_STATUS: (orderNos) => `다음 주문은 대기 상태가 아니어서 처리할 수 없습니다: ${orderNos}`,
      PHONE_FORMAT: '올바른 연락처 형식이 아닙니다',
      POSTAL_CODE: '올바른 우편번호가 아닙니다'
    }
  },
  // 시각화 관련
  VISUALIZATION: {
    LOAD_SUCCESS: '데이터를 조회했습니다',
    LOAD_FAIL: '데이터 조회 중 오류가 발생했습니다',
    DATE_INVALID: '올바른 날짜를 선택해주세요',
    FUTURE_DATE: '미래 날짜는 조회할 수 없습니다'
  }
};

const messageService = {
  show: (type, content, key) => {
    message[type]({
      content,
      key,
      duration: type === 'error' ? 3 : 2
    });
  },

  success: (content, key) => {
    messageService.show('success', content, key);
  },

  error: (content, key) => {
    messageService.show('error', content, key);
  },

  warning: (content, key) => {
    messageService.show('warning', content, key);
  },

  info: (content, key) => {
    messageService.show('info', content, key);
  },

  loading: (content, key) => {
    message.loading({
      content,
      key,
      duration: 0
    });
  },

  loadingToSuccess: (content, key) => {
    messageService.success(content, key);
  },

  loadingToError: (content, key) => {
    messageService.error(content, key);
  }
};

export default messageService;
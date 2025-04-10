// src/utils/permissionUtils.js

/**
 * 권한 관련 유틸리티 함수
 */

/**
 * 특정 액션에 대한 권한 여부 확인
 * @param {string} action - 확인할 액션
 * @param {string} userRole - 사용자 권한
 * @returns {boolean} 권한 유무
 */
export const hasPermission = (action, userRole) => {
  // 관리자는 모든 권한 가짐
  if (userRole === 'ADMIN') return true;

  // 일반 사용자 권한 매핑
  const userPermissions = {
    // 상태 변경 관련
    change_status_to_in_progress: true,
    change_status_to_complete: true,
    change_status_to_issue: true,
    change_status_to_cancel: true,

    // 배차 관련
    assign_driver: true,

    // 상세 조회
    view_detail: true,

    // 검색 관련
    search_dashboard: true,

    // 관리자 전용 기능
    delete_dashboard: false,
    download_excel: false,
    view_admin: false,
  };

  return userPermissions[action] || false;
};

/**
 * 사용자 권한별 가능한 상태 변경 목록
 * @param {string} currentStatus - 현재 상태
 * @param {string} userRole - 사용자 권한
 * @returns {Array<string>} 변경 가능한 상태 목록
 */
export const getAvailableStatusTransitions = (currentStatus, userRole) => {
  // 관리자는 모든 상태로 변경 가능
  if (userRole === 'ADMIN') {
    return ['WAITING', 'IN_PROGRESS', 'COMPLETE', 'ISSUE', 'CANCEL'];
  }

  // 일반 사용자는 상태 흐름에 따라 제한적 변경
  const statusTransitions = {
    WAITING: ['IN_PROGRESS', 'CANCEL'],
    IN_PROGRESS: ['COMPLETE', 'ISSUE', 'CANCEL'],
    COMPLETE: [],
    ISSUE: [],
    CANCEL: [],
  };

  return statusTransitions[currentStatus] || [];
};

/**
 * 상태코드를 표시 텍스트로 변환
 * @param {string} status - 상태 코드
 * @returns {string} 표시 텍스트
 */
export const getStatusText = (status) => {
  const texts = {
    WAITING: '대기',
    IN_PROGRESS: '진행',
    COMPLETE: '완료',
    ISSUE: '이슈',
    CANCEL: '취소',
  };
  return texts[status] || status;
};

/**
 * 상태코드에 따른 색상 반환
 * @param {string} status - 상태 코드
 * @returns {string} 색상 코드
 */
export const getStatusColor = (status) => {
  const colors = {
    WAITING: 'blue',
    IN_PROGRESS: 'orange',
    COMPLETE: 'green',
    ISSUE: 'red',
    CANCEL: 'gray',
  };
  return colors[status] || 'default';
};

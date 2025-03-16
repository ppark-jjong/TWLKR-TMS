// frontend/src/utils/LogUtils.js
/**
 * 환경에 따른 로깅 관리를 위한 유틸리티
 * 개발 환경에서는 모든 로그를 출력하고, 프로덕션 환경에서는 필요한 로그만 출력합니다.
 */

// 현재 환경 확인
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * 로깅 유틸리티 훅
 * @param {string} namespace - 로그 네임스페이스 (컴포넌트 또는 모듈 이름)
 * @returns {Object} - 로깅 메서드를 포함한 객체
 */
export function useLogger(namespace = "") {
  const prefix = namespace ? `[${namespace}]` : "";

  return {
    /**
     * 디버그 레벨 로그 - 개발 환경에서만 출력
     */
    debug: (...args) => {
      if (isDevelopment) {
        console.debug(`${prefix} DEBUG:`, ...args);
      }
    },

    /**
     * 정보 레벨 로그 - 프로덕션에서도 중요한 정보 기록
     */
    info: (...args) => {
      if (isDevelopment) {
        console.info(`${prefix} INFO:`, ...args);
      } else {
        // 프로덕션에서는 필요한 경우에만 로깅
        // 예: 원격 로깅 서비스로 전송
      }
    },

    /**
     * 경고 레벨 로그
     */
    warn: (...args) => {
      if (isDevelopment) {
        console.warn(`${prefix} WARNING:`, ...args);
      } else {
        // 프로덕션에서는 중요 경고만 기록
        console.warn(`${prefix}:`, ...args[0]); // 첫 번째 메시지만 기록
      }
    },

    /**
     * 에러 레벨 로그 - 항상 출력
     */
    error: (...args) => {
      console.error(`${prefix} ERROR:`, ...args);
      // 프로덕션에서는 원격 에러 추적 서비스로 전송할 수 있음
    },

    /**
     * 성능 측정 로그
     * @param {string} label - 측정 레이블
     * @param {Function} callback - 측정할 함수
     * @returns {any} - 콜백 함수의 반환값
     */
    measure: (label, callback) => {
      if (!isDevelopment) return callback();

      console.time(`${prefix} ${label}`);
      try {
        return callback();
      } finally {
        console.timeEnd(`${prefix} ${label}`);
      }
    },
  };
}

// 기본 로거 인스턴스 (네임스페이스 없음)
export const logger = useLogger();

export default useLogger;

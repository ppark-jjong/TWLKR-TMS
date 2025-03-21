// src/utils/Logger.js (수정)
/**
 * 간소화된 로깅 유틸리티
 */
class Logger {
  static isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * 로거 인스턴스 생성
   * @param {string} namespace - 로거 네임스페이스
   * @returns {Object} 로거 인스턴스
   */
  static getLogger(namespace = '') {
    const prefix = namespace ? `[${namespace}]` : '';

    return {
      /**
       * 디버그 레벨 로그 - 개발 환경에서만 출력
       */
      debug: (...args) => {
        if (Logger.isDevelopment) {
          console.debug(`${prefix} DEBUG:`, ...args);
        }
      },

      /**
       * 정보 레벨 로그
       */
      info: (...args) => {
        if (Logger.isDevelopment) {
          console.info(`${prefix} INFO:`, ...args);
        }
      },

      /**
       * 경고 레벨 로그
       */
      warn: (...args) => {
        console.warn(`${prefix} WARNING:`, ...args);
      },

      /**
       * 에러 레벨 로그 - 항상 출력
       */
      error: (...args) => {
        console.error(`${prefix} ERROR:`, ...args);
      },
    };
  }
}

// 기본 로거 인스턴스 (네임스페이스 없음)
export const defaultLogger = Logger.getLogger();

export default Logger;

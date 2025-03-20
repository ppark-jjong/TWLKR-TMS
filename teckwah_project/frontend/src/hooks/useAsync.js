// src/hooks/useAsync.js
import { useState, useCallback, useRef, useEffect } from 'react';
import message from '../utils/message';
import { useLogger } from '../utils/LogUtils';

/**
 * 비동기 API 호출 상태 관리를 위한 커스텀 훅
 * 백엔드 API 응답 구조에 맞게 개선된 데이터/오류 처리
 * 중복 요청 방지 및 컴포넌트 언마운트 시 안전 처리 지원
 *
 * @param {Function} asyncFunction - 비동기 함수 (Promise를 반환)
 * @param {Object} options - 옵션 객체
 * @param {boolean} options.immediate - 즉시 실행 여부
 * @param {string} options.messageKey - 메시지 서비스 키
 * @param {string|Function} options.loadingMessage - 로딩 중 메시지
 * @param {string|Function} options.successMessage - 성공 시 메시지
 * @param {string|Function} options.errorMessage - 에러 시 메시지
 * @param {Function} options.onSuccess - 성공 시 콜백
 * @param {Function} options.onError - 에러 시 콜백
 * @param {boolean} options.preventMultiple - 중복 요청 방지 (기본값: true)
 * @returns {Object} 상태 및 실행 함수
 */
export const useAsync = (asyncFunction, options = {}) => {
  const {
    immediate = false,
    messageKey,
    loadingMessage,
    successMessage,
    errorMessage,
    onSuccess,
    onError,
    preventMultiple = true,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const logger = useLogger('useAsync');

  // 중복 요청 방지를 위한 ref
  const isPendingRef = useRef(false);

  // 컴포넌트 언마운트 감지를 위한 ref
  const mountedRef = useRef(true);

  // cleanup 함수
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * 비동기 함수 실행
   * @param  {...any} params - 비동기 함수 파라미터
   * @returns {Promise<any>} - 실행 결과 또는 null (에러/취소 시)
   */
  const execute = useCallback(
    async (...params) => {
      // 중복 요청 방지
      if (preventMultiple && isPendingRef.current) {
        logger.info('이미 요청이 진행 중입니다. 중복 요청을 방지합니다.');
        return null;
      }

      // 현재 로딩 메시지 결정
      const currentLoadingMessage =
        typeof loadingMessage === 'function'
          ? loadingMessage(...params)
          : loadingMessage;

      try {
        // 상태 초기화
        setLoading(true);
        setError(null);
        isPendingRef.current = true;

        // 로딩 메시지 표시
        if (currentLoadingMessage && messageKey) {
          message.loading(currentLoadingMessage, messageKey);
        }

        // 요청 시작 로깅
        logger.debug('비동기 요청 시작:', { params });

        // 비동기 함수 실행
        const result = await asyncFunction(...params);

        // 요청 완료 로깅
        logger.debug('비동기 요청 완료:', { result });

        // 언마운트된 경우 상태 업데이트 방지
        if (!mountedRef.current) return null;

        // 백엔드 응답 구조 검증 및 처리
        if (result && typeof result === 'object') {
          // API가 {success: true/false, ...} 구조를 반환하는 경우
          if ('success' in result && !result.success) {
            // 성공이 false인 경우 에러로 처리
            throw new Error(result.message || '요청이 실패했습니다');
          }
        }

        // 데이터 설정
        setData(result);

        // 성공 메시지 표시
        if (successMessage && messageKey) {
          const finalMessage =
            typeof successMessage === 'function'
              ? successMessage(result)
              : successMessage;

          message.success(finalMessage, messageKey);
        }

        // 성공 콜백 실행
        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        // 언마운트된 경우 상태 업데이트 방지
        if (!mountedRef.current) return null;

        // 에러 로깅
        logger.error('비동기 요청 오류:', err);

        // 에러 설정
        setError(err);

        // 에러 메시지 표시
        if (errorMessage && messageKey) {
          const finalErrorMessage =
            typeof errorMessage === 'function'
              ? errorMessage(err)
              : errorMessage;

          message.error(finalErrorMessage, messageKey);
        }

        // 에러 콜백 실행
        if (onError) {
          onError(err);
        }

        return null;
      } finally {
        // 언마운트된 경우 상태 업데이트 방지
        if (mountedRef.current) {
          setLoading(false);
        }

        isPendingRef.current = false;
        logger.debug('비동기 요청 상태 정리 완료');
      }
    },
    [
      asyncFunction,
      loadingMessage,
      successMessage,
      errorMessage,
      messageKey,
      onSuccess,
      onError,
      preventMultiple,
      logger,
    ]
  );

  // 즉시 실행
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  /**
   * 로딩 중 메시지에서 성공 메시지로 전환
   * @param {string} msg - 성공 메시지
   * @param {string} key - 메시지 키
   */
  const loadingToSuccess = useCallback(
    (msg, key = messageKey) => {
      if (key) {
        message.loadingToSuccess(msg, key);
      }
    },
    [messageKey]
  );

  /**
   * 로딩 중 메시지에서 에러 메시지로 전환
   * @param {string} msg - 에러 메시지
   * @param {string} key - 메시지 키
   */
  const loadingToError = useCallback(
    (msg, key = messageKey) => {
      if (key) {
        message.loadingToError(msg, key);
      }
    },
    [messageKey]
  );

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setError(null);
    setData(null);
  }, []);

  /**
   * 데이터 직접 설정
   * @param {any} newData - 설정할 새 데이터
   */
  const setDataValue = useCallback((newData) => {
    setData(newData);
  }, []);

  /**
   * 로딩 상태 직접 설정
   * @param {boolean} isLoading - 설정할 로딩 상태
   */
  const setLoadingState = useCallback((isLoading) => {
    setLoading(isLoading);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    setData: setDataValue,
    setLoading: setLoadingState,
    reset,
    loadingToSuccess,
    loadingToError,
    isPending: isPendingRef.current,
  };
};

export default useAsync;

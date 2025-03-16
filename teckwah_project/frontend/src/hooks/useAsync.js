// src/hooks/useAsync.js
import { useState, useCallback, useRef, useEffect } from 'react';
import message from '../utils/message';

/**
 * 비동기 API 호출 상태 관리를 위한 커스텀 훅
 * @param {Function} asyncFunction - 비동기 함수 (Promise를 반환)
 * @param {Object} options - 옵션 객체
 * @param {boolean} options.immediate - 즉시 실행 여부
 * @param {string} options.messageKey - 메시지 서비스 키
 * @param {string} options.loadingMessage - 로딩 중 메시지
 * @param {string} options.successMessage - 성공 시 메시지
 * @param {string} options.errorMessage - 에러 시 메시지
 * @param {Function} options.onSuccess - 성공 시 콜백
 * @param {Function} options.onError - 에러 시 콜백
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

  // 비동기 함수 실행
  const execute = useCallback(
    async (...params) => {
      // 중복 요청 방지
      if (preventMultiple && isPendingRef.current) {
        console.log('이미 요청이 진행 중입니다.');
        return null;
      }

      try {
        // 상태 초기화
        setLoading(true);
        setError(null);
        isPendingRef.current = true;

        // 로딩 메시지 표시
        if (loadingMessage && messageKey) {
          message.loading(loadingMessage, messageKey);
        }

        // 비동기 함수 실행
        const result = await asyncFunction(...params);

        // 언마운트된 경우 상태 업데이트 방지
        if (!mountedRef.current) return null;

        // 데이터 설정
        setData(result);

        // 성공 메시지 표시
        if (successMessage && messageKey) {
          // successMessage가 함수인 경우 결과를 인자로 전달
          const finalMessage =
            typeof successMessage === 'function'
              ? successMessage(result)
              : successMessage;

          message.loadingToSuccess(finalMessage, messageKey);
        }

        // 성공 콜백 실행
        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        // 언마운트된 경우 상태 업데이트 방지
        if (!mountedRef.current) return null;

        // 에러 설정
        setError(err);

        // 에러 메시지 표시
        if (errorMessage && messageKey) {
          // errorMessage가 함수인 경우 에러를 인자로 전달
          const finalErrorMessage =
            typeof errorMessage === 'function'
              ? errorMessage(err)
              : errorMessage;

          message.loadingToError(finalErrorMessage, messageKey);
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
    ]
  );

  // 즉시 실행
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    loading,
    error,
    data,
    execute,
    setData,
    reset: useCallback(() => {
      setError(null);
      setData(null);
    }, []),
  };
};

export default useAsync;

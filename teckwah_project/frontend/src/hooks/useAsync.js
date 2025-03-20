// src/hooks/useAsync.js
import { useState, useCallback, useRef, useEffect } from "react";
import message from "../utils/message";
import { useLogger } from "../utils/LogUtils";

/**
 * 비동기 작업을 관리하는 커스텀 훅
 * 로딩 상태, 에러 처리, 메시지 표시 등 통합 관리
 *
 * @param {Function} asyncFunction - 비동기 함수
 * @param {Object} options - 옵션 객체
 * @returns {Object} - 상태 및 실행 함수
 */
const useAsync = (asyncFunction, options = {}) => {
  const {
    immediate = false,
    messageKey,
    loadingMessage,
    successMessage,
    errorMessage,
    onSuccess,
    onError,
    validate,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const logger = useLogger("useAsync");
  const mountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  // 컴포넌트 언마운트 감지
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 비동기 함수 실행
  const execute = useCallback(
    async (...args) => {
      // 이미 요청 중이면 중복 요청 방지
      if (isFetchingRef.current) {
        return;
      }

      // 폼 값 검증 (제공된 경우)
      if (validate) {
        const errors = validate(...args);
        if (errors && Object.keys(errors).length > 0) {
          setError(Object.values(errors)[0]);
          return;
        }
      }

      try {
        setLoading(true);
        setError(null);
        isFetchingRef.current = true;

        // 로딩 메시지 표시
        if (loadingMessage && messageKey) {
          message.loading(loadingMessage, messageKey);
        }

        const result = await asyncFunction(...args);

        // 컴포넌트가 언마운트되었으면 상태 업데이트 안함
        if (!mountedRef.current) return;

        setData(result);

        // 성공 메시지 표시
        if (successMessage && messageKey) {
          message.success(successMessage, messageKey);
        }

        // 성공 콜백 실행
        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        // 컴포넌트가 언마운트되었으면 상태 업데이트 안함
        if (!mountedRef.current) return;

        logger.error("비동기 작업 실패:", err);
        setError(err.message || "오류가 발생했습니다");

        // 에러 메시지 표시
        if (errorMessage && messageKey) {
          message.error(errorMessage, messageKey);
        }

        // 에러 콜백 실행
        if (onError) {
          onError(err);
        }

        return null;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
        isFetchingRef.current = false;
      }
    },
    [
      asyncFunction,
      validate,
      loadingMessage,
      successMessage,
      errorMessage,
      messageKey,
      onSuccess,
      onError,
      logger,
    ]
  );

  // 즉시 실행 (immediate === true인 경우)
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
  };
};

export default useAsync;

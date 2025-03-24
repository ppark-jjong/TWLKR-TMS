// src/components/common/ErrorBoundaryWithName.js
import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { LoadingErrorFallback } from './ErrorFallback';

/**
 * 이름 지정 가능한 에러 경계 컴포넌트
 * 기존 ErrorBoundaryWithFallback을 대체하는 호환성 컴포넌트
 *
 * @param {Object} props - 컴포넌트 속성
 * @param {string} props.name - 에러 발생 시 표시할 컴포넌트 이름
 * @param {React.ReactNode} props.children - 자식 컴포넌트들
 * @param {Function} props.onError - 에러 발생 시 호출할 콜백 함수
 * @param {React.ReactNode|Function} props.fallback - 커스텀 에러 UI (옵션)
 */
const ErrorBoundaryWithName = ({ name, children, onError, fallback }) => {
  // 커스텀 폴백이 없으면 기본 로딩 에러 폴백 사용
  const defaultFallback = ({ error, errorInfo, retry, reload }) => (
    <LoadingErrorFallback
      error={error}
      errorInfo={errorInfo}
      retry={retry}
      reload={reload}
      componentName={name}
    />
  );

  return (
    <ErrorBoundary fallback={fallback || defaultFallback} onError={onError}>
      {children}
    </ErrorBoundary>
  );
};

/**
 * 원래의 ErrorBoundaryWithFallback과의 호환성을 위한 별칭
 */
export const ErrorBoundaryWithFallback = ErrorBoundaryWithName;

export default ErrorBoundaryWithName;

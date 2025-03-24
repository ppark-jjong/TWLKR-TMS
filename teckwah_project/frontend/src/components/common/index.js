// src/components/common/index.js
import ErrorBoundary from './ErrorBoundary';
import ErrorBoundaryWithName, {
  ErrorBoundaryWithFallback,
} from './ErrorBoundaryWithName';
import ErrorFallback from './ErrorFallback';

// 개별 폴백 UI 컴포넌트 다시 내보내기
export const {
  SevereCrashFallback,
  RecoverableFallback,
  LoadingErrorFallback,
  SimpleFallback,
} = ErrorFallback;

// 기존 컴포넌트와의 호환성을 위한 내보내기
export { ErrorBoundary, ErrorBoundaryWithName, ErrorBoundaryWithFallback };

// 기본 내보내기: 가장 자주 사용하는 컴포넌트
export default ErrorBoundary;

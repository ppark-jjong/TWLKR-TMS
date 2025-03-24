// src/components/common/error/ErrorBoundary.js
import React from 'react';

/**
 * 기본 에러 경계 컴포넌트
 * React 컴포넌트 트리에서 발생하는 JavaScript 에러를 포착하고 처리
 *
 * @props {React.ReactNode} children - 자식 컴포넌트
 * @props {React.ReactNode|Function} fallback - 에러 발생 시 표시할 UI 또는 렌더 함수
 * @props {Function} onError - 에러 발생 시 호출할 콜백 함수
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // 에러 발생 시 상태 업데이트
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 정보 저장 및 로깅
    this.setState({
      errorInfo,
      errorCount: this.state.errorCount + 1,
    });

    // 에러 로깅
    console.error(`ErrorBoundary: 오류 발생:`, error, errorInfo);

    // 외부 에러 핸들러 호출 (제공된 경우)
    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, errorInfo, this.state.errorCount);
      } catch (handlerError) {
        console.error(
          `ErrorBoundary: 에러 핸들러 실행 중 오류 발생`,
          handlerError
        );
      }
    }
  }

  // 복구 시도
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  // 페이지 새로고침
  handleReload = () => {
    window.location.reload();
  };

  // 홈으로 이동
  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback } = this.props;

    // 에러가 없으면 자식 렌더링
    if (!hasError) {
      return children;
    }

    // 폴백 UI가 제공된 경우 사용
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback({
          error,
          errorInfo,
          resetError: this.handleRetry,
          retry: this.handleRetry,
          reload: this.handleReload,
          goHome: this.handleGoHome,
          errorCount,
        });
      }
      return fallback;
    }

    // 기본 에러 메시지 (폴백이 제공되지 않은 경우)
    return (
      <div
        style={{
          padding: '20px',
          margin: '10px',
          border: '1px solid #f5222d',
          borderRadius: '4px',
          backgroundColor: '#fff1f0',
        }}
      >
        <h2 style={{ color: '#f5222d' }}>오류가 발생했습니다</h2>
        <p>컴포넌트 렌더링 중 문제가 발생했습니다.</p>
        <button
          onClick={this.handleRetry}
          style={{
            padding: '4px 8px',
            background: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '8px',
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
        <button
          onClick={this.handleReload}
          style={{
            padding: '4px 8px',
            background: '#ffffff',
            color: '#000000',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          페이지 새로고침
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;

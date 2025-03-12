// frontend/src/components/common/ErrorBoundary.js
import React from 'react';
import { Result, Button } from 'antd';

/**
 * 에러 경계 컴포넌트
 * React 컴포넌트 트리의 하위에서 발생하는 JavaScript 에러를 감지하고 처리
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 로깅
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="오류가 발생했습니다"
          subTitle="페이지 로드 중 문제가 발생했습니다. 다시 시도해주세요."
          extra={[
            <Button 
              type="primary" 
              key="reload"
              onClick={() => window.location.reload()}
            >
              새로고침
            </Button>
          ]}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
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

  // ErrorBoundary.js 수정
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // 인증 관련 오류인지 확인
    const isAuthError =
      error.message.includes('auth') ||
      error.message.includes('token') ||
      error.message.includes('Cannot access') || // 일반적인 초기화 오류도 포함
      errorInfo.componentStack.includes('Auth');

    if (isAuthError) {
      // 인증 데이터 초기화 및 로그인 페이지로 리디렉션
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      // 현재 URL 저장
      localStorage.setItem('returnUrl', window.location.pathname);

      // 로그인 페이지로 리디렉션
      window.location.replace('/login');
    }
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
            </Button>,
          ]}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

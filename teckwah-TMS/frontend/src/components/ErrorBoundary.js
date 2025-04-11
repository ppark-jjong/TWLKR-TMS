import React from 'react';
import { Button, Result } from 'antd';

/**
 * 에러 경계 컴포넌트
 * 하위 컴포넌트에서 발생한 에러를 캐치하여 대체 UI를 렌더링
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 하위 컴포넌트에서 에러 발생 시 상태 업데이트
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 정보 로깅
    console.error('에러 경계 캐치:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    // 상태 초기화 후 페이지 새로고침
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 에러 발생 시 대체 UI 렌더링
      return (
        <Result
          status="error"
          title="오류가 발생했습니다"
          subTitle="애플리케이션에서 예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 나중에 다시 시도해주세요."
          extra={[
            <Button type="primary" key="refresh" onClick={this.handleReset}>
              페이지 새로고침
            </Button>,
          ]}
        />
      );
    }

    // 정상 상태일 때 하위 컴포넌트 렌더링
    return this.props.children;
  }
}

export default ErrorBoundary;

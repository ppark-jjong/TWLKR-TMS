import React, { Component } from 'react';
import { Result, Button } from 'antd';
import PropTypes from 'prop-types';

/**
 * 컴포넌트 오류를 포착하고 대체 UI를 렌더링하는 ErrorBoundary 컴포넌트
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('컴포넌트 오류 발생:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return typeof fallback === 'function' 
        ? fallback(this.state.error, this.handleReset) 
        : fallback;
    }

    return (
      <Result
        status="error"
        title="컴포넌트 오류 발생"
        subTitle="컴포넌트 로드 중 오류가 발생했습니다"
        extra={[
          <Button key="reset" onClick={this.handleReset} type="primary">
            다시 시도
          </Button>,
          <Button key="reload" onClick={this.handleReload}>
            페이지 새로고침
          </Button>
        ]}
      />
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  showDetails: PropTypes.bool,
};

export default ErrorBoundary;
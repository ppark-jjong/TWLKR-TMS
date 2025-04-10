import React, { Component } from 'react';
import { Result, Button, Typography } from 'antd';
import PropTypes from 'prop-types';

const { Text, Paragraph } = Typography;

/**
 * 컴포넌트 오류를 포착하고 대체 UI를 렌더링하는 ErrorBoundary 컴포넌트
 * 
 * 사용 예시:
 * ```jsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
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
    // 다음 렌더링에서 대체 UI를 표시하도록 상태 업데이트
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 오류 정보를 상태에 저장
    this.setState({ errorInfo });
    
    // 로깅 등의 부가 작업 처리
    console.error('컴포넌트 오류 발생:', error, errorInfo);
    
    // 에러 로깅 서비스로 전송 (미구현)
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    // 페이지 새로고침
    window.location.reload();
  };

  handleReset = () => {
    // 컴포넌트 상태 초기화
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    // 오류가 없으면 자식 컴포넌트 정상 렌더링
    if (!hasError) {
      return children;
    }

    // 사용자 정의 fallback이 있으면 사용
    if (fallback) {
      return typeof fallback === 'function' 
        ? fallback(error, this.handleReset) 
        : fallback;
    }

    // 기본 오류 UI
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
      >
        {showDetails && (
          <div style={{ textAlign: 'left', marginTop: 20 }}>
            <Paragraph>
              <Text strong>오류 메시지:</Text>
            </Paragraph>
            <Paragraph>
              <Text code>{error?.toString() || '알 수 없는 오류'}</Text>
            </Paragraph>
            {errorInfo && (
              <>
                <Paragraph>
                  <Text strong>컴포넌트 스택:</Text>
                </Paragraph>
                <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '20px' }}>
                  <pre style={{ fontSize: '12px' }}>
                    {errorInfo.componentStack}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </Result>
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  showDetails: PropTypes.bool,
};

export default ErrorBoundary;
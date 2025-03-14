// frontend/src/components/common/ErrorBoundary.js
import React from 'react';
import { Result, Button, Typography, Space, Alert } from 'antd';

const { Text, Paragraph } = Typography;

/**
 * 에러 경계 컴포넌트
 * React 컴포넌트 트리의 하위에서 발생하는 JavaScript 에러를 감지하고 처리
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
    console.error('ErrorBoundary에서 오류 발생:', error, errorInfo);

    // 필요 시 외부 에러 로깅 서비스에 보고할 수 있음
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
    if (this.state.hasError) {
      // 복구 불가능한 심각한 오류 (여러 번 시도해도 실패)
      if (this.state.errorCount >= 3) {
        return (
          <Result
            status="500"
            title="애플리케이션 오류"
            subTitle="심각한 오류가 발생했습니다. 페이지를 새로고침하거나 홈으로 이동해 주세요."
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                페이지 새로고침
              </Button>,
              <Button key="home" onClick={this.handleGoHome}>
                홈으로 이동
              </Button>,
            ]}
          >
            <div style={{ marginTop: '20px', textAlign: 'left' }}>
              <Alert
                message="기술적 오류 정보"
                description={
                  <Paragraph>
                    <Text code>
                      {this.state.error && this.state.error.toString()}
                    </Text>
                  </Paragraph>
                }
                type="error"
              />
            </div>
          </Result>
        );
      }

      // 복구 가능한 일반 오류
      return (
        <Result
          status="warning"
          title="렌더링 오류"
          subTitle="컴포넌트 렌더링 중 문제가 발생했습니다. 다시 시도해주세요."
          extra={[
            <Button type="primary" key="retry" onClick={this.handleRetry}>
              다시 시도
            </Button>,
            <Button key="reload" onClick={this.handleReload}>
              페이지 새로고침
            </Button>,
          ]}
        >
          <div
            style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}
          >
            <Alert
              message="문제가 지속되면 다음 조치를 취해보세요:"
              description={
                <Space direction="vertical">
                  <Text>1. 브라우저 캐시 삭제 후 새로고침</Text>
                  <Text>2. 다른 브라우저로 접속 시도</Text>
                  <Text>3. 관리자에게 문의 (오류 발생 시간과 상황 공유)</Text>
                </Space>
              }
              type="info"
              showIcon
            />
          </div>
        </Result>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// src/utils/ErrorBoundaryWithFallback.js
import React from 'react';
import { Button, Typography, Space, Result } from 'antd';
import ErrorBoundary from '../components/common/ErrorBoundary';

const { Text, Paragraph } = Typography;

/**
 * 강화된 에러 경계 컴포넌트
 * 에러 발생 시 폴백 UI와 재시도 메커니즘 제공
 */
const ErrorBoundaryWithFallback = ({
  children,
  name = '컴포넌트',
  fallback = null,
}) => {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => {
        if (fallback) {
          return typeof fallback === 'function'
            ? fallback({ error, resetError })
            : fallback;
        }

        return (
          <Result
            status="error"
            title={`${name} 로드 중 오류가 발생했습니다`}
            subTitle="아래 정보를 확인하고 다시 시도해주세요"
            extra={[
              <Button key="retry" type="primary" onClick={resetError}>
                다시 시도
              </Button>,
              <Button key="refresh" onClick={() => window.location.reload()}>
                페이지 새로고침
              </Button>,
            ]}
          >
            <div style={{ textAlign: 'left', margin: '24px' }}>
              <Paragraph>
                <Text strong>오류 정보:</Text>
              </Paragraph>
              <Paragraph>
                <Text code style={{ whiteSpace: 'pre-wrap' }}>
                  {error.message || '알 수 없는 오류가 발생했습니다'}
                </Text>
              </Paragraph>
              {error.stack && (
                <Paragraph>
                  <Text
                    type="secondary"
                    style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}
                  >
                    {error.stack.split('\n').slice(0, 3).join('\n')}
                  </Text>
                </Paragraph>
              )}
            </div>
          </Result>
        );
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundaryWithFallback;

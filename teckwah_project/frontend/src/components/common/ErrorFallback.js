// src/components/common/ErrorFallback.js
import React from 'react';
import { Result, Button, Typography, Space, Alert } from 'antd';

const { Text, Paragraph } = Typography;

/**
 * 표준 에러 폴백 UI 모음
 * 다양한 상황과 컴포넌트에 맞는 에러 표시 UI 컴포넌트 제공
 */

/**
 * 심각한 오류에 대한 폴백 UI
 */
export const SevereCrashFallback = ({
  error,
  errorInfo,
  reload,
  goHome,
  componentName,
}) => (
  <Result
    status="500"
    title={
      componentName ? `${componentName} 컴포넌트 오류` : '애플리케이션 오류'
    }
    subTitle="심각한 오류가 발생했습니다. 페이지를 새로고침하거나 홈으로 이동해 주세요."
    extra={[
      <Button type="primary" key="reload" onClick={reload}>
        페이지 새로고침
      </Button>,
      <Button key="home" onClick={goHome}>
        홈으로 이동
      </Button>,
    ]}
  >
    <div style={{ marginTop: '20px', textAlign: 'left' }}>
      <Alert
        message="기술적 오류 정보"
        description={
          <Paragraph>
            <Text code>{error && error.toString()}</Text>
            {errorInfo && (
              <pre style={{ marginTop: 10, maxHeight: 300, overflow: 'auto' }}>
                {errorInfo.componentStack}
              </pre>
            )}
          </Paragraph>
        }
        type="error"
      />
    </div>
  </Result>
);

/**
 * 일반 오류에 대한 폴백 UI (복구 가능한 경우)
 */
export const RecoverableFallback = ({
  error,
  errorInfo,
  retry,
  reload,
  componentName,
}) => (
  <Result
    status="warning"
    title={componentName ? `${componentName} 렌더링 오류` : '렌더링 오류'}
    subTitle="컴포넌트 렌더링 중 문제가 발생했습니다. 다시 시도해주세요."
    extra={[
      <Button type="primary" key="retry" onClick={retry}>
        다시 시도
      </Button>,
      <Button key="reload" onClick={reload}>
        페이지 새로고침
      </Button>,
    ]}
  >
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
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

/**
 * 로딩 페이지 오류에 대한 폴백 UI
 */
export const LoadingErrorFallback = ({
  error,
  errorInfo,
  retry,
  reload,
  componentName,
}) => (
  <Result
    status="error"
    title={`${componentName || 'Component'} 로딩 오류`}
    subTitle="컴포넌트 로딩 중 문제가 발생했습니다."
    extra={[
      <Button type="primary" key="retry" onClick={retry}>
        다시 시도
      </Button>,
      <Button key="reload" onClick={reload}>
        페이지 새로고침
      </Button>,
    ]}
  >
    <div style={{ textAlign: 'left', marginTop: 20 }}>
      <Alert
        message="오류 상세 정보"
        description={
          <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
            {error ? error.toString() : '알 수 없는 오류'}
            {errorInfo && (
              <>
                <br />
                <br />
                {errorInfo.componentStack}
              </>
            )}
          </pre>
        }
        type="error"
      />
    </div>
  </Result>
);

/**
 * 간단한 오류 메시지 폴백 UI (경량 버전)
 */
export const SimpleFallback = ({ error, retry, reload, componentName }) => (
  <div
    style={{
      padding: '16px',
      margin: '8px',
      border: '1px solid #ffa39e',
      borderRadius: '4px',
      backgroundColor: '#fff2f0',
    }}
  >
    <h3 style={{ marginTop: 0, color: '#cf1322' }}>
      {componentName ? `${componentName} 오류` : '컴포넌트 오류'}
    </h3>
    <p>{error ? error.toString() : '알 수 없는 오류'}</p>
    <div>
      <button
        onClick={retry}
        style={{
          marginRight: '8px',
          padding: '4px 8px',
          backgroundColor: '#1890ff',
          color: 'white',
          border: 'none',
          borderRadius: '2px',
          cursor: 'pointer',
        }}
      >
        다시 시도
      </button>
      <button
        onClick={reload}
        style={{
          padding: '4px 8px',
          backgroundColor: 'white',
          border: '1px solid #d9d9d9',
          borderRadius: '2px',
          cursor: 'pointer',
        }}
      >
        새로고침
      </button>
    </div>
  </div>
);

export default {
  SevereCrashFallback,
  RecoverableFallback,
  LoadingErrorFallback,
  SimpleFallback,
};

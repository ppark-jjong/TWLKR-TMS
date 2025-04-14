/**
 * 오류 결과 컴포넌트
 */
import React from 'react';
import { Result, Button } from 'antd';

const ErrorResult = ({ 
  status = '500', 
  title = '오류가 발생했습니다', 
  subTitle = '요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.', 
  extra,
  onRetry
}) => {
  return (
    <Result
      status={status}
      title={title}
      subTitle={subTitle}
      extra={extra || (
        <Button type="primary" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    />
  );
};

export default ErrorResult;

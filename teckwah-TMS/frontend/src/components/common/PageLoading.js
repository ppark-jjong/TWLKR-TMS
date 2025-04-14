/**
 * 페이지 로딩 컴포넌트
 */
import React from 'react';
import { Spin } from 'antd';

const PageLoading = ({ tip = '로딩 중...' }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      minHeight: 300
    }}>
      <Spin tip={tip} size="large" />
    </div>
  );
};

export default PageLoading;

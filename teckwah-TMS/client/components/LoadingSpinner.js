// src/components/LoadingSpinner.js
import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const LoadingSpinner = ({ size = 'default', tip = '로딩 중...' }) => {
  const antIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 40 : 24 }} spin />;
  
  return (
    <div style={{ textAlign: 'center', padding: '30px 50px', margin: '20px 0' }}>
      <Spin indicator={antIcon} tip={tip} size={size} />
    </div>
  );
};

export default LoadingSpinner;
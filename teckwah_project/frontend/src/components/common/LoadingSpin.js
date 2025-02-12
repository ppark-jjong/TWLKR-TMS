// frontend/src/components/common/LoadingSpin.js
import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

/**
 * 로딩 스피너 컴포넌트
 * @param {Object} props
 * @param {string} props.tip - 로딩 메시지
 * @param {number} props.size - 스피너 크기
 */
const LoadingSpin = ({ tip = '로딩 중...', size = 24 }) => {
  const antIcon = <LoadingOutlined style={{ fontSize: size }} spin />;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      width: '100%',
      height: '100%'
    }}>
      <Spin indicator={antIcon} tip={tip} />
    </div>
  );
};

export default LoadingSpin;
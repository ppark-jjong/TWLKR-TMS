import React from 'react';
import { Typography } from 'antd';
import Visualization from '../components/Visualization';

const { Title } = Typography;

/**
 * 시각화 페이지
 * 배송 데이터 시각화를 위한 페이지 컴포넌트
 */
const VisualizationPage = () => {
  return (
    <div className="visualization-page">
      <Title level={2} style={{ marginBottom: 24 }}>배송 데이터 시각화</Title>
      <Visualization />
    </div>
  );
};

export default VisualizationPage; 
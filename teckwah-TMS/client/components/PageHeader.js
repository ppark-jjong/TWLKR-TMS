// src/components/PageHeader.js
import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const PageHeader = ({ title }) => {
  return (
    <div className="page-header">
      <Title level={3}>{title}</Title>
    </div>
  );
};

export default PageHeader;

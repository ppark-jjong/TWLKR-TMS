/**
 * 페이지 제목 컴포넌트
 */
import React from 'react';
import { Typography, Space, Divider } from 'antd';

const { Title } = Typography;

const PageTitle = ({ title, subtitle, extra }) => {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: subtitle ? 'flex-start' : 'center'
      }}>
        <Space direction="vertical" size={4} style={{ marginBottom: 8 }}>
          <Title level={4} style={{ margin: 0 }}>{title}</Title>
          {subtitle && (
            <Typography.Text type="secondary">{subtitle}</Typography.Text>
          )}
        </Space>
        
        {extra && (
          <div>
            {extra}
          </div>
        )}
      </div>
      <Divider style={{ margin: '16px 0' }} />
    </div>
  );
};

export default PageTitle;

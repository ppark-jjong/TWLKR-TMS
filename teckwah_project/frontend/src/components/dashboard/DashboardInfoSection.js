// src/components/dashboard/DashboardInfoSection.js
import React from 'react';
import { Typography } from 'antd';
import { FONT_STYLES } from '../../utils/Constants';

const { Title, Text } = Typography;

/**
 * 섹션 타이틀 컴포넌트
 */
export const SectionTitle = ({ children }) => (
  <Title
    level={5}
    style={{
      ...FONT_STYLES.TITLE.SMALL,
      marginBottom: '16px',
      color: '#1890ff',
      borderBottom: '2px solid #1890ff',
      paddingBottom: '8px',
    }}
  >
    {children}
  </Title>
);

/**
 * 정보 표시 컴포넌트
 */
export const InfoItem = ({ label, value, highlight = false }) => (
  <div style={{ marginBottom: '16px' }}>
    <div
      style={{
        display: 'flex',
        backgroundColor: '#fafafa',
        padding: '12px 16px',
        borderRadius: '6px',
      }}
    >
      <Text
        style={{
          ...FONT_STYLES.BODY.MEDIUM,
          width: '120px',
          color: '#666',
          flexShrink: 0,
        }}
      >
        {label}
      </Text>
      <Text
        strong={highlight}
        style={{
          ...FONT_STYLES.BODY.MEDIUM,
          flex: 1,
          color: highlight ? '#1890ff' : 'rgba(0, 0, 0, 0.85)',
        }}
      >
        {value || '-'}
      </Text>
    </div>
  </div>
);

/**
 * 대시보드 정보 섹션 컴포넌트
 * 각 섹션별로 정보를 표시
 */
const DashboardInfoSection = ({ title, items = [] }) => {
  return (
    <div style={{ marginBottom: '32px' }}>
      <SectionTitle>{title}</SectionTitle>
      {items.map((item, index) => (
        <InfoItem
          key={`${item.label}-${index}`}
          label={item.label}
          value={item.value}
          highlight={item.highlight}
        />
      ))}
    </div>
  );
};

export default DashboardInfoSection;

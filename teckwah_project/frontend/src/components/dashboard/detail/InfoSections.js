// src/components/dashboard/detail/InfoSections.js (개선)
import React from 'react';
import { Typography } from 'antd';
import { FONT_STYLES } from '../../../utils/Constants';

const { Text } = Typography;

/**
 * 대시보드 정보 섹션 컴포넌트
 * 제목과 항목 값을 표시하는 일관된 형식 제공
 *
 * @param {Object} props - 컴포넌트 속성
 * @param {string} props.title - 섹션 제목
 * @param {Array} props.items - 표시할 항목 배열 [{label, value, highlight}]
 */
const InfoSection = ({ title, items = [] }) => {
  return (
    <div style={{ marginBottom: 24 }}>
      <h4 style={{ ...FONT_STYLES.TITLE.SMALL, marginBottom: 16 }}>{title}</h4>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'max-content 1fr',
          gap: '8px 16px',
        }}
      >
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
              {item.label}:
            </Text>
            <Text
              strong={item.highlight}
              style={{
                ...FONT_STYLES.BODY.MEDIUM,
                ...(item.highlight ? { color: '#1890ff' } : {}),
              }}
            >
              {item.value || '-'}
            </Text>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// 간단한 컴포넌트이므로 메모이제이션 제거 (불필요한 최적화 회피)
export const DashboardInfoSection = InfoSection;

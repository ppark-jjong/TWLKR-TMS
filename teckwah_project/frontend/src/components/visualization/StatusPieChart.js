// frontend/src/components/visualization/StatusPieChart.js
import React from 'react';
import { Typography, Empty } from 'antd';
import { Pie } from '@ant-design/plots';
import { STATUS_TEXTS, FONT_STYLES } from '../../utils/Constants';
import { formatNumber } from '../../utils/Formatter';

const { Title } = Typography;

const StatusPieChart = ({ data }) => {
  if (!data || !data.status_breakdown || data.status_breakdown.length === 0) {
    return <Empty description={<span style={FONT_STYLES.BODY.MEDIUM}>데이터가 없습니다</span>} />;
  }

  const config = {
    data: data.status_breakdown,
    angleField: 'count',
    colorField: 'status',
    radius: 0.8,
    innerRadius: 0.5,  // 도넛 차트 스타일
    label: {
      type: 'outer',
      content: ({ name, percent }) => `${STATUS_TEXTS[name]}\n${(percent * 100).toFixed(1)}%`,
      style: {
        ...FONT_STYLES.BODY.MEDIUM,
        textAlign: 'center',
        fill: '#666'
      }
    },
    legend: {
      layout: 'horizontal',
      position: 'bottom',
      itemName: {
        formatter: (text) => STATUS_TEXTS[text] || text,
        style: FONT_STYLES.BODY.MEDIUM
      }
    },
    color: [
      '#1890FF',  // 대기
      '#FFB31A',  // 진행
      '#52C41A',  // 완료
      '#FF4D4F',  // 이슈
      '#D9D9D9'   // 취소
    ],
    statistic: {
      title: {
        content: '전체',
        style: {
          ...FONT_STYLES.TITLE.SMALL,
          color: '#666'
        }
      },
      content: {
        formatter: () => `${formatNumber(data.total_count)}건`,
        style: {
          ...FONT_STYLES.TITLE.MEDIUM,
          color: '#1890ff'
        }
      }
    },
    interactions: [
      { type: 'element-active' },
      { type: 'pie-statistic-active' }
    ],
    state: {
      active: {
        style: {
          lineWidth: 2,
          stroke: '#fff',
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.1)'
        }
      }
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 350px)', display: 'flex', flexDirection: 'column' }}>
      <Title level={4} style={{ 
        ...FONT_STYLES.TITLE.MEDIUM, 
        textAlign: 'center', 
        margin: '0 0 24px',
        color: '#333' 
      }}>
        배송 현황
      </Title>
      <div style={{ flex: 1, minHeight: '400px' }}>
        <Pie {...config} />
      </div>
    </div>
  );
};

export default StatusPieChart;
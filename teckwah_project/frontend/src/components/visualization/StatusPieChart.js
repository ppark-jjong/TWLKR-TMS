// frontend/src/components/visualization/StatusPieChart.js
import React from 'react';
import { Typography, Empty } from 'antd';
import { Pie } from '@ant-design/plots';
import { STATUS_TEXTS, STATUS_COLORS } from '../../utils/Constants';
import { formatNumber } from '../../utils/Formatter';

const { Title } = Typography;

const StatusPieChart = ({ data }) => {
  if (!data || !data.status_breakdown || data.status_breakdown.length === 0) {
    return <Empty description="데이터가 없습니다" />;
  }

  const config = {
    data: data.status_breakdown,
    angleField: 'count',
    colorField: 'status',
    radius: 0.8,
    innerRadius: 0.5,  // 도넛 차트 스타일로 변경
    label: {
      type: 'outer',
      content: ({ name, percent }) => `${STATUS_TEXTS[name]}\n${(percent * 100).toFixed(1)}%`,
      style: {
        fontSize: 14,
        fontWeight: 500,
        textAlign: 'center',
        fill: '#666'  // 라벨 색상을 좀 더 밝게
      }
    },
    legend: {
      layout: 'horizontal',
      position: 'bottom',
      itemName: {
        formatter: (text) => STATUS_TEXTS[text] || text,
        style: {
          fontSize: 14,
          fill: '#666'
        }
      }
    },
    // 색상 팔레트 수정 - 더 밝은 색상으로
    color: [
      '#1890FF',  // 대기
      '#FFB31A',  // 진행
      '#52C41A',  // 완료
      '#FF4D4F'   // 이슈
    ],
    statistic: {
      title: {
        content: '전체',
        style: {
          fontSize: '16px',
          fontWeight: 500,
          color: '#666'
        }
      },
      content: {
        formatter: () => `${formatNumber(data.total_count)}건`,
        style: {
          fontSize: '24px',
          fontWeight: 600,
          color: '#1890ff'
        }
      }
    },
    // 호버 효과 개선
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Title level={4} style={{ textAlign: 'center', margin: '0 0 24px', color: '#333' }}>
        배송 현황
      </Title>
      <div style={{ flex: 1, minHeight: '400px' }}>
        <Pie {...config} />
      </div>
    </div>
  );
};

export default StatusPieChart;
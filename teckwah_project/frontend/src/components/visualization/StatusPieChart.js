// frontend/src/components/visualization/StatusPieChart.js
import React from 'react';
import { Card, Typography, Empty } from 'antd';
import { Pie } from '@ant-design/plots';
import { STATUS_TEXTS } from '../../utils/Constants';
import { formatNumber } from '../../utils/Formatter';

const { Title, Text } = Typography;

/**
 * 배송 상태별 원형 차트 컴포넌트
 * @param {Object} props
 * @param {Object} props.data - 시각화 데이터
 */
const StatusPieChart = ({ data }) => {
  // 데이터가 없는 경우 처리
  if (!data || !data.status_breakdown || data.status_breakdown.length === 0) {
    return (
      <Card>
        <Empty description="데이터가 없습니다" />
      </Card>
    );
  }

  // 상태별 색상 매핑
  const statusColors = {
    '대기': '#bfbfbf',
    '진행': '#faad14',
    '완료': '#52c41a',
    '이슈': '#f5222d'
  };

  // 차트 설정
  const config = {
    data: data.status_breakdown,
    angleField: 'count',
    colorField: 'status',
    radius: 0.8,
    color: (datum) => statusColors[datum.status],
    label: {
      type: 'outer',
      content: '{name}\n{percentage}%',
      style: {
        fontSize: 14,
        textAlign: 'center',
      },
    },
    legend: {
      position: 'bottom',
      itemName: {
        style: {
          fontSize: 14,
        },
      },
    },
    tooltip: {
      formatter: (datum) => ({
        name: datum.status,
        value: `${formatNumber(datum.count)}건 (${datum.percentage}%)`
      }),
    },
    interactions: [
      { type: 'element-active' },
    ],
    statistic: {
      title: {
        style: {
          fontSize: '16px',
          lineHeight: '16px',
        },
        formatter: () => '총 건수',
      },
      content: {
        style: {
          fontSize: '24px',
          lineHeight: '24px',
        },
        formatter: () => formatNumber(data.total_count),
      },
    },
  };

  return (
    <div>
      <Title level={4} style={{ textAlign: 'center', marginBottom: 16 }}>
        배송 현황
      </Title>
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
        {`${formatNumber(data.total_count)}건`}
      </Text>
      <div style={{ height: 400 }}>
        <Pie {...config} />
      </div>
    </div>
  );
};

export default StatusPieChart;
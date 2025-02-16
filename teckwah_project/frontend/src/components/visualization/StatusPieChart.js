// frontend/src/components/visualization/StatusPieChart.js
import React from 'react';
import { Typography, Empty } from 'antd';
import { Pie } from '@ant-design/plots';
import { STATUS_TEXTS } from '../../utils/Constants';
import { formatNumber } from '../../utils/Formatter';

const { Title, Text } = Typography;

const StatusPieChart = ({ data }) => {
  if (!data || !data.status_breakdown || data.status_breakdown.length === 0) {
    return <Empty description="데이터가 없습니다" />;
  }

  const config = {
    data: data.status_breakdown,
    angleField: 'count',
    colorField: 'status',
    radius: 0.8,
    label: {
      type: 'outer',
      content: ({ name, percent }) => `${STATUS_TEXTS[name]}\n${(percent * 100).toFixed(2)}%`
    },
    legend: {
      layout: 'horizontal',
      position: 'bottom',
      itemName: {
        formatter: (text) => STATUS_TEXTS[text] || text
      }
    },
    interactions: [{ type: 'element-active' }],
    tooltip: {
      formatter: (datum) => ({
        name: STATUS_TEXTS[datum.status],
        value: `${formatNumber(datum.count)}건 (${datum.percentage.toFixed(2)}%)`
      })
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <Title level={4} style={{ marginBottom: 16 }}>
        배송 현황
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {`총 ${formatNumber(data.total_count)}건`}
      </Text>
      <div style={{ height: 400 }}>
        <Pie {...config} />
      </div>
    </div>
  );
};

export default StatusPieChart;
// frontend/src/components/visualization/StatusPieChart.js
import React from 'react';
import { Card, Typography, Empty } from 'antd';
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
      content: '{name}\n{percentage}%'
    },
    legend: {
      layout: 'horizontal',
      position: 'bottom'
    },
    interactions: [{ type: 'element-active' }],
    tooltip: {
      formatter: (datum) => ({
        name: STATUS_TEXTS[datum.status],
        value: `${formatNumber(datum.count)}건 (${datum.percentage}%)`
      })
    }
  };

  return (
    <div>
      <Title level={4} style={{ textAlign: 'center', marginBottom: 16 }}>
        배송 현황
      </Title>
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
        {`총 ${formatNumber(data.total_count)}건`}
      </Text>
      <div style={{ height: 400 }}>
        <Pie {...config} />
      </div>
    </div>
  );
};

export default StatusPieChart;
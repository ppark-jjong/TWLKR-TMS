// frontend/src/components/visualization/HourlyBarChart.js
import React from 'react';
import { Typography, Empty } from 'antd';
import { Column } from '@ant-design/plots';
import { formatNumber } from '../../utils/Formatter';

const { Title, Text } = Typography;

const HourlyBarChart = ({ data }) => {
  if (!data?.hourly_breakdown?.length) {
    return <Empty description="데이터가 없습니다" />;
  }

  // 0-23시간대 데이터 초기화
  const chartData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    count: 0
  }));

  // 실제 데이터로 업데이트
  data.hourly_breakdown.forEach(item => {
    const idx = parseInt(item.hour);
    if (idx >= 0 && idx < 24) {
      chartData[idx].count = item.count;
    }
  });

  const config = {
    data: chartData,
    xField: 'hour',
    yField: 'count',
    color: '#1890ff',
    label: {
      position: 'top',
      style: {
        fill: 'rgba(0,0,0,0.65)',
        fontSize: 12
      },
      formatter: (v) => formatNumber(v.count)
    },
    xAxis: {
      label: {
        autoRotate: false,
        style: {
          fontSize: 12
        }
      }
    },
    yAxis: {
      label: {
        formatter: value => formatNumber(value),
        style: {
          fontSize: 12
        }
      }
    },
    tooltip: {
      formatter: (datum) => ({
        name: '접수량',
        value: `${formatNumber(datum.count)}건`
      })
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <Title level={4} style={{ marginBottom: 16 }}>
        시간대별 접수량
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {`총 ${formatNumber(data.total_count)}건`}
      </Text>
      <div style={{ height: 400 }}>
        <Column {...config} />
      </div>
    </div>
  );
};

export default HourlyBarChart;
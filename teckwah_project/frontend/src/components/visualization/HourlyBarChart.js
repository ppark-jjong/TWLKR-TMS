// frontend/src/components/visualization/HourlyBarChart.js
import React from 'react';
import { Card, Typography, Empty } from 'antd';
import { Column } from '@ant-design/plots';
import { formatNumber } from '../../utils/Formatter';

const { Title, Text } = Typography;

/**
 * 시간대별 접수량 막대 차트 컴포넌트
 * @param {Object} props
 * @param {Object} props.data - 시각화 데이터
 */
const HourlyBarChart = ({ data }) => {
  // 데이터가 없는 경우 처리
  if (!data || !data.hourly_breakdown || data.hourly_breakdown.length === 0) {
    return (
      <Card>
        <Empty description="데이터가 없습니다" />
      </Card>
    );
  }

  // 시간대별 데이터 가공
  const chartData = data.hourly_breakdown.map(item => ({
    ...item,
    hour: `${String(item.hour).padStart(2, '0')}:00`,
  }));

  // 차트 설정
  const config = {
    data: chartData,
    xField: 'hour',
    yField: 'count',
    seriesField: undefined,
    color: '#1890ff',
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    label: {
      position: 'top',
      formatter: (v) => formatNumber(v.count),
      style: {
        fill: 'rgba(0,0,0,0.65)',
        fontSize: 12,
      },
    },
    xAxis: {
      label: {
        autoRotate: false,
        formatter: (v) => v,
      },
    },
    yAxis: {
      label: {
        formatter: (v) => formatNumber(v),
      },
    },
    tooltip: {
      formatter: (datum) => ({
        name: '접수량',
        value: `${formatNumber(datum.count)}건`
      }),
    },
    interactions: [
      { type: 'element-active' },
    ],
  };

  return (
    <div>
      <Title level={4} style={{ textAlign: 'center', marginBottom: 16 }}>
        시간대별 접수량
      </Title>
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
        {`총 ${formatNumber(data.total_count)}건`}
      </Text>
      <div style={{ height: 400 }}>
        <Column {...config} />
      </div>
    </div>
  );
};

export default HourlyBarChart;
// frontend/src/components/visualization/HourlyBarChart.js
import React from 'react';
import { Typography, Empty } from 'antd';
import { Column } from '@ant-design/plots';
import { formatNumber } from '../../utils/Formatter';

const { Title } = Typography;

const HourlyBarChart = ({ data }) => {
  if (!data?.hourly_breakdown?.length) {
    return <Empty description="데이터가 없습니다" />;
  }

  // 0-23시간대 데이터 초기화
  const chartData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    count: 0,
    orderCount: 0
  }));

  // 실제 데이터로 업데이트
  data.hourly_breakdown.forEach(item => {
    const idx = parseInt(item.hour);
    if (idx >= 0 && idx < 24) {
      chartData[idx].count = item.count;
      chartData[idx].orderCount = item.count;
    }
  });

  const config = {
    data: chartData,
    xField: 'hour',
    yField: 'count',
    seriesField: 'type',
    color: ['#1890FF', '#BAE7FF'],  // 더 밝은 색상으로 변경
    columnStyle: {
      radius: [4, 4, 0, 0],
      shadowColor: 'rgba(0,0,0,0.05)',
      shadowBlur: 4
    },
    label: {
      position: 'top',
      style: {
        fill: '#666',
        fontSize: 12
      },
      formatter: (v) => formatNumber(v.count)
    },
    xAxis: {
      label: {
        autoRotate: false,
        style: {
          fill: '#666',
          fontSize: 12
        }
      }
    },
    yAxis: {
      label: {
        formatter: value => formatNumber(value),
        style: {
          fill: '#666',
          fontSize: 12
        }
      }
    },
    tooltip: {
      formatter: (datum) => ({
        name: '접수량',
        value: `${formatNumber(datum.count)}건`
      })
    },
    meta: {
      hour: { alias: '시간' },
      count: { alias: '접수량' }
    },
    annotations: [
      {
        type: 'line',
        start: ['min', data.average_count],
        end: ['max', data.average_count],
        style: {
          stroke: '#ff4d4f',
          lineDash: [4, 4],
          opacity: 0.5
        }
      },
      {
        type: 'text',
        position: ['max', data.average_count],
        content: `평균: ${formatNumber(data.average_count)}건`,
        offsetX: -20,
        offsetY: -6,
        style: {
          fill: '#ff4d4f',
          fontSize: 12,
          fontWeight: 500
        }
      }
    ]
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 8, color: '#333' }}>
          시간별 접수량
        </Title>
        <div style={{ fontSize: 14, color: '#666' }}>
          <div>총 접수량: {formatNumber(data.total_count)}건</div>
          <div>피크 타임: {chartData.reduce((acc, curr) => 
            curr.count > acc.count ? curr : acc
          ).hour} ({formatNumber(Math.max(...chartData.map(d => d.count)))}건)</div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: '400px' }}>
        <Column {...config} />
      </div>
    </div>
  );
};

export default HourlyBarChart;
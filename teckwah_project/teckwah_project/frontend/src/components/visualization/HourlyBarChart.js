// HourlyBarChart.js
import React from 'react';
import { Typography, Empty, Card, Row, Col, Statistic } from 'antd';
import { Column } from '@ant-design/plots';
import { ClockCircleOutlined } from '@ant-design/icons';
import { FONT_STYLES } from '../../utils/Constants';
import { formatNumber } from '../../utils/Formatter';

const { Title, Text } = Typography;

// 부서별 색상 및 스타일 정의
const DEPARTMENT_THEMES = {
  'CS': {
    title: 'CS 부서',
    color: '#1890FF',
    backgroundColor: '#E6F7FF',
    borderColor: '#91D5FF'
  },
  'HES': {
    title: 'HES 부서',
    color: '#722ED1',
    backgroundColor: '#F9F0FF',
    borderColor: '#B37FEB'
  },
  'LENOVO': {
    title: 'LENOVO 부서',
    color: '#13C2C2',
    backgroundColor: '#E6FFFB',
    borderColor: '#87E8DE'
  }
};

const TIME_PERIODS = {
  NIGHT: { label: '야간(22-08)', color: '#722ED1' },
  DAY: { label: '주간(08-22)', color: '#1890FF' }
};

const HourlyBarChart = ({ data }) => {
  if (!data?.department_breakdown) {
    return <Empty description={<span style={FONT_STYLES.BODY.MEDIUM}>데이터가 없습니다</span>} />;
  }

  // 차트 데이터 가공
  const chartData = Object.entries(data.department_breakdown).flatMap(([dept, deptData]) => 
    Object.entries(deptData.hourly_counts).map(([timeSlot, count]) => ({
      timeSlot,
      department: DEPARTMENT_THEMES[dept].title,
      count,
      color: DEPARTMENT_THEMES[dept].color,
      period: timeSlot === '야간(22-08)' ? TIME_PERIODS.NIGHT.label : TIME_PERIODS.DAY.label
    }))
  );

  // 부서별 통계 계산
  const departmentStats = Object.entries(data.department_breakdown).map(([dept, deptData]) => {
    const nightCount = deptData.hourly_counts['야간(22-08)'] || 0;
    const dayCount = Object.entries(deptData.hourly_counts)
      .filter(([slot]) => slot !== '야간(22-08)')
      .reduce((sum, [_, count]) => sum + count, 0);

    const totalCount = nightCount + dayCount;
    const avgPerHour = totalCount > 0 ? Math.round((totalCount / 24) * 10) / 10 : 0;

    return {
      department: dept,
      title: DEPARTMENT_THEMES[dept].title,
      totalCount,
      nightCount,
      dayCount,
      avgPerHour,
      ...DEPARTMENT_THEMES[dept]
    };
  });

  const config = {
    data: chartData,
    isGroup: true,
    xField: 'timeSlot',
    yField: 'count',
    seriesField: 'department',
    groupField: 'period',
    color: Object.values(DEPARTMENT_THEMES).map(theme => theme.color),
    columnStyle: {
      radius: [4, 4, 0, 0]
    },
    label: {
      position: 'top',
      style: {
        ...FONT_STYLES.BODY.SMALL,
        fill: '#666'
      },
      formatter: (v) => v.count > 0 ? formatNumber(v.count) : ''
    },
    xAxis: {
      label: {
        style: {
          ...FONT_STYLES.BODY.SMALL,
          fill: '#666'
        }
      }
    },
    yAxis: {
      label: {
        formatter: value => formatNumber(value),
        style: {
          ...FONT_STYLES.BODY.SMALL,
          fill: '#666'
        }
      }
    },
    legend: {
      position: 'top',
      itemName: {
        style: {
          ...FONT_STYLES.BODY.MEDIUM
        }
      }
    },
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 1000
      }
    },
    minColumnWidth: 20,
    maxColumnWidth: 40,
    columnBackground: {
      style: {
        fill: '#f0f0f0'
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <Title level={4} style={{ 
          ...FONT_STYLES.TITLE.MEDIUM, 
          margin: '0 0 16px' 
        }}>
          시간대별 접수량
        </Title>
        
        <Row gutter={16} justify="center">
          <Col>
            <Card size="small">
              <Statistic
                title="전체 접수 건수"
                value={formatNumber(data.total_count)}
                suffix="건"
                valueStyle={{ color: '#1890FF' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]}>
        {departmentStats.map(stat => (
          <Col span={8} key={stat.department}>
            <Card
              size="small"
              style={{
                backgroundColor: stat.backgroundColor,
                borderColor: stat.borderColor
              }}
            >
              <Row gutter={16} align="middle">
                <Col span={12}>
                  <Statistic
                    title={
                      <Text strong style={{ ...FONT_STYLES.BODY.MEDIUM, color: stat.color }}>
                        {stat.title}
                      </Text>
                    }
                    value={stat.totalCount}
                    suffix="건"
                    valueStyle={{ color: stat.color }}
                  />
                </Col>
                <Col span={12}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Text type="secondary" style={FONT_STYLES.BODY.SMALL}>
                      주간: {formatNumber(stat.dayCount)}건
                    </Text>
                    <Text type="secondary" style={FONT_STYLES.BODY.SMALL}>
                      야간: {formatNumber(stat.nightCount)}건
                    </Text>
                    <Text type="secondary" style={FONT_STYLES.BODY.SMALL}>
                      <ClockCircleOutlined /> 시간당 평균: {formatNumber(stat.avgPerHour)}건
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        bordered={false}
        style={{
          borderRadius: '12px',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ height: 400 }}>
          <Column {...config} />
        </div>
      </Card>
    </div>
  );
};

export default HourlyBarChart;
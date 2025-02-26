// frontend/src/components/visualization/HourlyBarChart.js (수정)

import React from 'react';
import { Typography, Empty, Card, Row, Col, Statistic } from 'antd';
import { Column } from '@ant-design/plots';
import { ClockCircleOutlined } from '@ant-design/icons';
import { FONT_STYLES, VISUALIZATION_COLORS } from '../../utils/Constants';
import { formatNumber } from '../../utils/Formatter';

const { Title, Text } = Typography;

const HourlyBarChart = ({ data }) => {
  if (!data?.department_breakdown) {
    return (
      <Empty
        description={
          <span style={FONT_STYLES.BODY.MEDIUM}>데이터가 없습니다</span>
        }
      />
    );
  }

  // 차트 데이터 가공
  const chartData = Object.entries(data.department_breakdown).flatMap(
    ([dept, deptData]) =>
      Object.entries(deptData.hourly_counts).map(([timeSlot, count]) => ({
        timeSlot,
        department: VISUALIZATION_COLORS.DEPARTMENT[dept]
          ? VISUALIZATION_COLORS.DEPARTMENT[dept].primary
          : '#1890FF',
        departmentName: `${dept} 부서`,
        count,
        period:
          timeSlot === '야간(22-08)'
            ? VISUALIZATION_COLORS.TIME_PERIODS.NIGHT.label
            : VISUALIZATION_COLORS.TIME_PERIODS.DAY.label,
      }))
  );

  // 부서별 통계 계산
  const departmentStats = Object.entries(data.department_breakdown).map(
    ([dept, deptData]) => {
      const nightCount = deptData.hourly_counts['야간(22-08)'] || 0;
      const dayCount = Object.entries(deptData.hourly_counts)
        .filter(([slot]) => slot !== '야간(22-08)')
        .reduce((sum, [_, count]) => sum + count, 0);

      const totalCount = nightCount + dayCount;
      const avgPerHour =
        totalCount > 0 ? Math.round((totalCount / 24) * 10) / 10 : 0;

      return {
        department: dept,
        title: `${dept} 부서`,
        totalCount,
        nightCount,
        dayCount,
        avgPerHour,
        ...VISUALIZATION_COLORS.DEPARTMENT[dept],
      };
    }
  );

  const config = {
    data: chartData,
    isGroup: true,
    xField: 'timeSlot',
    yField: 'count',
    seriesField: 'departmentName',
    groupField: 'period',
    color: (datum) => {
      // 부서별 색상 적용
      for (const [dept, theme] of Object.entries(
        VISUALIZATION_COLORS.DEPARTMENT
      )) {
        if (datum.departmentName === `${dept} 부서`) {
          return theme.primary;
        }
      }
      return '#1890FF'; // 기본 색상
    },
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    label: {
      position: 'top',
      style: {
        ...FONT_STYLES.BODY.SMALL,
        fill: '#666',
      },
      formatter: (v) => (v.count > 0 ? formatNumber(v.count) : ''),
    },
    xAxis: {
      label: {
        style: {
          ...FONT_STYLES.BODY.SMALL,
          fill: '#666',
        },
      },
    },
    yAxis: {
      label: {
        formatter: (value) => formatNumber(value),
        style: {
          ...FONT_STYLES.BODY.SMALL,
          fill: '#666',
        },
      },
    },
    legend: {
      position: 'top',
      itemName: {
        style: {
          ...FONT_STYLES.BODY.MEDIUM,
        },
      },
    },
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 1000,
      },
    },
    minColumnWidth: 20,
    maxColumnWidth: 40,
    columnBackground: {
      style: {
        fill: '#f0f0f0',
      },
    },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <Title
          level={4}
          style={{
            ...FONT_STYLES.TITLE.MEDIUM,
            margin: '0 0 16px',
          }}
        >
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
        {departmentStats.map((stat) => (
          <Col span={8} key={stat.department}>
            <Card
              size="small"
              style={{
                backgroundColor: stat.background,
                borderColor: stat.border,
              }}
            >
              <Row gutter={16} align="middle">
                <Col span={12}>
                  <Statistic
                    title={
                      <Text
                        strong
                        style={{
                          ...FONT_STYLES.BODY.MEDIUM,
                          color: stat.primary,
                        }}
                      >
                        {stat.title}
                      </Text>
                    }
                    value={stat.totalCount}
                    suffix="건"
                    valueStyle={{ color: stat.primary }}
                  />
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <Text type="secondary" style={FONT_STYLES.BODY.SMALL}>
                      주간: {formatNumber(stat.dayCount)}건
                    </Text>
                    <Text type="secondary" style={FONT_STYLES.BODY.SMALL}>
                      야간: {formatNumber(stat.nightCount)}건
                    </Text>
                    <Text type="secondary" style={FONT_STYLES.BODY.SMALL}>
                      <ClockCircleOutlined /> 시간당 평균:{' '}
                      {formatNumber(stat.avgPerHour)}건
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
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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

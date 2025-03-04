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
        department: dept, // 원본 부서명 저장
        departmentName: `${dept} 부서`,
        count,
        isNight: timeSlot === '야간(19-09)', // 야간 여부 추가
      }))
  );

  // 데이터 정렬 (야간을 마지막에 오도록)
  const sortedChartData = [...chartData].sort((a, b) => {
    if (a.isNight && !b.isNight) return 1;
    if (!a.isNight && b.isNight) return -1;
    return a.timeSlot.localeCompare(b.timeSlot);
  });

  // 부서별 통계 계산
  const departmentStats = Object.entries(data.department_breakdown).map(
    ([dept, deptData]) => {
      const nightCount = deptData.hourly_counts['야간(19-09)'] || 0;
      const dayCount = Object.entries(deptData.hourly_counts)
        .filter(([slot]) => slot !== '야간(19-09)')
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
    data: sortedChartData,
    isGroup: true,
    xField: 'timeSlot',
    yField: 'count',
    seriesField: 'departmentName', // 범례 필드는 departmentName 사용
    // 색상 지정 (부서별 색상 적용)
    color: ({ department }) => {
      if (VISUALIZATION_COLORS.DEPARTMENT[department]) {
        return VISUALIZATION_COLORS.DEPARTMENT[department].primary;
      }
      return '#1890FF'; // 기본 색상
    },
    columnStyle: ({ isNight }) => ({
      radius: [4, 4, 0, 0],
      // 야간 데이터에 특별한 스타일 적용
      fillOpacity: isNight ? 0.8 : 1,
      // 야간 데이터에 패턴 스타일 적용 (선택적)
      // pattern: isNight ? { type: 'line', cfg: { stroke: '#fff', lineWidth: 1 } } : null,
    }),
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
        formatter: (value) => {
          // 야간은 강조 표시
          if (value === '야간(19-09)') {
            return {
              content: value,
              style: {
                fill: VISUALIZATION_COLORS.TIME_PERIODS.NIGHT.color,
                fontWeight: 'bold',
              },
            };
          }
          return value;
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
    minColumnWidth: 15, // 컬럼 너비 조정 (좀 더 좁게)
    maxColumnWidth: 35,
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
                      주간(09-19): {formatNumber(stat.dayCount)}건
                    </Text>
                    <Text type="secondary" style={FONT_STYLES.BODY.SMALL}>
                      야간(19-09): {formatNumber(stat.nightCount)}건
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

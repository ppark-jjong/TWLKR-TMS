// frontend/src/components/visualization/HourlyBarChart.js

import React, { useEffect, useState } from 'react';
import { Typography, Empty, Card, Row, Col, Statistic } from 'antd';
import { Column } from '@ant-design/plots';
import { ClockCircleOutlined } from '@ant-design/icons';
import { FONT_STYLES, VISUALIZATION_COLORS } from '../../utils/Constants';
import { formatNumber } from '../../utils/Formatter';

const { Title, Text } = Typography;

const HourlyBarChart = ({ data }) => {
  const [chartData, setChartData] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      setLoading(true);
      setError(null);

      // 데이터 검증 및 가공 로직
      if (!data || !data.department_breakdown) {
        console.warn('데이터 형식 오류:', data);
        setError('데이터 형식이 올바르지 않습니다');
        setLoading(false);
        return;
      }

      // 데이터 구조 보존 로깅
      console.log('데이터 구조:', {
        type: data.type,
        total_count: data.total_count,
        departments: Object.keys(data.department_breakdown),
        time_slots: data.time_slots,
      });

      // 시간대 슬롯 정보 가져오기 (주간 + 야간)
      const slots = data.time_slots || [];
      setTimeSlots(slots);

      // 차트 데이터 가공
      const processedChartData = [];
      const stats = [];

      Object.entries(data.department_breakdown).forEach(([dept, deptData]) => {
        // 부서별 통계 계산
        let nightCount = 0;
        let dayCount = 0;
        let deptTotal = 0;

        if (deptData && deptData.hourly_counts) {
          Object.entries(deptData.hourly_counts).forEach(([slot, count]) => {
            // 시간대별 차트 데이터 추가
            processedChartData.push({
              timeSlot: slot,
              department: dept,
              departmentName: `${dept} 부서`,
              count: count || 0,
              isNight: slot === '야간(19-09)', // 야간 여부 추가
            });

            // 통계 계산
            if (slot === '야간(19-09)') {
              nightCount += count || 0;
            } else {
              dayCount += count || 0;
            }
            deptTotal += count || 0;
          });
        }

        // 일평균 계산 (최소 1로 나누기)
        const avgPerHour =
          deptTotal > 0 ? Math.round((deptTotal / 24) * 10) / 10 : 0;

        // 부서별 통계 저장
        stats.push({
          department: dept,
          title: `${dept} 부서`,
          totalCount: deptTotal,
          nightCount,
          dayCount,
          avgPerHour,
          ...(VISUALIZATION_COLORS.DEPARTMENT[dept] ||
            VISUALIZATION_COLORS.DEPARTMENT.CS),
        });
      });

      // 데이터 정렬 (야간을 맨 뒤로)
      const sortedChartData = [...processedChartData].sort((a, b) => {
        if (a.isNight && !b.isNight) return 1;
        if (!a.isNight && b.isNight) return -1;
        return a.timeSlot.localeCompare(b.timeSlot);
      });

      setChartData(sortedChartData);
      setDepartmentStats(stats);
      setLoading(false);

      console.log('차트 데이터 처리 완료:', {
        chartDataCount: sortedChartData.length,
        departmentStatsCount: stats.length,
        timeSlotsCount: slots.length,
      });
    } catch (err) {
      console.error('시간대별 접수량 차트 데이터 처리 오류:', err);
      setError('데이터 처리 중 오류가 발생했습니다');
      setLoading(false);
    }
  }, [data]);

  if (error) {
    return (
      <Empty
        description={<span style={FONT_STYLES.BODY.MEDIUM}>{error}</span>}
      />
    );
  }

  if (loading || !chartData.length) {
    return (
      <Empty
        description={
          <span style={FONT_STYLES.BODY.MEDIUM}>
            {loading ? '데이터 로딩 중...' : '데이터가 없습니다'}
          </span>
        }
      />
    );
  }

  const config = {
    data: chartData,
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
                value={formatNumber(data?.total_count || 0)}
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
          {chartData.length > 0 ? (
            <Column {...config} />
          ) : (
            <Empty description="시간대별 접수량 데이터가 없습니다" />
          )}
        </div>
      </Card>
    </div>
  );
};

export default HourlyBarChart;

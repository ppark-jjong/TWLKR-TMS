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

      // 데이터 구조 보존 로깅 (디버깅용)
      console.log('HourlyBarChart 데이터 구조:', {
        type: data.type,
        totalCount: data.total_count,
        departments: Object.keys(data.department_breakdown),
        timeSlots: data.time_slots,
      });

      // 시간대 슬롯 정보 가져오기 (주간 + 야간)
      let processedTimeSlots = [];

      // 서버 응답의 time_slots 필드에 대한 방어적 처리
      if (Array.isArray(data.time_slots) && data.time_slots.length > 0) {
        // 서버에서 제공하는 형식이 다양할 수 있으므로 모든 케이스 처리
        processedTimeSlots = data.time_slots.map((slot) => {
          if (typeof slot === 'string') {
            return slot;
          } else if (typeof slot === 'object' && slot !== null && slot.label) {
            return slot.label;
          } else {
            return String(slot);
          }
        });

        // 추가 디버깅 정보
        console.log('처리된 시간대 정보:', processedTimeSlots);
      } else {
        // 시간대 정보가 없거나 형식이 예상과 다른 경우 기본값 사용
        processedTimeSlots = [
          '09-10',
          '10-11',
          '11-12',
          '12-13',
          '13-14',
          '14-15',
          '15-16',
          '16-17',
          '17-18',
          '18-19',
          '야간(19-09)',
        ];
        console.warn('시간대 정보 형식 오류, 기본값 사용:', processedTimeSlots);
      }

      setTimeSlots(processedTimeSlots);

      // 차트 데이터 가공
      const processedChartData = [];
      const stats = [];

      Object.entries(data.department_breakdown).forEach(([dept, deptData]) => {
        // 부서별 통계 계산
        let nightCount = 0;
        let dayCount = 0;
        let deptTotal = 0;

        if (deptData && deptData.hourly_counts) {
          // hourly_counts 필드의 존재 여부와 형식 검증
          let hourly_counts = deptData.hourly_counts;
          if (typeof hourly_counts !== 'object' || hourly_counts === null) {
            console.warn(
              `${dept} 부서의 hourly_counts 형식 오류:`,
              hourly_counts
            );
            hourly_counts = {}; // 기본값 설정
          }

          // 각 시간대별로 처리
          processedTimeSlots.forEach((slot) => {
            // 시간대별 데이터 가져오기 (없으면 0)
            const count = hourly_counts[slot] || 0;

            // 차트 데이터 추가
            processedChartData.push({
              timeSlot: slot,
              department: dept,
              departmentName: `${dept} 부서`,
              count: count,
              isNight: slot === '야간(19-09)', // 야간 여부 표시
            });

            // 통계 계산
            if (slot === '야간(19-09)') {
              nightCount += count;
            } else {
              dayCount += count;
            }
            deptTotal += count;
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

      console.log('HourlyBarChart 차트 데이터 처리 완료:', {
        chartDataCount: sortedChartData.length,
        departmentStatsCount: stats.length,
        timeSlotsCount: processedTimeSlots.length,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ textAlign: 'center' }}>
        <Title
          level={4}
          style={{
            ...FONT_STYLES.TITLE.MEDIUM,
            margin: '0 0 12px',
          }}
        >
          시간대별 접수량
        </Title>
      </div>

      {/* 부서별 통계 카드 - 한 줄로 최적화 */}
      <Row gutter={[12, 12]}>
        {departmentStats.map((stat) => (
          <Col span={8} key={stat.department}>
            <Card
              size="small"
              style={{
                backgroundColor: stat.background,
                borderColor: stat.border,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <Row gutter={12} align="middle">
                <Col span={12}>
                  <Statistic
                    title={
                      <Text
                        strong
                        style={{
                          ...FONT_STYLES.BODY.MEDIUM,
                          color: stat.primary,
                          fontSize: '14px',
                        }}
                      >
                        {stat.title}
                      </Text>
                    }
                    value={stat.totalCount}
                    suffix="건"
                    valueStyle={{ color: stat.primary, fontSize: '20px' }}
                  />
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <Text
                      type="secondary"
                      style={{ ...FONT_STYLES.BODY.SMALL, fontSize: '11px' }}
                    >
                      주간(09-19): {formatNumber(stat.dayCount)}건
                    </Text>
                    <Text
                      type="secondary"
                      style={{ ...FONT_STYLES.BODY.SMALL, fontSize: '11px' }}
                    >
                      야간(19-09): {formatNumber(stat.nightCount)}건
                    </Text>
                    <Text
                      type="secondary"
                      style={{ ...FONT_STYLES.BODY.SMALL, fontSize: '11px' }}
                    >
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

      {/* 차트 영역 - 높이 최적화 */}
      <Card
        bordered={false}
        style={{
          borderRadius: '12px',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ height: 320 }}>
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

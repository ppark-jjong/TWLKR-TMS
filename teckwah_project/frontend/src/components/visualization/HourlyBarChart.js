// src/components/visualization/HourlyBarChart.js - 리팩토링 버전

import React, { useEffect, useState } from 'react';
import {
  Typography,
  Empty,
  Card,
  Row,
  Col,
  Statistic,
  Alert,
  Spin,
} from 'antd';
import { Column } from '@ant-design/plots';
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { FONT_STYLES, VISUALIZATION_COLORS } from '../../utils/Constants';
import { formatNumber } from '../../utils/Formatter';
import { useLogger } from '../../utils/LogUtils';

const { Title, Text } = Typography;

/**
 * 시간대별 접수량 차트 컴포넌트 (백엔드 API 연동 최적화 버전)
 * - 백엔드 API 응답 구조에 맞게 데이터 처리 로직 개선
 * - time_slots 구조 활용한 시간대 데이터 처리
 * - 에러 처리 및 데이터 검증 강화
 * - 차트 렌더링 성능 최적화
 */
const HourlyBarChart = ({ data, dateRange }) => {
  const logger = useLogger('HourlyBarChart');

  // 상태 관리
  const [chartData, setChartData] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 백엔드 API 데이터 처리
  useEffect(() => {
    try {
      setLoading(true);
      setError(null);

      // 데이터 검증
      if (!data) {
        logger.warn('HourlyBarChart: 데이터가 없음');
        setLoading(false);
        return;
      }

      // 타입 검증
      if (data.type !== 'hourly_orders') {
        logger.warn('잘못된 차트 데이터 타입:', data.type);
        setError('잘못된 데이터 타입입니다');
        setLoading(false);
        return;
      }

      // department_breakdown 검증
      if (
        !data.department_breakdown ||
        typeof data.department_breakdown !== 'object'
      ) {
        logger.warn('부서별 시간대 데이터 오류:', data);
        setError('부서별 데이터 형식이 올바르지 않습니다');
        setLoading(false);
        return;
      }

      logger.debug('시간대별 원본 데이터:', {
        type: data.type,
        total: data.total_count,
        departments: Object.keys(data.department_breakdown),
        timeSlots: data.time_slots,
      });

      // 시간대 슬롯 정보 처리 - 백엔드 API의 time_slots 필드 활용
      let processedTimeSlots = [];

      // 백엔드 API time_slots 필드 확인 및 처리
      if (Array.isArray(data.time_slots) && data.time_slots.length > 0) {
        processedTimeSlots = data.time_slots;
      } else {
        // 백엔드 API에서 time_slots가 없거나 형식이 잘못된 경우 기본값 생성
        logger.warn('시간대 정보가 없거나 잘못됨, 기본값 사용');

        // 기본 시간대 정의 (09-19시 1시간 단위 + 야간)
        for (let h = 9; h < 19; h++) {
          processedTimeSlots.push({
            label: `${h.toString().padStart(2, '0')}-${(h + 1)
              .toString()
              .padStart(2, '0')}`,
            start: h,
            end: h + 1,
          });
        }

        // 야간 시간대 추가
        processedTimeSlots.push({
          label: '야간(19-09)',
          start: 19,
          end: 9,
        });
      }

      setTimeSlots(processedTimeSlots);

      // 차트 데이터 가공
      const processedChartData = [];
      const stats = [];

      // 부서별 데이터 처리 - 백엔드 API department_breakdown 구조 활용
      Object.entries(data.department_breakdown).forEach(([dept, deptData]) => {
        // 부서별 통계 계산을 위한 변수
        let nightCount = 0;
        let dayCount = 0;
        let deptTotal = 0;

        // hourly_counts 필드 검증 및 기본값 설정
        const hourly_counts =
          deptData && typeof deptData.hourly_counts === 'object'
            ? deptData.hourly_counts
            : {};

        // 각 시간대별로 처리 - 백엔드 API의 time_slots와 hourly_counts 연계
        processedTimeSlots.forEach((slot) => {
          // 시간대별 데이터 가져오기 (없으면 0)
          const count = hourly_counts[slot.label] || 0;

          // 차트 데이터 구성
          processedChartData.push({
            timeSlot: slot.label,
            department: dept,
            departmentName: `${dept}`,
            count: count,
            isNight:
              slot.label === '야간(19-09)' ||
              slot.start >= 19 ||
              slot.start < 9, // 야간 여부 표시
          });

          // 주간/야간 통계 계산
          if (
            slot.label === '야간(19-09)' ||
            slot.start >= 19 ||
            slot.start < 9
          ) {
            nightCount += count;
          } else {
            dayCount += count;
          }

          deptTotal += count;
        });

        // 일평균 계산 (기간 내 일수 계산, 최소 1)
        const daysInRange =
          dateRange && dateRange.length === 2
            ? Math.max(1, dateRange[1].diff(dateRange[0], 'day') + 1)
            : 1;

        const avgPerHour =
          deptTotal > 0
            ? Math.round((deptTotal / (daysInRange * 24)) * 10) / 10
            : 0;

        // 부서별 통계 저장
        const deptColors =
          VISUALIZATION_COLORS.DEPARTMENT[dept] ||
          VISUALIZATION_COLORS.DEPARTMENT.CS;

        stats.push({
          department: dept,
          title: `${dept}`,
          totalCount: deptTotal,
          nightCount,
          dayCount,
          avgPerHour,
          ...deptColors,
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

      logger.debug('차트 데이터 처리 완료:', {
        chartDataCount: sortedChartData.length,
        departmentStatsCount: stats.length,
        timeSlotsCount: processedTimeSlots.length,
      });
    } catch (err) {
      logger.error('시간대별 접수량 차트 데이터 처리 오류:', err);
      setError(
        `데이터 처리 중 오류가 발생했습니다: ${
          err.message || '알 수 없는 오류'
        }`
      );

      // 오류 시에도 기본 구조 유지
      setChartData([]);
      setDepartmentStats([]);
    } finally {
      setLoading(false);
    }
  }, [data, dateRange, logger]);

  // 로딩 상태 처리
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="데이터 로딩 중..." />
      </div>
    );
  }

  // 에러 상태 처리
  if (error) {
    return (
      <Alert
        message="차트 데이터 오류"
        description={error}
        type="error"
        showIcon
        icon={<WarningOutlined />}
      />
    );
  }

  // 데이터 없음 상태 처리
  if (!chartData.length) {
    return (
      <Empty
        description={
          <span style={FONT_STYLES.BODY.MEDIUM}>데이터가 없습니다</span>
        }
      />
    );
  }

  // 차트 설정
  const config = {
    data: chartData,
    isGroup: true,
    xField: 'timeSlot',
    yField: 'count',
    seriesField: 'departmentName',

    // 색상 설정 - 부서별 색상 적용
    color: ({ department }) => {
      if (VISUALIZATION_COLORS.DEPARTMENT[department]) {
        return VISUALIZATION_COLORS.DEPARTMENT[department].primary;
      }
      return '#1890FF'; // 기본 색상
    },

    // 컬럼 스타일 설정
    columnStyle: ({ isNight }) => ({
      radius: [4, 4, 0, 0],
      // 야간 데이터에 특별한 스타일 적용
      fillOpacity: isNight ? 0.8 : 1,
    }),

    // 레이블 설정
    label: {
      position: 'top',
      style: {
        ...FONT_STYLES.BODY.SMALL,
        fill: '#666',
      },
      formatter: (v) => (v.count > 0 ? formatNumber(v.count) : ''),
    },

    // X축 설정
    xAxis: {
      label: {
        style: {
          ...FONT_STYLES.BODY.SMALL,
          fill: '#666',
        },
        formatter: (value) => {
          // 야간은 강조 표시
          if (value === '야간(19-09)' || value.includes('야간')) {
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

    // Y축 설정
    yAxis: {
      label: {
        formatter: (value) => formatNumber(value),
        style: {
          ...FONT_STYLES.BODY.SMALL,
          fill: '#666',
        },
      },
    },

    // 범례 설정
    legend: {
      position: 'top',
      itemName: {
        style: {
          ...FONT_STYLES.BODY.MEDIUM,
        },
      },
    },

    // 애니메이션 설정
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 1000,
      },
    },

    // 컬럼 크기 및 배경 설정
    minColumnWidth: 15,
    maxColumnWidth: 35,
    columnBackground: {
      style: {
        fill: '#f0f0f0',
      },
    },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 타이틀 영역 */}
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
        {dateRange && dateRange.length === 2 && (
          <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
            {dateRange[0].format('YYYY-MM-DD')} ~{' '}
            {dateRange[1].format('YYYY-MM-DD')}
          </Text>
        )}
      </div>

      {/* 부서별 통계 카드 */}
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

      {/* 차트 영역 */}
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

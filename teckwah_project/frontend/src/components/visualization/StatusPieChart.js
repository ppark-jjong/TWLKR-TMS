// src/components/visualization/StatusPieChart.js - 리팩토링 버전

import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Empty,
  Spin,
  Alert,
} from 'antd';
import { Pie } from '@ant-design/plots';
import {
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  STATUS_TEXTS,
  FONT_STYLES,
  VISUALIZATION_COLORS,
} from '../../utils/Constants';
import { formatNumber } from '../../utils/Formatter';
import { useLogger } from '../../utils/LogUtils';

const { Title, Text } = Typography;

/**
 * 배송 현황 파이 차트 컴포넌트 (백엔드 API 연동 최적화 버전)
 * - 백엔드 API 응답 구조에 맞게 데이터 처리 로직 개선
 * - 불필요한 데이터 변환 및 중첩 계산 제거
 * - 에러 처리 및 빈 데이터 상태 대응 강화
 * - 차트 렌더링 성능 최적화
 */
const StatusPieChart = ({ data, dateRange }) => {
  const logger = useLogger('StatusPieChart');

  // 상태 관리
  const [chartData, setChartData] = useState({
    departmentBreakdown: {},
    statusTotals: {},
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 상태별 아이콘 매핑
  const STATUS_ICONS = {
    WAITING: <ClockCircleOutlined style={{ color: '#1890FF' }} />,
    IN_PROGRESS: <SyncOutlined spin style={{ color: '#FAAD14' }} />,
    COMPLETE: <CheckCircleOutlined style={{ color: '#52C41A' }} />,
    ISSUE: <WarningOutlined style={{ color: '#F5222D' }} />,
    CANCEL: <StopOutlined style={{ color: '#D9D9D9' }} />,
  };

  // 백엔드 API 데이터 처리 (department_breakdown 구조 기반)
  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      // 데이터 검증
      if (!data) {
        logger.warn('StatusPieChart: 데이터가 없음');
        setLoading(false);
        return;
      }

      // 타입 검증
      if (data.type !== 'delivery_status') {
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
        logger.warn('부서별 데이터 형식 오류:', data);
        setError('부서별 데이터 형식이 올바르지 않습니다');
        setLoading(false);
        return;
      }

      logger.debug('차트 데이터 처리 시작:', {
        type: data.type,
        total: data.total_count,
        departments: Object.keys(data.department_breakdown),
      });

      // 백엔드 API 응답에서 직접 전체 건수 추출
      const totalCount = data.total_count || 0;

      // 상태별 전체 건수 초기화
      const statusTotals = {
        WAITING: 0,
        IN_PROGRESS: 0,
        COMPLETE: 0,
        ISSUE: 0,
        CANCEL: 0,
      };

      // 부서별 데이터 변환 - 백엔드 API status_breakdown 구조 유지
      const departmentBreakdown = {};

      Object.entries(data.department_breakdown).forEach(([dept, deptData]) => {
        // 부서 데이터 검증
        if (!deptData || !deptData.status_breakdown) {
          logger.warn(`${dept} 부서 데이터 형식 오류:`, deptData);
          departmentBreakdown[dept] = {
            total: 0,
            status_breakdown: [],
          };
          return;
        }

        // 백엔드 API에서 제공하는 status_breakdown 구조 그대로 사용
        const deptTotal = deptData.total || 0;

        // 상태별 전체 합계 누적
        if (Array.isArray(deptData.status_breakdown)) {
          deptData.status_breakdown.forEach((item) => {
            if (item && item.status && item.count) {
              statusTotals[item.status] =
                (statusTotals[item.status] || 0) + item.count;
            }
          });
        }

        // 부서별 데이터 저장 - 백엔드 API 구조 유지
        departmentBreakdown[dept] = {
          total: deptTotal,
          status_breakdown: Array.isArray(deptData.status_breakdown)
            ? deptData.status_breakdown
            : [],
        };
      });

      // 처리된 데이터 저장
      setChartData({
        departmentBreakdown,
        statusTotals,
        total: totalCount,
      });

      logger.debug('차트 데이터 처리 완료', {
        departments: Object.keys(departmentBreakdown),
        total: totalCount,
      });
    } catch (err) {
      logger.error('차트 데이터 처리 오류:', err);
      setError('데이터 처리 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [data, logger]);

  // 파이 차트 설정 함수 - 백엔드 API의 status_breakdown 구조 활용
  const getPieConfig = (department, departmentData) => {
    try {
      // 데이터 검증
      if (!departmentData || !departmentData.status_breakdown) {
        logger.warn(
          `${department} 부서의 데이터가 올바르지 않습니다:`,
          departmentData
        );
        return null;
      }

      // 유효한 status_breakdown 필드 확인
      if (!Array.isArray(departmentData.status_breakdown)) {
        logger.warn(
          `${department} 부서의 status_breakdown이 배열이 아닙니다:`,
          departmentData.status_breakdown
        );
        return null;
      }

      return {
        data: departmentData.status_breakdown,
        angleField: 'count',
        colorField: 'status',
        radius: 0.8,
        innerRadius: 0.7,
        color: (datum) => {
          if (!datum || !datum.status)
            return VISUALIZATION_COLORS.STATUS.WAITING;
          return (
            VISUALIZATION_COLORS.STATUS[datum.status] ||
            VISUALIZATION_COLORS.STATUS.WAITING
          );
        },
        label: {
          type: 'spider',
          labelHeight: 40,
          content: ({ status, percentage }) => {
            if (!status) return '';
            return `${STATUS_TEXTS[status] || status}\n${(
              percentage || 0
            ).toFixed(1)}%`;
          },
          style: {
            ...FONT_STYLES.BODY.SMALL,
            fill: '#666',
          },
        },
        legend: false,
        statistic: {
          title: {
            style: {
              ...FONT_STYLES.TITLE.SMALL,
              color: (
                VISUALIZATION_COLORS.DEPARTMENT[department] ||
                VISUALIZATION_COLORS.DEPARTMENT.CS
              ).primary,
            },
            customHtml: () => department || '',
          },
          content: {
            style: {
              ...FONT_STYLES.TITLE.MEDIUM,
              color: (
                VISUALIZATION_COLORS.DEPARTMENT[department] ||
                VISUALIZATION_COLORS.DEPARTMENT.CS
              ).primary,
            },
            customHtml: () => `${formatNumber(departmentData.total)}건`,
          },
        },
        tooltip: {
          formatter: (datum) => {
            if (!datum || !datum.status)
              return { name: '알 수 없음', value: '0건 (0.0%)' };
            return {
              name: STATUS_TEXTS[datum.status] || datum.status,
              value: `${formatNumber(datum.count || 0)}건 (${(
                datum.percentage || 0
              ).toFixed(1)}%)`,
            };
          },
        },
        animation: {
          appear: {
            animation: 'wave-in',
            duration: 1000,
          },
        },
      };
    } catch (err) {
      logger.error(`${department} 부서 차트 설정 중 오류:`, err);
      return null;
    }
  };

  // 로딩 상태 표시
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="데이터 로딩 중..." />
      </div>
    );
  }

  // 에러 상태 표시
  if (error) {
    return (
      <Alert
        message="차트 데이터 오류"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  // 데이터 없음 상태 표시
  if (chartData.total === 0) {
    return (
      <Empty
        description={
          <span style={FONT_STYLES.BODY.MEDIUM}>데이터가 없습니다</span>
        }
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 타이틀 영역 */}
      <div style={{ textAlign: 'center' }}>
        <Title
          level={4}
          style={{ ...FONT_STYLES.TITLE.MEDIUM, margin: '0 0 8px' }}
        >
          부서별 배송 현황
        </Title>
        {dateRange && dateRange.length === 2 && (
          <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
            {dateRange[0].format('YYYY-MM-DD')} ~{' '}
            {dateRange[1].format('YYYY-MM-DD')}
          </Text>
        )}
      </div>

      {/* 상태별 카드 영역 */}
      <Row gutter={[8, 8]} justify="center">
        {Object.entries(STATUS_TEXTS).map(([status, text]) => {
          const count = chartData.statusTotals[status] || 0;
          const percentage =
            chartData.total > 0
              ? ((count / chartData.total) * 100).toFixed(1)
              : 0;

          return (
            <Col span={4} key={status}>
              <Card
                size="small"
                style={{
                  backgroundColor: VISUALIZATION_COLORS.STATUS[status],
                  borderColor: VISUALIZATION_COLORS.STATUS[status],
                  textAlign: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ marginBottom: 4 }}>{STATUS_ICONS[status]}</div>
                <Statistic
                  title={
                    <Text strong style={{ fontSize: 12 }}>
                      {text}
                    </Text>
                  }
                  value={count}
                  suffix="건"
                  valueStyle={{ fontSize: 14 }}
                />
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {percentage}%
                </Text>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* 부서별 파이 차트 영역 */}
      <Row justify="space-around" gutter={[16, 16]}>
        {Object.entries(chartData.departmentBreakdown).map(
          ([dept, deptData]) => (
            <Col span={8} key={dept}>
              <Card
                bordered={false}
                style={{
                  borderRadius: '12px',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  height: '320px',
                }}
              >
                {deptData.total > 0 && getPieConfig(dept, deptData) ? (
                  <Pie {...getPieConfig(dept, deptData)} />
                ) : (
                  <div
                    style={{
                      height: '200px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Empty description={`${dept} 부서 데이터가 없습니다`} />
                  </div>
                )}

                {/* 상태별 건수 요약 표시 */}
                {deptData.total > 0 && (
                  <div
                    style={{
                      marginTop: '12px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      justifyContent: 'center',
                    }}
                  >
                    {Array.isArray(deptData.status_breakdown) &&
                      deptData.status_breakdown
                        .filter((item) => item && item.count > 0)
                        .map(({ status, count }) => {
                          if (!status) return null;
                          return (
                            <div
                              key={status}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#f5f5f5',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                              }}
                            >
                              {STATUS_ICONS[status]}
                              <span style={FONT_STYLES.BODY.SMALL}>
                                {`${formatNumber(count)}건`}
                              </span>
                            </div>
                          );
                        })}
                  </div>
                )}
              </Card>
            </Col>
          )
        )}
      </Row>
    </div>
  );
};

export default StatusPieChart;

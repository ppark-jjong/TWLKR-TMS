// frontend/src/components/visualization/StatusPieChart.js

import React, { useEffect, useState } from 'react';
import { Col, Row, Typography, Empty, Card, Statistic } from 'antd';
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

const { Title, Text } = Typography;

// 상태별 아이콘 매핑
const STATUS_ICONS = {
  WAITING: <ClockCircleOutlined style={{ color: '#1890FF' }} />,
  IN_PROGRESS: <SyncOutlined spin style={{ color: '#40A9FF' }} />,
  COMPLETE: <CheckCircleOutlined style={{ color: '#52C41A' }} />,
  ISSUE: <WarningOutlined style={{ color: '#F5222D' }} />,
  CANCEL: <StopOutlined style={{ color: '#D9D9D9' }} />,
};

// 부서 표시 텍스트
const DEPARTMENT_TEXTS = {
  CS: 'CS 부서',
  HES: 'HES 부서',
  LENOVO: 'LENOVO 부서',
};

const StatusPieCharts = ({ data }) => {
  const [processedData, setProcessedData] = useState({
    departmentBreakdown: {},
    total: 0,
    statusTotals: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      setLoading(true);
      setError(null);

      // 데이터 검증
      if (!data || !data.department_breakdown) {
        console.warn('부서별 배송 현황 데이터 오류:', data);
        setError('데이터 형식이 올바르지 않습니다');
        setLoading(false);
        return;
      }

      console.log('원본 데이터:', {
        type: data.type,
        total: data.total_count,
        departments: Object.keys(data.department_breakdown),
      });

      // 전체 상태별 건수 초기화
      const statusTotals = {
        WAITING: 0,
        IN_PROGRESS: 0,
        COMPLETE: 0,
        ISSUE: 0,
        CANCEL: 0,
      };

      // 부서별 데이터 가공
      const departmentBreakdown = {};
      let totalSum = 0;

      Object.entries(data.department_breakdown).forEach(([dept, deptData]) => {
        // 부서 데이터가 없거나 형식이 올바르지 않은 경우 건너뛰기
        if (!deptData || !deptData.status_breakdown) {
          console.warn(`${dept} 부서 데이터 형식 오류:`, deptData);
          return;
        }

        // 부서별 총건수
        const deptTotal = deptData.total || 0;
        totalSum += deptTotal;

        // 상태별 데이터 가공
        const statusBreakdown = deptData.status_breakdown.map((item) => {
          const status = item.status || 'WAITING';
          const count = item.count || 0;
          const percentage = item.percentage || 0;

          // 전체 상태별 통계 누적
          statusTotals[status] = (statusTotals[status] || 0) + count;

          return {
            status,
            count,
            percentage,
          };
        });

        // 부서별 데이터 저장
        departmentBreakdown[dept] = {
          total: deptTotal,
          status_breakdown: statusBreakdown,
        };
      });

      // 결과 저장
      setProcessedData({
        departmentBreakdown,
        total: totalSum,
        statusTotals,
      });

      console.log('가공된 데이터:', {
        total: totalSum,
        departments: Object.keys(departmentBreakdown),
        statusTotals,
      });

      setLoading(false);
    } catch (err) {
      console.error('배송 현황 데이터 처리 오류:', err);
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

  if (loading || processedData.total === 0) {
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

  // 파이 차트 설정 함수
  const getPieConfig = (department, departmentData) => ({
    data: departmentData.status_breakdown,
    angleField: 'count',
    colorField: 'status',
    radius: 0.8,
    innerRadius: 0.7,
    color: (datum) =>
      VISUALIZATION_COLORS.STATUS[datum.status] ||
      VISUALIZATION_COLORS.STATUS.WAITING,
    label: {
      type: 'spider',
      labelHeight: 40,
      content: ({ status, percentage }) =>
        `${STATUS_TEXTS[status] || status}\n${percentage.toFixed(1)}%`,
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
        customHtml: () => DEPARTMENT_TEXTS[department] || department,
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
      formatter: (datum) => ({
        name: STATUS_TEXTS[datum.status] || datum.status,
        value: `${formatNumber(datum.count)}건 (${datum.percentage.toFixed(
          1
        )}%)`,
      }),
    },
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 1000,
      },
    },
  });

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
          부서별 배송 현황
        </Title>

        <Row gutter={16} justify="center">
          <Col>
            <Card size="small">
              <Statistic
                title="전체 배송 건수"
                value={formatNumber(processedData.total)}
                suffix="건"
                valueStyle={{ color: '#1890FF' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 상태별 카드 추가 */}
      <Row gutter={[16, 16]} justify="center">
        {Object.entries(STATUS_TEXTS).map(([status, text]) => {
          // 해당 상태 건수
          const count = processedData.statusTotals[status] || 0;

          // 전체 건수 대비 비율
          const percentage =
            processedData.total > 0
              ? ((count / processedData.total) * 100).toFixed(1)
              : 0;

          return (
            <Col span={4} key={status}>
              <Card
                size="small"
                style={{
                  backgroundColor: VISUALIZATION_COLORS.STATUS[status],
                  borderColor: VISUALIZATION_COLORS.STATUS[status],
                  textAlign: 'center',
                }}
              >
                <div style={{ marginBottom: 8 }}>{STATUS_ICONS[status]}</div>
                <Statistic
                  title={
                    <Text strong style={{ fontSize: 14 }}>
                      {text}
                    </Text>
                  }
                  value={count}
                  suffix="건"
                  valueStyle={{ fontSize: 16 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {percentage}%
                </Text>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row justify="space-around" gutter={[24, 24]}>
        {Object.entries(processedData.departmentBreakdown).map(
          ([dept, deptData]) => (
            <Col span={8} key={dept}>
              <Card
                bordered={false}
                style={{
                  borderRadius: '12px',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  height: '100%',
                }}
              >
                {deptData.total > 0 ? (
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

                {deptData.total > 0 && (
                  <div
                    style={{
                      marginTop: '24px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      justifyContent: 'center',
                    }}
                  >
                    {deptData.status_breakdown.map(
                      ({ status, count, percentage }) => (
                        <div
                          key={status}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#f5f5f5',
                            padding: '4px 12px',
                            borderRadius: '16px',
                          }}
                        >
                          {STATUS_ICONS[status]}
                          <span style={FONT_STYLES.BODY.SMALL}>
                            {`${STATUS_TEXTS[status] || status}: ${formatNumber(
                              count
                            )}건`}
                          </span>
                        </div>
                      )
                    )}
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

export default StatusPieCharts;

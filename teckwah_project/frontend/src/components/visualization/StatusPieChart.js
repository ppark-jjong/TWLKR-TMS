// StatusPieChart.js
import React from 'react';
import { Col, Row, Typography, Empty, Card, Statistic } from 'antd';
import { Pie } from '@ant-design/plots';
import { 
  CheckCircleOutlined, 
  SyncOutlined, 
  ClockCircleOutlined,
  WarningOutlined,
  StopOutlined 
} from '@ant-design/icons';
import { STATUS_TEXTS, FONT_STYLES } from '../../utils/Constants';
import { formatNumber } from '../../utils/Formatter';

const { Title, Text } = Typography;

// 부서별 색상 테마 정의
const DEPARTMENT_THEMES = {
  'CS': {
    primary: '#1890FF',
    colors: {
      'WAITING': '#BAE7FF',     // 연한 파랑
      'IN_PROGRESS': '#40A9FF', // 중간 파랑
      'COMPLETE': '#1890FF',    // 진한 파랑
      'ISSUE': '#F5222D',      // 빨강
      'CANCEL': '#D9D9D9'      // 회색
    }
  },
  'HES': {
    primary: '#722ED1',
    colors: {
      'WAITING': '#D3ADF7',     // 연한 보라
      'IN_PROGRESS': '#9254DE', // 중간 보라
      'COMPLETE': '#722ED1',    // 진한 보라
      'ISSUE': '#F5222D',      // 빨강
      'CANCEL': '#D9D9D9'      // 회색
    }
  },
  'LENOVO': {
    primary: '#13C2C2',
    colors: {
      'WAITING': '#87E8DE',     // 연한 청록
      'IN_PROGRESS': '#36CFC9', // 중간 청록
      'COMPLETE': '#13C2C2',    // 진한 청록
      'ISSUE': '#F5222D',      // 빨강
      'CANCEL': '#D9D9D9'      // 회색
    }
  }
};

const STATUS_ICONS = {
  'WAITING': <ClockCircleOutlined style={{ color: '#1890FF' }} />,
  'IN_PROGRESS': <SyncOutlined spin style={{ color: '#40A9FF' }} />,
  'COMPLETE': <CheckCircleOutlined style={{ color: '#52C41A' }} />,
  'ISSUE': <WarningOutlined style={{ color: '#F5222D' }} />,
  'CANCEL': <StopOutlined style={{ color: '#D9D9D9' }} />
};

const DEPARTMENT_TEXTS = {
  'CS': 'CS 부서',
  'HES': 'HES 부서',
  'LENOVO': 'LENOVO 부서'
};

const StatusPieCharts = ({ data }) => {
  if (!data?.department_breakdown) {
    return <Empty description={<span style={FONT_STYLES.BODY.MEDIUM}>데이터가 없습니다</span>} />;
  }

  const total = Object.values(data.department_breakdown)
    .reduce((sum, dept) => sum + dept.total, 0);

  const getPieConfig = (department, departmentData) => ({
    data: departmentData.status_breakdown,
    angleField: 'count',
    colorField: 'status',
    radius: 0.8,
    innerRadius: 0.7,
    color: (datum) => DEPARTMENT_THEMES[department].colors[datum.status],
    label: {
      type: 'spider',
      labelHeight: 40,
      content: ({ status, percentage }) => 
        `${STATUS_TEXTS[status]}\n${percentage.toFixed(1)}%`,
      style: {
        ...FONT_STYLES.BODY.SMALL,
        fill: '#666'
      }
    },
    legend: false,
    statistic: {
      title: {
        style: {
          ...FONT_STYLES.TITLE.SMALL,
          color: DEPARTMENT_THEMES[department].primary
        },
        customHtml: () => DEPARTMENT_TEXTS[department]
      },
      content: {
        style: {
          ...FONT_STYLES.TITLE.MEDIUM,
          color: DEPARTMENT_THEMES[department].primary
        },
        customHtml: () => `${formatNumber(departmentData.total)}건`
      }
    },
    tooltip: {
      formatter: (datum) => ({
        name: STATUS_TEXTS[datum.status],
        value: `${formatNumber(datum.count)}건 (${datum.percentage.toFixed(1)}%)`
      })
    },
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 1000
      }
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <Title level={4} style={{ 
          ...FONT_STYLES.TITLE.MEDIUM, 
          margin: '0 0 16px' 
        }}>
          부서별 배송 현황
        </Title>
        
        <Row gutter={16} justify="center">
          <Col>
            <Card size="small">
              <Statistic
                title="전체 배송 건수"
                value={formatNumber(total)}
                suffix="건"
                valueStyle={{ color: '#1890FF' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Row justify="space-around" gutter={[24, 24]}>
        {Object.entries(data.department_breakdown).map(([dept, deptData]) => (
          <Col span={8} key={dept}>
            <Card
              bordered={false}
              style={{
                borderRadius: '12px',
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: '100%'
              }}
            >
              <Pie {...getPieConfig(dept, deptData)} />
              
              <div style={{ 
                marginTop: '24px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                justifyContent: 'center'
              }}>
                {deptData.status_breakdown.map(({ status, count, percentage }) => (
                  <div
                    key={status}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#f5f5f5',
                      padding: '4px 12px',
                      borderRadius: '16px'
                    }}
                  >
                    {STATUS_ICONS[status]}
                    <span style={FONT_STYLES.BODY.SMALL}>
                      {`${STATUS_TEXTS[status]}: ${formatNumber(count)}건`}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default StatusPieCharts;

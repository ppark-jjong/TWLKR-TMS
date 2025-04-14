/**
 * 상태별 주문 요약 컴포넌트
 */
import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { 
  ClockCircleOutlined, 
  RocketOutlined, 
  CheckCircleOutlined, 
  WarningOutlined,
  CloseCircleOutlined 
} from '@ant-design/icons';

const StatusSummary = ({ statusCounts }) => {
  // 상태별 아이콘 및 색상 정의
  const statusConfig = {
    WAITING: {
      icon: <ClockCircleOutlined />,
      color: '#1890ff'
    },
    IN_PROGRESS: {
      icon: <RocketOutlined />,
      color: '#faad14'
    },
    COMPLETE: {
      icon: <CheckCircleOutlined />,
      color: '#52c41a'
    },
    ISSUE: {
      icon: <WarningOutlined />,
      color: '#f5222d'
    },
    CANCEL: {
      icon: <CloseCircleOutlined />,
      color: '#bfbfbf'
    }
  };
  
  // 상태별 라벨
  const statusLabels = {
    WAITING: '대기',
    IN_PROGRESS: '진행',
    COMPLETE: '완료',
    ISSUE: '이슈',
    CANCEL: '취소'
  };
  
  // 총 주문 수 계산
  const totalOrders = Object.values(statusCounts || {}).reduce((sum, count) => sum + count, 0);
  
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={24} md={4}>
        <Card>
          <Statistic 
            title="전체"
            value={totalOrders}
            valueStyle={{ color: '#262626' }}
          />
        </Card>
      </Col>
      
      {Object.keys(statusConfig).map(status => (
        <Col xs={12} sm={8} md={4} key={status}>
          <Card>
            <Statistic 
              title={statusLabels[status]}
              value={statusCounts?.[status] || 0}
              valueStyle={{ color: statusConfig[status].color }}
              prefix={statusConfig[status].icon}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default StatusSummary;

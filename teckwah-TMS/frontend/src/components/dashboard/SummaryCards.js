import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  DashboardOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  StopOutlined,
} from '@ant-design/icons';

/**
 * 대시보드 요약 카드 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Object} props.stats - 통계 데이터
 * @param {number} props.stats.total - 총 주문 수
 * @param {number} props.stats.waiting - 대기 중인 주문 수
 * @param {number} props.stats.inProgress - 진행 중인 주문 수
 * @param {number} props.stats.complete - 완료된 주문 수
 * @param {number} props.stats.issue - 이슈 발생 주문 수
 * @param {number} props.stats.cancel - 취소된 주문 수
 * @param {boolean} props.loading - 로딩 상태
 */
const SummaryCards = ({ stats, loading }) => {
  const {
    total = 0,
    waiting = 0,
    inProgress = 0,
    complete = 0,
    issue = 0,
    cancel = 0,
  } = stats || {};

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {/* 총 주문 수 */}
      <Col xs={24} sm={12} md={8} lg={4}>
        <Card>
          <Statistic
            title="총 주문 수"
            value={total}
            valueStyle={{ color: '#1890ff' }}
            prefix={<DashboardOutlined />}
            suffix="건"
            loading={loading}
          />
        </Card>
      </Col>
      
      {/* 대기 주문 수 */}
      <Col xs={24} sm={12} md={8} lg={4}>
        <Card>
          <Statistic
            title="대기"
            value={waiting}
            valueStyle={{ color: '#ad8b00' }}
            prefix={<ClockCircleOutlined />}
            suffix="건"
            loading={loading}
          />
        </Card>
      </Col>
      
      {/* 진행 중 주문 수 */}
      <Col xs={24} sm={12} md={8} lg={4}>
        <Card>
          <Statistic
            title="진행"
            value={inProgress}
            valueStyle={{ color: '#1890ff' }}
            prefix={<SyncOutlined spin={inProgress > 0} />}
            suffix="건"
            loading={loading}
          />
        </Card>
      </Col>
      
      {/* 완료 주문 수 */}
      <Col xs={24} sm={12} md={8} lg={4}>
        <Card>
          <Statistic
            title="완료"
            value={complete}
            valueStyle={{ color: '#52c41a' }}
            prefix={<CheckCircleOutlined />}
            suffix="건"
            loading={loading}
          />
        </Card>
      </Col>
      
      {/* 이슈 주문 수 */}
      <Col xs={24} sm={12} md={8} lg={4}>
        <Card>
          <Statistic
            title="이슈"
            value={issue}
            valueStyle={{ color: '#f5222d' }}
            prefix={<WarningOutlined />}
            suffix="건"
            loading={loading}
          />
        </Card>
      </Col>
      
      {/* 취소 주문 수 */}
      <Col xs={24} sm={12} md={8} lg={4}>
        <Card>
          <Statistic
            title="취소"
            value={cancel}
            valueStyle={{ color: '#595959' }}
            prefix={<StopOutlined />}
            suffix="건"
            loading={loading}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default SummaryCards;

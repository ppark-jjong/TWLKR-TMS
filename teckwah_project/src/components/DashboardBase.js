import React from 'react';
import { Card, Button, Space, Divider, Layout, Typography, Row, Col, Badge } from 'antd';
import { ReloadOutlined, BarChartOutlined, ClockCircleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';

// 내부 컴포넌트 임포트
import DashboardTable from './DashboardTable';
import DashboardSearch from './DashboardSearch';

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * 대시보드 기본 컴포넌트 - DashboardPage와 AdminPage의 공통 로직
 */
const DashboardBase = ({
  title,
  userRole,
  data,
  isLoading,
  searchParams,
  filterOptions,
  handleSearch,
  handlePaginationChange,
  handleDateRangeChange,
  refreshData,
  totalItems,
  dateRange,
  selectedRowKeys,
  onSelectChange,
  showStatusModal,
  showDetailModal,
  additionalActions,
  children,
}) => {
  // 상태별 건수 계산 (예: 배송 중, 완료, 대기 등)
  const getStatusCounts = () => {
    if (!data || !Array.isArray(data)) return {};
    
    return data.reduce((acc, item) => {
      const status = item.delivery_status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  };
  
  const statusCounts = getStatusCounts();
  
  // 상태 표시 색상 매핑
  const statusColors = {
    PENDING: '#faad14',    // 대기 중 - 노란색
    ASSIGNED: '#52c41a',   // 배차 완료 - 초록색
    IN_PROGRESS: '#1890ff', // 진행 중 - 파란색
    COMPLETE: '#52c41a',   // 완료 - 초록색
    ISSUE: '#f5222d',      // 이슈 - 빨간색
    CANCEL: '#d9d9d9',     // 취소 - 회색
    UNKNOWN: '#8c8c8c',    // 알 수 없음 - 회색
  };
  
  // 상태 표시 이름 매핑
  const statusNames = {
    PENDING: '대기 중',
    ASSIGNED: '배차 완료',
    IN_PROGRESS: '진행 중',
    COMPLETE: '완료',
    ISSUE: '이슈',
    CANCEL: '취소',
    UNKNOWN: '미분류',
  };
  
  // 현재 시간 포맷팅
  const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  return (
    <Content>
      {/* 요약 정보 카드 */}
      <Row gutter={[16, 16]} className="dashboard-summary">
        <Col xs={24} sm={24} md={8} lg={8}>
          <Card className="dashboard-card summary-card">
            <div className="summary-content">
              <div className="summary-icon" style={{ backgroundColor: '#e6f7ff' }}>
                <BarChartOutlined style={{ color: '#1890ff' }} />
              </div>
              <div className="summary-data">
                <Text type="secondary">총 배송 건수</Text>
                <Title level={3}>{totalItems || 0}건</Title>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="dashboard-card summary-card">
            <div className="summary-content">
              <div className="summary-icon" style={{ backgroundColor: '#fff7e6' }}>
                <ClockCircleOutlined style={{ color: '#fa8c16' }} />
              </div>
              <div className="summary-data">
                <Text type="secondary">진행 중 배송</Text>
                <Title level={3}>{statusCounts['IN_PROGRESS'] || 0}건</Title>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="dashboard-card summary-card">
            <div className="summary-content">
              <div className="summary-icon" style={{ backgroundColor: '#f6ffed' }}>
                <Badge 
                  status="success" 
                  text={<span style={{ fontSize: '18px' }}>✓</span>} 
                  style={{ color: '#52c41a' }} 
                />
              </div>
              <div className="summary-data">
                <Text type="secondary">완료된 배송</Text>
                <Title level={3}>{statusCounts['COMPLETE'] || 0}건</Title>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      
      {/* 메인 대시보드 카드 */}
      <Card
        className="dashboard-main-card"
        title={
          <div className="dashboard-card-title">
            <Title level={4}>{title || (userRole === 'ADMIN' ? '관리자 대시보드' : '배송 대시보드')}</Title>
            <Text type="secondary" className="dashboard-update-time">
              <ClockCircleOutlined /> 마지막 업데이트: {currentTime}
            </Text>
          </div>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={refreshData}
              loading={isLoading}
            >
              새로고침
            </Button>
            {additionalActions}
          </Space>
        }
      >
        {/* 상태별 요약 정보 */}
        <div className="status-summary">
          <Space size="large" wrap>
            {Object.keys(statusNames).map(status => (
              <Badge 
                key={status} 
                color={statusColors[status]} 
                text={
                  <Space>
                    <span>{statusNames[status]}</span>
                    <span className="status-count">{statusCounts[status] || 0}</span>
                  </Space>
                } 
              />
            ))}
          </Space>
        </div>
        
        <Divider style={{ margin: '16px 0' }} />
        
        <DashboardSearch
          filterOptions={filterOptions}
          dateRange={dateRange}
          onSearch={handleSearch}
          onDateChange={handleDateRangeChange}
        />
        
        <Divider style={{ margin: '16px 0' }} />
        
        <DashboardTable
          data={data}
          loading={isLoading}
          searchParams={searchParams}
          selectedRowKeys={selectedRowKeys}
          onSelectChange={onSelectChange}
          onShowStatusModal={showStatusModal}
          onShowDetailModal={showDetailModal}
          totalItems={totalItems}
          onPaginationChange={handlePaginationChange}
          userRole={userRole}
        />
        
        {children}
      </Card>
    </Content>
  );
};

DashboardBase.propTypes = {
  title: PropTypes.string,
  userRole: PropTypes.string.isRequired,
  data: PropTypes.array,
  isLoading: PropTypes.bool,
  searchParams: PropTypes.object,
  filterOptions: PropTypes.object,
  handleSearch: PropTypes.func.isRequired,
  handlePaginationChange: PropTypes.func.isRequired,
  handleDateRangeChange: PropTypes.func.isRequired,
  refreshData: PropTypes.func.isRequired,
  totalItems: PropTypes.number,
  dateRange: PropTypes.array,
  selectedRowKeys: PropTypes.array,
  onSelectChange: PropTypes.func,
  showStatusModal: PropTypes.func,
  showDetailModal: PropTypes.func,
  additionalActions: PropTypes.node,
  children: PropTypes.node,
};

export default DashboardBase;

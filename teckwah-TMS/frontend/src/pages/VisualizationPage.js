/**
 * 시각화 페이지 컴포넌트 (관리자 전용)
 */
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, DatePicker, Button, Space, 
  Select, Statistic, Empty, message 
} from 'antd';
import { ReloadOutlined, BarChartOutlined, PieChartOutlined, LineChartOutlined } from '@ant-design/icons';
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';
import dayjs from 'dayjs';
import MainLayout from '../components/layout/MainLayout';
import { PageTitle, PageLoading, ErrorResult } from '../components/common';
import { VisualizationService } from '../services';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 차트 색상
const COLORS = ['#1890ff', '#faad14', '#52c41a', '#f5222d', '#bfbfbf'];

// 상태별 색상 매핑
const STATUS_COLORS = {
  'WAITING': '#1890ff',
  'IN_PROGRESS': '#faad14',
  'COMPLETE': '#52c41a',
  'ISSUE': '#f5222d',
  'CANCEL': '#bfbfbf'
};

// 상태별 라벨
const STATUS_LABELS = {
  'WAITING': '대기',
  'IN_PROGRESS': '진행',
  'COMPLETE': '완료',
  'ISSUE': '이슈',
  'CANCEL': '취소'
};

// 창고별 색상 매핑
const WAREHOUSE_COLORS = {
  'SEOUL': '#1890ff',
  'BUSAN': '#faad14',
  'GWANGJU': '#52c41a',
  'DAEJEON': '#f5222d'
};

// 창고별 라벨
const WAREHOUSE_LABELS = {
  'SEOUL': '서울',
  'BUSAN': '부산',
  'GWANGJU': '광주',
  'DAEJEON': '대전'
};

const VisualizationPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, 'day').startOf('day'),
    dayjs().endOf('day')
  ]);
  
  // 데이터 불러오기
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString()
      };
      
      const response = await VisualizationService.getStats(params);
      
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || '데이터 조회 실패');
      }
    } catch (error) {
      console.error('시각화 데이터 조회 오류:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 초기 데이터 로드
  useEffect(() => {
    fetchData();
  }, []);
  
  // 날짜 변경 처리
  const handleDateChange = (dates) => {
    if (!dates || dates.length !== 2) {
      return;
    }
    
    setDateRange(dates);
  };
  
  // 데이터 새로고침
  const handleRefresh = () => {
    fetchData();
  };
  
  // 에러 발생 시 재시도
  const handleRetry = () => {
    fetchData();
  };
  
  // 상태 분포 데이터 변환
  const getStatusDistributionData = () => {
    if (!data || !data.statusDistribution) {
      return [];
    }
    
    return data.statusDistribution.map(item => ({
      name: STATUS_LABELS[item.status] || item.status,
      value: item.count,
      color: STATUS_COLORS[item.status] || '#1890ff'
    }));
  };
  
  // 창고별 분포 데이터 변환
  const getWarehouseDistributionData = () => {
    if (!data || !data.warehouseDistribution) {
      return [];
    }
    
    return data.warehouseDistribution.map(item => ({
      name: WAREHOUSE_LABELS[item.warehouse] || item.warehouse,
      value: item.count,
      color: WAREHOUSE_COLORS[item.warehouse] || '#1890ff'
    }));
  };
  
  // 일별 주문 데이터 변환
  const getDailyOrdersData = () => {
    if (!data || !data.dailyOrders) {
      return [];
    }
    
    return data.dailyOrders.map(item => ({
      date: item.date,
      count: item.count
    }));
  };
  
  // 창고별 평균 거리 데이터 변환
  const getAvgDistanceData = () => {
    if (!data || !data.avgDistanceByWarehouse) {
      return [];
    }
    
    return data.avgDistanceByWarehouse.map(item => ({
      name: WAREHOUSE_LABELS[item.warehouse] || item.warehouse,
      distance: Math.round(item.avgDistance * 10) / 10,
      color: WAREHOUSE_COLORS[item.warehouse] || '#1890ff'
    }));
  };
  
  // 페이지 제목 우측 버튼
  const pageExtra = (
    <Space>
      <RangePicker
        value={dateRange}
        onChange={handleDateChange}
        allowClear={false}
      />
      <Button
        type="primary"
        icon={<ReloadOutlined />}
        onClick={handleRefresh}
      >
        새로고침
      </Button>
    </Space>
  );
  
  if (error) {
    return (
      <MainLayout>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '16px' 
        }}>
          {pageExtra}
        </div>
        <ErrorResult 
          status="error" 
          title="데이터 로드 오류" 
          subTitle={error} 
          onRetry={handleRetry} 
        />
      </MainLayout>
    );
  }
  
  if (loading) {
    return (
      <MainLayout>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '16px' 
        }}>
          {pageExtra}
        </div>
        <PageLoading tip="시각화 데이터를 불러오는 중..." />
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '16px' 
      }}>
        {pageExtra}
      </div>
      
      {/* 요약 통계 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic 
              title="평균 배송 소요 시간" 
              value={data?.avgDeliveryTimeMinutes || 0} 
              suffix="분"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic 
              title="총 주문 수" 
              value={getStatusDistributionData().reduce((sum, item) => sum + item.value, 0)} 
              suffix="건"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic 
              title="완료율" 
              value={
                Math.round(
                  (getStatusDistributionData().find(item => item.name === '완료')?.value || 0) /
                  Math.max(getStatusDistributionData().reduce((sum, item) => sum + item.value, 0), 1) * 100
                )
              } 
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic 
              title="이슈율" 
              value={
                Math.round(
                  (getStatusDistributionData().find(item => item.name === '이슈')?.value || 0) /
                  Math.max(getStatusDistributionData().reduce((sum, item) => sum + item.value, 0), 1) * 100
                )
              } 
              suffix="%"
            />
          </Card>
        </Col>
      </Row>
      
      {/* 그래프 */}
      <Row gutter={16}>
        {/* 일별 주문 수 */}
        <Col xs={24} lg={12} style={{ marginBottom: 16 }}>
          <Card 
            title={
              <Space>
                <LineChartOutlined />
                <span>일별 주문 수</span>
              </Space>
            }
            bodyStyle={{ height: 300 }}
          >
            {getDailyOrdersData().length === 0 ? (
              <Empty description="데이터가 없습니다" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={getDailyOrdersData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="주문 수" 
                    stroke="#1890ff" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        
        {/* 상태별 분포 */}
        <Col xs={24} sm={12} lg={6} style={{ marginBottom: 16 }}>
          <Card 
            title={
              <Space>
                <PieChartOutlined />
                <span>상태별 분포</span>
              </Space>
            }
            bodyStyle={{ height: 300 }}
          >
            {getStatusDistributionData().length === 0 ? (
              <Empty description="데이터가 없습니다" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getStatusDistributionData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {getStatusDistributionData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        
        {/* 창고별 분포 */}
        <Col xs={24} sm={12} lg={6} style={{ marginBottom: 16 }}>
          <Card 
            title={
              <Space>
                <PieChartOutlined />
                <span>창고별 분포</span>
              </Space>
            }
            bodyStyle={{ height: 300 }}
          >
            {getWarehouseDistributionData().length === 0 ? (
              <Empty description="데이터가 없습니다" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getWarehouseDistributionData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {getWarehouseDistributionData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        
        {/* 창고별 평균 거리 */}
        <Col xs={24} lg={12} style={{ marginBottom: 16 }}>
          <Card 
            title={
              <Space>
                <BarChartOutlined />
                <span>창고별 평균 거리</span>
              </Space>
            }
            bodyStyle={{ height: 300 }}
          >
            {getAvgDistanceData().length === 0 ? (
              <Empty description="데이터가 없습니다" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getAvgDistanceData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="distance" 
                    name="평균 거리 (km)" 
                    barSize={60}
                  >
                    {getAvgDistanceData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>
    </MainLayout>
  );
};

export default VisualizationPage;

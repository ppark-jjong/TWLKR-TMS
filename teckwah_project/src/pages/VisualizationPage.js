// src/pages/VisualizationPage.js
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Button, Radio, Statistic, Spin, Empty, message } from 'antd';
import { ReloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import dayjs from 'dayjs';
import locale from 'antd/es/date-picker/locale/ko_KR';
import { getDeliveryStatus, getHourlyOrders, getVisualizationDateRange } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const { RangePicker } = DatePicker;

// 색상 설정
const STATUS_COLORS = {
  WAITING: '#1890ff',
  IN_PROGRESS: '#faad14',
  COMPLETE: '#52c41a',
  ISSUE: '#f5222d',
  CANCEL: '#bfbfbf',
};

const DEPARTMENT_COLORS = ['#1890ff', '#13c2c2', '#722ed1', '#eb2f96'];

const VisualizationPage = () => {
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'day'), dayjs()]);
  const [chartType, setChartType] = useState('delivery_status');
  const [deliveryStatusData, setDeliveryStatusData] = useState(null);
  const [hourlyOrdersData, setHourlyOrdersData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRangeInfo, setDateRangeInfo] = useState(null);

  // 날짜 범위 정보 조회
  const fetchDateRange = async () => {
    try {
      const response = await getVisualizationDateRange();
      if (response.data.success) {
        setDateRangeInfo(response.data.data);
      }
    } catch (error) {
      console.error('Date range fetch error:', error);
    }
  };

  // 배송 현황 데이터 조회
  const fetchDeliveryStatus = async () => {
    if (!dateRange) return;
    
    setLoading(true);
    try {
      const params = {
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD'),
      };
      
      const response = await getDeliveryStatus(params);
      if (response.data.success) {
        setDeliveryStatusData(response.data.data);
      }
    } catch (error) {
      message.error('배송 현황 데이터를 불러오는데 실패했습니다');
      console.error('Delivery status fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 시간대별 접수량 데이터 조회
  const fetchHourlyOrders = async () => {
    if (!dateRange) return;
    
    setLoading(true);
    try {
      const params = {
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD'),
      };
      
      const response = await getHourlyOrders(params);
      if (response.data.success) {
        setHourlyOrdersData(response.data.data);
      }
    } catch (error) {
      message.error('시간대별 접수량 데이터를 불러오는데 실패했습니다');
      console.error('Hourly orders fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로딩
  useEffect(() => {
    fetchDateRange();
  }, []);

  // 차트 타입에 따른 데이터 조회
  useEffect(() => {
    if (chartType === 'delivery_status') {
      fetchDeliveryStatus();
    } else {
      fetchHourlyOrders();
    }
  }, [chartType, dateRange]);

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (dates) => {
    if (dates) {
      setDateRange(dates);
    }
  };

  // 차트 타입 변경 핸들러
  const handleChartTypeChange = (e) => {
    setChartType(e.target.value);
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    if (chartType === 'delivery_status') {
      fetchDeliveryStatus();
    } else {
      fetchHourlyOrders();
    }
  };

  // 배송 현황 차트 렌더링
  const renderDeliveryStatusChart = () => {
    if (!deliveryStatusData) return <Empty description="데이터가 없습니다" />;
    
    const { by_warehouse, overall } = deliveryStatusData;
    
    // 상태별 데이터 준비
    const statusData = [
      { name: '대기', value: overall?.waiting || 0, color: STATUS_COLORS.WAITING },
      { name: '진행', value: overall?.in_progress || 0, color: STATUS_COLORS.IN_PROGRESS },
      { name: '완료', value: overall?.complete || 0, color: STATUS_COLORS.COMPLETE },
      { name: '이슈', value: overall?.issue || 0, color: STATUS_COLORS.ISSUE },
      { name: '취소', value: overall?.cancel || 0, color: STATUS_COLORS.CANCEL },
    ];
    
    // 창고별 데이터 준비
    const warehouseData = by_warehouse?.map(item => ({
      name: item.warehouse === 'SEOUL' ? '서울' :
            item.warehouse === 'BUSAN' ? '부산' :
            item.warehouse === 'GWANGJU' ? '광주' :
            item.warehouse === 'DAEJEON' ? '대전' : item.warehouse,
      대기: item.waiting,
      진행: item.in_progress,
      완료: item.complete,
      이슈: item.issue,
      취소: item.cancel,
    })) || [];
    
    return (
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="전체 배송 현황">
            <Row gutter={16}>
              <Col span={12}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Col>
              <Col span={12}>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Statistic
                      title="전체 건수"
                      value={overall?.total || 0}
                      suffix="건"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="대기"
                      value={overall?.waiting || 0}
                      suffix="건"
                      valueStyle={{ color: STATUS_COLORS.WAITING }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="진행"
                      value={overall?.in_progress || 0}
                      suffix="건"
                      valueStyle={{ color: STATUS_COLORS.IN_PROGRESS }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="완료"
                      value={overall?.complete || 0}
                      suffix="건"
                      valueStyle={{ color: STATUS_COLORS.COMPLETE }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="이슈"
                      value={overall?.issue || 0}
                      suffix="건"
                      valueStyle={{ color: STATUS_COLORS.ISSUE }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="취소"
                      value={overall?.cancel || 0}
                      suffix="건"
                      valueStyle={{ color: STATUS_COLORS.CANCEL }}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={24}>
          <Card title="창고별 배송 현황">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={warehouseData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="대기" stackId="a" fill={STATUS_COLORS.WAITING} />
                <Bar dataKey="진행" stackId="a" fill={STATUS_COLORS.IN_PROGRESS} />
                <Bar dataKey="완료" stackId="a" fill={STATUS_COLORS.COMPLETE} />
                <Bar dataKey="이슈" stackId="a" fill={STATUS_COLORS.ISSUE} />
                <Bar dataKey="취소" stackId="a" fill={STATUS_COLORS.CANCEL} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    );
  };

  // 시간대별 접수량 차트 렌더링
  const renderHourlyOrdersChart = () => {
    if (!hourlyOrdersData) return <Empty description="데이터가 없습니다" />;
    
    const { hourly_distribution, department_peak_hours, total_count, average_count } = hourlyOrdersData;
    
    // 시간대별 데이터 준비
    const hourlyData = hourly_distribution?.map(item => ({
      name: item.hour.split('-')[0],
      접수량: item.count,
    })) || [];
    
    // 부서별 피크타임 데이터
    const departmentData = [];
    if (department_peak_hours) {
      Object.entries(department_peak_hours).forEach(([dept, peakHours]) => {
        peakHours.forEach((peak) => {
          departmentData.push({
            부서: dept,
            시간: `${String(peak.hour).padStart(2, '0')}:00`,
            건수: peak.count,
          });
        });
      });
    }
    
    return (
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="시간대별 접수량 통계">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="총 주문 수"
                  value={total_count || 0}
                  suffix="건"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="일 평균 주문 수"
                  value={average_count || 0}
                  precision={1}
                  suffix="건"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="조회 기간"
                  value={`${dateRange[0].format('YYYY-MM-DD')} ~ ${dateRange[1].format('YYYY-MM-DD')}`}
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={24}>
          <Card title="시간대별 접수량">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={hourlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="접수량" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={24}>
          <Card title="부서별 피크타임">
            <Row gutter={16}>
              {Object.entries(department_peak_hours || {}).map(([dept, peakHours], index) => (
                <Col span={8} key={dept}>
                  <Card title={dept} bordered={false}>
                    {peakHours.map((peak, i) => (
                      <Statistic
                        key={i}
                        title={`${String(peak.hour).padStart(2, '0')}:00`}
                        value={peak.count}
                        suffix="건"
                        valueStyle={{ color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length] }}
                        style={{ marginBottom: 8 }}
                      />
                    ))}
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <div>
      <Card title="데이터 시각화">
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <RangePicker
              locale={locale}
              value={dateRange}
              onChange={handleDateRangeChange}
              style={{ width: '100%' }}
              disabledDate={(current) => {
                // 날짜 범위 제한 (최대 3개월)
                if (!dateRange || !current) return false;
                return current > dayjs() || current < dayjs().subtract(3, 'month');
              }}
            />
          </Col>
          <Col span={8}>
            <Radio.Group value={chartType} onChange={handleChartTypeChange}>
              <Radio.Button value="delivery_status">배송 현황</Radio.Button>
              <Radio.Button value="hourly_orders">시간대별 접수량</Radio.Button>
            </Radio.Group>
          </Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              새로고침
            </Button>
          </Col>
        </Row>
        
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {chartType === 'delivery_status' ? renderDeliveryStatusChart() : renderHourlyOrdersChart()}
          </>
        )}
      </Card>
    </div>
  );
};

export default VisualizationPage;
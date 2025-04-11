import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Select, DatePicker, Button, Space, notification, Spin, Empty } from 'antd';
import { SearchOutlined, ReloadOutlined, BarChartOutlined, PieChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import TimeChart from '../components/visualization/TimeChart';
import DepartmentChart from '../components/visualization/DepartmentChart';
import { getVisualizationData } from '../api/dashboardService';
import { DEPARTMENT_OPTIONS } from '../utils/constants';
import { getDaysAgo, formatDate } from '../utils/helpers';

const { Option } = Select;
const { RangePicker } = DatePicker;

/**
 * 시각화 페이지 컴포넌트
 */
const VisualizationPage = () => {
  // 차트 필터 상태 관리
  const [filters, setFilters] = useState({
    chart_type: 'time',
    department: '',
    start_date: getDaysAgo(7),
    end_date: formatDate(new Date()),
  });
  
  // 차트 데이터 상태
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 시각화 데이터 가져오기
  const fetchVisualizationData = async () => {
    try {
      setLoading(true);
      
      // 실제 API 호출로 데이터 가져오기
      const response = await getVisualizationData({
        chart_type: filters.chart_type,
        start_date: filters.start_date,
        end_date: filters.end_date,
        department: filters.department || undefined
      });
      
      if (response.success) {
        // API 응답에서 data.data가 실제 차트 데이터
        setChartData(response.data.data);
      } else {
        notification.error({
          message: '데이터 로드 실패',
          description: response.message || '시각화 데이터를 불러오는 중 오류가 발생했습니다.',
        });
      }
      
      setLoading(false);
    } catch (error) {
      notification.error({
        message: '데이터 로드 실패',
        description: error.message || '시각화 데이터를 불러오는 중 오류가 발생했습니다.',
      });
      setLoading(false);
    }
  };
  
  // 필터 값 변경 핸들러
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setFilters(prev => ({
        ...prev,
        start_date: formatDate(dates[0]._d),
        end_date: formatDate(dates[1]._d)
      }));
    }
  };

  // 차트 조회 버튼 핸들러
  const handleViewChart = () => {
    fetchVisualizationData();
  };
  
  // 새로고침 버튼 핸들러
  const handleRefresh = () => {
    fetchVisualizationData();
  };

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    // 페이지 로드 시 자동으로 데이터를 가져오지 않음 (사용자가 버튼 클릭하도록)
  }, []);

  return (
    <div className="visualization-page">
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <BarChartOutlined style={{ marginRight: '8px', fontSize: '18px' }} />
            <span>데이터 시각화</span>
          </div>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
            disabled={!chartData}
          >
            새로고침
          </Button>
        }
      >
        {/* 필터 영역 */}
        <div className="control-panel" style={{ padding: '0 0 20px 0' }}>
          <div className="viz-filter-row">
            <div className="viz-filter-item">
              <label htmlFor="vizChartType">시각화 유형</label>
              <Select
                id="vizChartType"
                className="select-field"
                value={filters.chart_type}
                onChange={(value) => handleFilterChange('chart_type', value)}
                style={{ width: '180px', marginTop: '8px' }}
              >
                <Option value="time">시간대별 주문 접수</Option>
                <Option value="dept-status">부서별 배송 상태 분포</Option>
              </Select>
            </div>

            <div className="viz-filter-item date-range-filter">
              <label htmlFor="vizDateRange">날짜 기간</label>
              <div className="date-input-group" style={{ marginTop: '8px' }}>
                <RangePicker
                  id="vizDateRange"
                  value={[
                    filters.start_date ? dayjs(filters.start_date) : null,
                    filters.end_date ? dayjs(filters.end_date) : null,
                  ]}
                  onChange={handleDateRangeChange}
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </div>
            </div>

            <div className="viz-filter-item">
              <label htmlFor="vizDepartmentFilter">부서</label>
              <Select
                id="vizDepartmentFilter"
                className="select-field"
                value={filters.department}
                onChange={(value) => handleFilterChange('department', value)}
                style={{ width: '150px', marginTop: '8px' }}
                placeholder="전체"
                allowClear
              >
                {DEPARTMENT_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>{option.label}</Option>
                ))}
              </Select>
            </div>

            <div className="viz-filter-item viz-button-container">
              <Button 
                type="primary" 
                onClick={handleViewChart}
                icon={<SearchOutlined />}
                style={{ marginTop: '32px' }}
              >
                차트 보기
              </Button>
            </div>
          </div>
        </div>

        {/* 차트 영역 (또는 플레이스홀더) */}
        {!chartData && !loading && (
          <div id="chartPlaceholder" className="chart-placeholder">
            <BarChartOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '20px' }} />
            <h3>
              시각화 유형을 선택하고 필터를 설정한 후 차트 보기 버튼을 눌러주세요
            </h3>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <Spin size="large" tip="데이터를 불러오는 중..." />
          </div>
        )}
        
        {/* 시간대별 차트 */}
        {!loading && chartData && filters.chart_type === 'time' && (
          <div id="chartContainerWrapper" className="visualization-container">
            <div className="chart-container" id="mainChartContainer">
              <TimeChart data={chartData} loading={loading} />
            </div>
          </div>
        )}
        
        {/* 부서별 차트 */}
        {!loading && chartData && filters.chart_type === 'dept-status' && (
          <div id="departmentChartsContainer" className="visualization-container">
            <div className="department-chart-row">
              <div className="department-chart" id="csChart">
                <h4>CS 부서</h4>
                <div className="chart-container" style={{ height: '300px' }}>
                  <DepartmentChart 
                    title="CS 부서 상태 분포" 
                    data={chartData['CS']} 
                    loading={loading}
                  />
                </div>
              </div>
              <div className="department-chart" id="hesChart">
                <h4>HES 부서</h4>
                <div className="chart-container" style={{ height: '300px' }}>
                  <DepartmentChart 
                    title="HES 부서 상태 분포" 
                    data={chartData['HES']} 
                    loading={loading}
                  />
                </div>
              </div>
              <div className="department-chart" id="lenovoChart">
                <h4>LENOVO 부서</h4>
                <div className="chart-container" style={{ height: '300px' }}>
                  <DepartmentChart 
                    title="LENOVO 부서 상태 분포" 
                    data={chartData['LENOVO']} 
                    loading={loading}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default VisualizationPage;

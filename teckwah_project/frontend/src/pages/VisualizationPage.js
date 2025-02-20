// VisualizationPage.js
import React, { useState, useEffect } from 'react';
import { Layout, Select, DatePicker, Card, Typography, Space, Alert } from 'antd';
import { BarChartOutlined, PieChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import StatusPieCharts from '../components/visualization/StatusPieChart';
import HourlyBarChart from '../components/visualization/HourlyBarChart';
import LoadingSpin from '../components/common/LoadingSpin';
import VisualizationService from '../services/VisualizationService';
import DashboardService from '../services/DashboardService';
import { CHART_TYPES, FONT_STYLES } from '../utils/Constants';
import message, { MessageKeys, MessageTemplates } from '../utils/message';

const { Content } = Layout;
const { RangePicker } = DatePicker;
const { Text } = Typography;

const chartTypeOptions = [
  { 
    value: CHART_TYPES.DELIVERY_STATUS, 
    label: '부서별 배송 현황',
    icon: <PieChartOutlined />
  },
  { 
    value: CHART_TYPES.HOURLY_ORDERS, 
    label: '시간대별 접수량',
    icon: <BarChartOutlined />
  }
];

const VisualizationPage = () => {
  const [vizType, setVizType] = useState(CHART_TYPES.DELIVERY_STATUS);
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'day'), dayjs()]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [dateRangeInfo, setDateRangeInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDateRange();
  }, []);

  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      fetchData();
    }
  }, [vizType, dateRange]);

  const getDateRange = async () => {
    try {
      const response = await DashboardService.getDateRange();
      setDateRangeInfo(response.data);
    } catch (error) {
      message.error('조회 가능 기간 확인 중 오류가 발생했습니다');
    }
  };

  const fetchData = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      message.warning('날짜를 선택해주세요');
      return;
    }

    setError(null);
    setLoading(true);
    
    try {
      const response = await VisualizationService.getVisualizationData(
        vizType,
        dateRange[0].startOf('day').toDate(),
        dateRange[1].endOf('day').toDate()
      );
      
      setData(response);
      message.success('데이터를 조회했습니다');
    } catch (error) {
      setError('데이터 조회 중 오류가 발생했습니다. 다시 시도해주세요.');
      message.error('데이터 조회 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Content style={{ padding: '24px', backgroundColor: 'white' }}>
      <Card 
        bordered={false} 
        bodyStyle={{ padding: '24px' }}
        className="visualization-card"
      >
        <div style={{ 
          marginBottom: 24, 
          display: 'flex', 
          flexDirection: 'column',
          gap: 16
        }}>
          <Space size="large" align="center" style={{ 
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <Space size="middle">
              <Select
                value={vizType}
                onChange={setVizType}
                style={{ width: 200 }}
                options={chartTypeOptions}
                optionLabelProp="label"
                size="large"
                optionRender={(option) => (
                  <Space>
                    {option.data.icon}
                    <span style={FONT_STYLES.BODY.MEDIUM}>{option.data.label}</span>
                  </Space>
                )}
              />
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: 320 }}
                size="large"
              />
            </Space>
            
            {dateRangeInfo && (
              <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
                조회 가능 기간: {dateRangeInfo.oldest_date} ~ {dateRangeInfo.latest_date}
              </Text>
            )}
          </Space>

          {error && (
            <Alert
              message="오류"
              description={error}
              type="error"
              showIcon
            />
          )}
        </div>

        <div className="visualization-content" style={{
          background: '#fafafa',
          borderRadius: '8px',
          padding: '24px',
          minHeight: 'calc(100vh - 300px)',
          transition: 'all 0.3s ease'
        }}>
          {loading ? (
            <LoadingSpin />
          ) : (
            <>
              {vizType === CHART_TYPES.DELIVERY_STATUS && (
                <StatusPieCharts data={data} />
              )}
              {vizType === CHART_TYPES.HOURLY_ORDERS && (
                <HourlyBarChart data={data} />
              )}
            </>
          )}
        </div>
      </Card>

      <style jsx global>{`
        .visualization-card {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .visualization-card .ant-card-body {
          padding: 24px !important;
        }

        .visualization-content {
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }

        .ant-select-item-option-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </Content>
  );
};

export default VisualizationPage;
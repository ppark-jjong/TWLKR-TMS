// frontend/src/pages/VisualizationPage.js
import React, { useState, useEffect } from 'react';
import { Layout, Select, DatePicker, Card, Space } from 'antd';
import dayjs from 'dayjs';
import { CHART_TYPES } from '../utils/Constants';
import DateRangeInfo from '../components/common/DateRangeInfo';
import StatusPieCharts from '../components/visualization/StatusPieChart';
import HourlyBarChart from '../components/visualization/HourlyBarChart';
import VisualizationService from '../services/VisualizationService';
import message from '../utils/message';

const { RangePicker } = DatePicker;

const VisualizationPage = () => {
  const [chartType, setChartType] = useState(CHART_TYPES.DELIVERY_STATUS);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);
  const [availableDateRange, setAvailableDateRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadDateRange();
    if (dateRange[0] && dateRange[1]) {
      loadVisualizationData();
    }
  }, [chartType, dateRange]);

  const loadDateRange = async () => {
    try {
      setLoading(true);
      const result = await VisualizationService.getDateRange();
      setAvailableDateRange(result.data);
    } catch (error) {
      console.error('Failed to load date range:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVisualizationData = async () => {
    try {
      setLoading(true);
      const response = await VisualizationService.getVisualizationData(
        chartType,
        dateRange[0],
        dateRange[1]
      );
      setData(response);
    } catch (error) {
      message.error('데이터 조회 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates) => {
    if (!dates || !dates[0] || !dates[1]) return;
    setDateRange(dates);
  };

  return (
    <Layout.Content style={{ padding: '24px', backgroundColor: 'white' }}>
      <Card bordered={false}>
        <div style={{ marginBottom: '24px' }}>
          <Space size="large" align="center">
            <Select
              value={chartType}
              onChange={setChartType}
              style={{ width: 200 }}
              size="large"
              options={[
                { value: CHART_TYPES.DELIVERY_STATUS, label: '배송 현황' },
                { value: CHART_TYPES.HOURLY_ORDERS, label: '시간별 접수량' },
              ]}
            />
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              style={{ width: 320 }}
              size="large"
            />
            <DateRangeInfo dateRange={availableDateRange} loading={loading} />
          </Space>
        </div>

        <div className="visualization-content">
          {chartType === CHART_TYPES.DELIVERY_STATUS ? (
            <StatusPieCharts data={data} loading={loading} />
          ) : (
            <HourlyBarChart data={data} loading={loading} />
          )}
        </div>
      </Card>
    </Layout.Content>
  );
};

export default VisualizationPage;

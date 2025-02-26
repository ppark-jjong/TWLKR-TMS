// frontend/src/pages/VisualizationPage.js
import React, { useState, useEffect } from 'react';
import { Layout, Select, DatePicker, Card, Space } from 'antd';
import dayjs from 'dayjs';
import { PieChartOutlined, BarChartOutlined } from '@ant-design/icons';
import { CHART_TYPES, VISUALIZATION_OPTIONS } from '../utils/Constants';
import DateRangeInfo from '../components/common/DateRangeInfo';
import StatusPieCharts from '../components/visualization/StatusPieChart';
import HourlyBarChart from '../components/visualization/HourlyBarChart';
import VisualizationService from '../services/VisualizationService';
import message, { MessageKeys } from '../utils/message';

const { RangePicker } = DatePicker;

const VisualizationPage = () => {
  // 상태 관리
  const [chartType, setChartType] = useState(CHART_TYPES.DELIVERY_STATUS);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);
  const [availableDateRange, setAvailableDateRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // 데이터 로드 함수
  const loadVisualizationData = async () => {
    if (!dateRange[0] || !dateRange[1]) return;

    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      setLoading(true);
      message.loading('데이터 조회 중...', key);

      let response;
      if (chartType === CHART_TYPES.DELIVERY_STATUS) {
        response = await VisualizationService.getDeliveryStatus(
          dateRange[0].format('YYYY-MM-DD'),
          dateRange[1].format('YYYY-MM-DD')
        );
      } else {
        response = await VisualizationService.getHourlyOrders(
          dateRange[0].format('YYYY-MM-DD'),
          dateRange[1].format('YYYY-MM-DD')
        );
      }

      if (response) {
        setData(response.data);
        setAvailableDateRange(response.date_range);

        if (!response.data.total_count) {
          message.info('해당 기간에 데이터가 없습니다', key);
        } else {
          message.loadingToSuccess('데이터를 조회했습니다', key);
        }
      }
    } catch (error) {
      console.error(`${chartType} 데이터 조회 실패:`, error);
      message.loadingToError('데이터 조회 중 오류가 발생했습니다', key);
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      loadVisualizationData();
    }
  }, [chartType]);

  // 날짜 범위 변경 시 데이터 다시 로드
  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      loadVisualizationData();
    }
  }, [dateRange]);

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (dates) => {
    if (!dates || !dates[0] || !dates[1]) return;

    // 과거 날짜 선택 제한
    const now = dayjs();
    if (dates[1].isAfter(now)) {
      message.warning('미래 날짜는 조회할 수 없습니다');
      return;
    }

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
              options={VISUALIZATION_OPTIONS.map((option) => ({
                value: option.value,
                label: (
                  <Space>
                    {option.value === CHART_TYPES.DELIVERY_STATUS ? (
                      <PieChartOutlined />
                    ) : (
                      <BarChartOutlined />
                    )}
                    {option.label}
                  </Space>
                ),
              }))}
            />
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              style={{ width: 320 }}
              size="large"
              disabled={loading}
              disabledDate={(current) => current && current.isAfter(dayjs())}
            />
            <DateRangeInfo dateRange={availableDateRange} loading={loading} />
          </Space>
        </div>

        <div className="visualization-content">
          {chartType === CHART_TYPES.DELIVERY_STATUS ? (
            <StatusPieCharts
              data={data}
              loading={loading}
              dateRange={dateRange}
            />
          ) : (
            <HourlyBarChart
              data={data}
              loading={loading}
              dateRange={dateRange}
            />
          )}
        </div>
      </Card>
    </Layout.Content>
  );
};

export default VisualizationPage;

// frontend/src/pages/VisualizationPage.js (수정)

import React, { useState, useEffect } from 'react';
import { Layout, Select, DatePicker, Card, Space, Spin, Alert } from 'antd';
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
  const [error, setError] = useState(null);

  // 날짜 범위 조회
  const fetchDateRange = async () => {
    try {
      const response = await VisualizationService.getDateRange();
      if (response && response.success) {
        setAvailableDateRange(response.date_range);

        // 서버에서 받은 날짜 범위로 초기 선택 설정
        const oldest = dayjs(response.date_range.oldest_date);
        const latest = dayjs(response.date_range.latest_date);

        // 최근 7일 또는 가능한 최대 범위 설정
        const start =
          latest.diff(oldest, 'day') > 7 ? latest.subtract(7, 'day') : oldest;

        setDateRange([start, latest]);
      }
    } catch (err) {
      console.error('날짜 범위 조회 실패:', err);
      setError('날짜 범위 조회 중 오류가 발생했습니다');
    }
  };

  // 데이터 로드 함수
  const loadVisualizationData = async () => {
    if (!dateRange[0] || !dateRange[1]) return;

    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      setLoading(true);
      setError(null);
      message.loading('데이터 조회 중...', key);

      // 선택된 차트 유형에 따라 API 호출
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

      if (response && response.success) {
        setData(response.data);

        // 최신 날짜 범위 정보가 있으면 업데이트
        if (response.date_range) {
          setAvailableDateRange(response.date_range);
        }

        if (!response.data.total_count) {
          message.info('해당 기간에 데이터가 없습니다', key);
        } else {
          message.loadingToSuccess('데이터를 조회했습니다', key);
        }
      } else {
        setError('데이터 조회에 실패했습니다');
        message.loadingToError('데이터 조회 중 오류가 발생했습니다', key);
      }
    } catch (error) {
      console.error(`${chartType} 데이터 조회 실패:`, error);
      setError('데이터 조회 중 오류가 발생했습니다');
      message.loadingToError('데이터 조회 중 오류가 발생했습니다', key);
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드 및 날짜 범위 조회
  useEffect(() => {
    fetchDateRange();
  }, []);

  // 차트 타입이나 날짜 범위 변경 시 데이터 로드
  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      loadVisualizationData();
    }
  }, [chartType, dateRange]);

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

  // 차트 타입 변경 핸들러
  const handleChartTypeChange = (value) => {
    setChartType(value);
  };

  return (
    <Layout.Content style={{ padding: '24px', backgroundColor: 'white' }}>
      <Card bordered={false}>
        <div style={{ marginBottom: '24px' }}>
          <Space size="large" align="center">
            <Select
              value={chartType}
              onChange={handleChartTypeChange}
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
              disabled={loading}
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

        {error && (
          <Alert
            message="오류"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        <div className="visualization-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>데이터 로딩 중...</div>
            </div>
          ) : (
            <>
              {chartType === CHART_TYPES.DELIVERY_STATUS ? (
                <StatusPieCharts data={data} dateRange={dateRange} />
              ) : (
                <HourlyBarChart data={data} dateRange={dateRange} />
              )}
            </>
          )}
        </div>
      </Card>
    </Layout.Content>
  );
};

export default VisualizationPage;

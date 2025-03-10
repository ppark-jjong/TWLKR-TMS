// frontend/src/pages/VisualizationPage.js

import React, { useState, useEffect } from 'react';
import {
  Layout,
  Select,
  DatePicker,
  Card,
  Space,
  Spin,
  Alert,
  Empty,
  Button,
} from 'antd';
import dayjs from 'dayjs';
import {
  PieChartOutlined,
  BarChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { CHART_TYPES, VISUALIZATION_OPTIONS } from '../utils/Constants';
import StatusPieCharts from '../components/visualization/StatusPieChart';
import HourlyBarChart from '../components/visualization/HourlyBarChart';
import VisualizationService from '../services/VisualizationService';
import message, { MessageKeys } from '../utils/message';
import { useDateRange } from '../utils/useDateRange';

const { RangePicker } = DatePicker;

const VisualizationPage = () => {
  // 커스텀 훅을 사용하여 날짜 범위 관리
  const {
    dateRange,
    disabledDate,
    handleDateRangeChange,
    loading: dateRangeLoading,
  } = useDateRange(7); // 기본 7일 범위

  // 상태 관리
  const [chartType, setChartType] = useState(CHART_TYPES.DELIVERY_STATUS);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // 날짜 범위가 설정되면 시각화 데이터 로드
  useEffect(() => {
    if (dateRange[0] && dateRange[1] && !dateRangeLoading) {
      loadVisualizationData();
    }
  }, [dateRange, dateRangeLoading]);

  // 차트 타입이 변경되면 데이터 다시 로드
  useEffect(() => {
    if (!initialLoad && !dateRangeLoading) {
      loadVisualizationData();
    }
  }, [chartType, initialLoad, dateRangeLoading]);

  // 데이터 로드 함수
  const loadVisualizationData = async () => {
    if (!dateRange[0] || !dateRange[1]) return;

    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      setLoading(true);
      setError(null);
      message.loading('데이터 조회 중...', key);

      console.log(
        `${chartType} 데이터 조회 요청: ${dateRange[0].format(
          'YYYY-MM-DD'
        )} ~ ${dateRange[1].format('YYYY-MM-DD')}`
      );

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

      // 응답 로깅
      console.log(`${chartType} 응답 데이터:`, response);

      if (response && response.success) {
        // 데이터 구조 검증
        if (!response.data) {
          console.warn(`${chartType} 응답에 data 필드가 없습니다:`, response);
          setError(
            '서버 응답 형식이 올바르지 않습니다. 관리자에게 문의하세요.'
          );
          message.loadingToError('데이터 형식이 올바르지 않습니다', key);
          setData(null);
        } else {
          setData(response.data);

          if (!response.data.total_count) {
            message.info(
              `해당 기간(${dateRange[0].format(
                'YYYY-MM-DD'
              )} ~ ${dateRange[1].format('YYYY-MM-DD')})에 데이터가 없습니다`,
              key
            );
          } else {
            message.loadingToSuccess('데이터를 조회했습니다', key);
          }
        }
      } else {
        setError('데이터 조회에 실패했습니다. 잠시 후 다시 시도해주세요.');
        message.loadingToError('데이터 조회 중 오류가 발생했습니다', key);
        setData(null);
      }
    } catch (error) {
      console.error(`${chartType} 데이터 조회 실패:`, error);
      setError(
        '서버 연결 중 오류가 발생했습니다. 네트워크 상태를 확인하고 잠시 후 다시 시도해주세요.'
      );
      message.loadingToError('데이터 조회 중 오류가 발생했습니다', key);
      setData(null);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // 차트 타입 변경 핸들러
  const handleChartTypeChange = (value) => {
    console.log(`차트 타입 변경: ${value}`);
    setChartType(value);
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    console.log('데이터 새로고침 요청');
    loadVisualizationData();
  };

  // 데이터 유효성 검증 함수
  const isValidData = (data, type) => {
    if (!data) return false;

    if (type === CHART_TYPES.DELIVERY_STATUS) {
      return (
        data.department_breakdown &&
        Object.keys(data.department_breakdown).length > 0
      );
    } else if (type === CHART_TYPES.HOURLY_ORDERS) {
      return (
        data.department_breakdown &&
        Object.keys(data.department_breakdown).length > 0
      );
    }

    return false;
  };

  // 렌더링 컴포넌트 결정 함수
  const renderVisualization = () => {
    if (loading || dateRangeLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>데이터 로딩 중...</div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message="오류"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
          action={
            <Button type="primary" size="small" onClick={handleRefresh}>
              다시 시도
            </Button>
          }
        />
      );
    }

    if (!isValidData(data, chartType)) {
      return (
        <Empty
          description={
            <span>
              데이터가 없습니다
              <br />
              다른 날짜 범위를 선택하거나 차트 유형을 변경해 보세요
            </span>
          }
          style={{ margin: '50px 0' }}
        />
      );
    }

    if (chartType === CHART_TYPES.DELIVERY_STATUS) {
      return <StatusPieCharts data={data} dateRange={dateRange} />;
    } else {
      return <HourlyBarChart data={data} dateRange={dateRange} />;
    }
  };

  return (
    <Layout.Content style={{ padding: '24px', backgroundColor: 'white' }}>
      <Card bordered={false} title="배송 데이터 시각화">
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
              disabledDate={disabledDate}
              ranges={{
                오늘: [dayjs(), dayjs()],
                '최근 3일': [dayjs().subtract(2, 'day'), dayjs()],
                '최근 7일': [dayjs().subtract(6, 'day'), dayjs()],
                '최근 30일': [dayjs().subtract(29, 'day'), dayjs()],
              }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              disabled={loading || dateRangeLoading}
              title="데이터 새로고침"
            />
          </Space>
        </div>

        <div className="visualization-content">{renderVisualization()}</div>
      </Card>
    </Layout.Content>
  );
};

export default VisualizationPage;

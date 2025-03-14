// frontend/src/pages/VisualizationPage.js

import React, { useState, useEffect, useCallback } from 'react';
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
  Typography,
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
const { Title, Text } = Typography;

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
  const [loadAttempted, setLoadAttempted] = useState(false);

  // 안전하게 데이터 로드하는 함수
  const safeLoadData = useCallback(async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1] || dateRangeLoading) {
      return;
    }

    setLoadAttempted(true);
    await loadVisualizationData();
  }, [dateRange, dateRangeLoading]);

  // 날짜 범위가 설정되면 시각화 데이터 로드
  useEffect(() => {
    if (
      dateRange &&
      dateRange[0] &&
      dateRange[1] &&
      !dateRangeLoading &&
      !loadAttempted
    ) {
      safeLoadData();
    }
  }, [dateRange, dateRangeLoading, loadAttempted, safeLoadData]);

  // 차트 타입이 변경되면 데이터 다시 로드
  useEffect(() => {
    if (!initialLoad && !dateRangeLoading && loadAttempted) {
      loadVisualizationData();
    }
  }, [chartType, initialLoad, dateRangeLoading, loadAttempted]);

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
          // 차트 타입에 따라 기본 필드 검사 및 추가
          if (chartType === CHART_TYPES.DELIVERY_STATUS) {
            // 필수 필드 확인 및 추가
            const processedData = {
              ...response.data,
              type: 'delivery_status',
              total_count: response.data.total_count || 0,
              department_breakdown: response.data.department_breakdown || {},
            };
            setData(processedData);
          } else {
            // 시간대별 접수량 차트 필수 필드 검사
            const processedData = {
              ...response.data,
              type: 'hourly_orders',
              total_count: response.data.total_count || 0,
              average_count: response.data.average_count || 0,
              department_breakdown: response.data.department_breakdown || {},
              time_slots: response.data.time_slots || [],
            };

            // 시간대 정보가 없거나 유효하지 않은 경우 기본값 제공
            if (
              !processedData.time_slots ||
              !Array.isArray(processedData.time_slots) ||
              processedData.time_slots.length === 0
            ) {
              // 주간 시간대 생성 (09-19시)
              const daySlots = [];
              for (let h = 9; h < 19; h++) {
                daySlots.push({
                  label: `${h.toString().padStart(2, '0')}-${(h + 1)
                    .toString()
                    .padStart(2, '0')}`,
                  start: h,
                  end: h + 1,
                });
              }
              // 야간 시간대 추가
              daySlots.push({
                label: '야간(19-09)',
                start: 19,
                end: 9,
              });

              processedData.time_slots = daySlots;
            }

            setData(processedData);
          }

          if (response.data.total_count === 0) {
            message.loadingToInfo(
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
        // 응답은 성공했지만 success가 false인 경우
        setError(
          response?.message ||
            '데이터 조회에 실패했습니다. 잠시 후 다시 시도해주세요.'
        );
        message.loadingToError(
          response?.message || '데이터 조회 중 오류가 발생했습니다',
          key
        );

        // 빈 데이터 구조 제공
        if (chartType === CHART_TYPES.DELIVERY_STATUS) {
          setData({
            type: 'delivery_status',
            total_count: 0,
            department_breakdown: {},
          });
        } else {
          setData({
            type: 'hourly_orders',
            total_count: 0,
            average_count: 0,
            department_breakdown: {},
            time_slots: [],
          });
        }
      }
    } catch (error) {
      console.error(`${chartType} 데이터 조회 실패:`, error);
      setError(
        `서버 연결 중 오류가 발생했습니다. 네트워크 상태를 확인하고 잠시 후 다시 시도해주세요. (${
          error.message || '알 수 없는 오류'
        })`
      );
      message.loadingToError('데이터 조회 중 오류가 발생했습니다', key);

      // 에러 발생 시 기본 데이터 구조 제공
      if (chartType === CHART_TYPES.DELIVERY_STATUS) {
        setData({
          type: 'delivery_status',
          total_count: 0,
          department_breakdown: {},
        });
      } else {
        // 시간대별 접수량 기본 데이터 구조
        const defaultTimeSlots = [];
        for (let h = 9; h < 19; h++) {
          defaultTimeSlots.push({
            label: `${h.toString().padStart(2, '0')}-${(h + 1)
              .toString()
              .padStart(2, '0')}`,
            start: h,
            end: h + 1,
          });
        }
        defaultTimeSlots.push({
          label: '야간(19-09)',
          start: 19,
          end: 9,
        });

        setData({
          type: 'hourly_orders',
          total_count: 0,
          average_count: 0,
          department_breakdown: {},
          time_slots: defaultTimeSlots,
        });
      }
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
        typeof data.department_breakdown === 'object' &&
        Object.keys(data.department_breakdown).length > 0
      );
    } else if (type === CHART_TYPES.HOURLY_ORDERS) {
      return (
        data.department_breakdown &&
        typeof data.department_breakdown === 'object' &&
        Object.keys(data.department_breakdown).length > 0 &&
        Array.isArray(data.time_slots) &&
        data.time_slots.length > 0
      );
    }

    return false;
  };

  // 에러가 발생했을 때 ErrorBoundary로 전파하지 않고 컴포넌트 내에서 처리
  const handleError = (error) => {
    console.error('시각화 컴포넌트 내부 오류:', error);
    return (
      <Alert
        message="차트 렌더링 오류"
        description="차트를 표시하는 중 문제가 발생했습니다. 다시 시도해 주세요."
        type="error"
        showIcon
      />
    );
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

    try {
      if (chartType === CHART_TYPES.DELIVERY_STATUS) {
        return <StatusPieCharts data={data} dateRange={dateRange} />;
      } else {
        return <HourlyBarChart data={data} dateRange={dateRange} />;
      }
    } catch (renderError) {
      return handleError(renderError);
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

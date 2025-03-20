// src/pages/VisualizationPage.js - 리팩토링 버전
import React, { useEffect, useState, useCallback } from 'react';
import {
  Layout,
  Select,
  DatePicker,
  Card,
  Space,
  Empty,
  Button,
  Typography,
  Alert,
  Spin,
} from 'antd';
import {
  PieChartOutlined,
  BarChartOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CHART_TYPES, VISUALIZATION_OPTIONS } from '../utils/Constants';
import StatusPieChart from '../components/visualization/StatusPieChart';
import HourlyBarChart from '../components/visualization/HourlyBarChart';
import { useDateRange } from '../utils/useDateRange';
import VisualizationService from '../services/VisualizationService';
import { useLogger } from '../utils/LogUtils';
import { MessageKeys } from '../utils/message';
import message from '../utils/message';
import DateRangeInfo from '../components/common/DateRangeInfo';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

/**
 * 시각화 페이지 컴포넌트 (백엔드 API 명세 기반 리팩토링)
 * - 백엔드 API와의 연동 최적화
 * - 불필요한 상태 관리 제거
 * - 에러 처리 로직 개선
 * - 사용자 경험 향상을 위한 로딩 상태 처리 개선
 */
const VisualizationPage = () => {
  const logger = useLogger('VisualizationPage');

  // 날짜 범위 관리 커스텀 훅
  const {
    dateRange,
    disabledDate,
    handleDateRangeChange,
    availableDateRange,
    loading: dateRangeLoading,
  } = useDateRange(7); // 기본 7일 범위

  // 차트 상태 관리
  const [chartType, setChartType] = useState(CHART_TYPES.DELIVERY_STATUS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 로딩 중복 방지를 위한 레퍼런스
  const isLoadingRef = React.useRef(false);

  /**
   * 시각화 데이터 로드 함수
   * 백엔드 API 명세에 맞게 구현
   */
  const loadVisualizationData = useCallback(
    async (startDate, endDate) => {
      // 날짜 검증
      if (!startDate || !endDate || isLoadingRef.current) {
        return;
      }

      const formattedStartDate = startDate.format('YYYY-MM-DD');
      const formattedEndDate = endDate.format('YYYY-MM-DD');

      // 중복 요청 방지
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      // 메시지 표시
      message.loading('데이터 로드 중...', MessageKeys.VISUALIZATION.LOAD);

      try {
        logger.info(
          `${chartType} 데이터 로드 시작: ${formattedStartDate} ~ ${formattedEndDate}`
        );

        let response;
        // 차트 타입에 따른 API 호출
        if (chartType === CHART_TYPES.DELIVERY_STATUS) {
          response = await VisualizationService.getDeliveryStatus(
            formattedStartDate,
            formattedEndDate
          );
        } else {
          response = await VisualizationService.getHourlyOrders(
            formattedStartDate,
            formattedEndDate
          );
        }

        logger.debug('API 응답:', response);

        if (response && response.success) {
          setData(response.data);
          setLastUpdated(new Date());
          message.success('데이터 로드 완료', MessageKeys.VISUALIZATION.LOAD);
        } else {
          // 에러 처리
          const errorMsg = response?.message || '데이터 로드에 실패했습니다';
          setError(new Error(errorMsg));
          message.error(errorMsg, MessageKeys.VISUALIZATION.LOAD);
        }
      } catch (err) {
        logger.error('시각화 데이터 로드 오류:', err);
        setError(err);
        message.error(
          '데이터 로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          MessageKeys.VISUALIZATION.LOAD
        );
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [chartType, logger]
  );

  // 날짜 범위가 변경되면 데이터 로드
  useEffect(() => {
    if (dateRange && dateRange[0] && dateRange[1] && !dateRangeLoading) {
      loadVisualizationData(dateRange[0], dateRange[1]);
    }
  }, [dateRange, dateRangeLoading, loadVisualizationData]);

  /**
   * 차트 타입 변경 핸들러
   * @param {string} type - 차트 타입
   */
  const handleChartTypeChange = useCallback(
    (type) => {
      setChartType(type);
      // 데이터가 있고 날짜 범위가 선택된 경우 데이터 다시 로드
      if (dateRange && dateRange[0] && dateRange[1]) {
        loadVisualizationData(dateRange[0], dateRange[1]);
      }
    },
    [dateRange, loadVisualizationData]
  );

  /**
   * 새로고침 핸들러
   */
  const handleRefresh = useCallback(() => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      loadVisualizationData(dateRange[0], dateRange[1]);
    }
  }, [dateRange, loadVisualizationData]);

  /**
   * 유효한 데이터 확인 함수
   * 백엔드 API 응답 구조에 맞게 구현
   */
  const isValidData = useCallback((data, type) => {
    if (!data) return false;

    // 배송 현황 차트 데이터 검증
    if (type === CHART_TYPES.DELIVERY_STATUS) {
      return (
        data.department_breakdown &&
        typeof data.department_breakdown === 'object' &&
        Object.keys(data.department_breakdown).length > 0
      );
    }
    // 시간대별 접수량 차트 데이터 검증
    else if (type === CHART_TYPES.HOURLY_ORDERS) {
      return (
        data.department_breakdown &&
        typeof data.department_breakdown === 'object' &&
        Array.isArray(data.time_slots) &&
        data.time_slots.length > 0
      );
    }

    return false;
  }, []);

  /**
   * 시각화 컴포넌트 렌더링
   * 로딩, 에러, 데이터 없음 상태 처리
   */
  const renderVisualization = useCallback(() => {
    if (loading || dateRangeLoading) {
      return (
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <Spin size="large" tip="데이터 로딩 중..." />
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message="데이터 로드 오류"
          description={
            error.message ||
            '데이터를 불러오는 중 문제가 발생했습니다. 다시 시도해주세요.'
          }
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
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
        />
      );
    }

    // 차트 타입에 따른 컴포넌트 반환
    switch (chartType) {
      case CHART_TYPES.DELIVERY_STATUS:
        return <StatusPieChart data={data} dateRange={dateRange} />;
      case CHART_TYPES.HOURLY_ORDERS:
        return <HourlyBarChart data={data} dateRange={dateRange} />;
      default:
        return <Empty description="지원되지 않는 차트 유형입니다" />;
    }
  }, [
    chartType,
    data,
    dateRange,
    error,
    handleRefresh,
    isValidData,
    loading,
    dateRangeLoading,
  ]);

  return (
    <Layout.Content style={{ padding: '24px', backgroundColor: 'white' }}>
      <Card bordered={false} title="배송 데이터 시각화">
        <div style={{ marginBottom: '24px' }}>
          <Space
            size="large"
            align="center"
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            {/* 차트 선택, 날짜 선택 영역 */}
            <Space size="large">
              <Select
                value={chartType}
                onChange={handleChartTypeChange}
                style={{ width: 200 }}
                size="large"
                disabled={loading}
              >
                {VISUALIZATION_OPTIONS.map((option) => (
                  <Option key={option.value} value={option.value}>
                    <Space>
                      {option.value === CHART_TYPES.DELIVERY_STATUS ? (
                        <PieChartOutlined />
                      ) : (
                        <BarChartOutlined />
                      )}
                      {option.label}
                    </Space>
                  </Option>
                ))}
              </Select>

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
            </Space>

            {/* 새로고침 버튼과 마지막 업데이트 시간 */}
            <Space>
              {lastUpdated && (
                <Text type="secondary">
                  마지막 업데이트: {dayjs(lastUpdated).format('HH:mm:ss')}
                </Text>
              )}
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                disabled={loading || dateRangeLoading}
                loading={loading}
                title="데이터 새로고침"
              >
                새로고침
              </Button>
            </Space>
          </Space>

          {/* 날짜 범위 정보 표시 */}
          <div style={{ marginTop: '8px' }}>
            <DateRangeInfo
              dateRange={availableDateRange}
              loading={dateRangeLoading}
            />
          </div>
        </div>

        {/* 시각화 컴포넌트 */}
        <div className="visualization-content">{renderVisualization()}</div>
      </Card>
    </Layout.Content>
  );
};

export default VisualizationPage;

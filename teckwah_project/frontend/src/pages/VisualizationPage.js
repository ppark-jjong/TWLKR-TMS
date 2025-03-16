// frontend/src/pages/VisualizationPage.js - 리팩토링 버전
import React, { useEffect } from 'react';
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
} from 'antd';
import {
  PieChartOutlined,
  BarChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { CHART_TYPES, VISUALIZATION_OPTIONS } from '../utils/Constants';
import StatusPieCharts from '../components/visualization/StatusPieChart';
import HourlyBarChart from '../components/visualization/HourlyBarChart';
import { useDateRange } from '../utils/useDateRange';
import useVisualizationController from '../controllers/VisualizationPageController';
import LoadingSpin from '../components/common/LoadingSpin';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

/**
 * 리팩토링된 시각화 페이지 컴포넌트
 * 컨트롤러 패턴을 적용하여 UI와 비즈니스 로직 분리
 */
const VisualizationPage = () => {
  // 날짜 범위 관리 커스텀 훅
  const {
    dateRange,
    disabledDate,
    handleDateRangeChange,
    loading: dateRangeLoading,
  } = useDateRange(7); // 기본 7일 범위

  // 시각화 컨트롤러 훅
  const {
    chartType,
    data,
    loading,
    error,
    initialLoad,
    handleChartTypeChange,
    loadVisualizationData,
    handleRefresh,
    isValidData,
  } = useVisualizationController();

  // 날짜 범위가 변경되면 데이터 로드
  useEffect(() => {
    if (dateRange && dateRange[0] && dateRange[1] && !dateRangeLoading) {
      loadVisualizationData(dateRange[0], dateRange[1]);
    }
  }, [dateRange, dateRangeLoading, loadVisualizationData]);

  // 차트 타입이 변경되면 데이터 로드
  useEffect(() => {
    if (
      !initialLoad &&
      !dateRangeLoading &&
      dateRange &&
      dateRange[0] &&
      dateRange[1]
    ) {
      loadVisualizationData(dateRange[0], dateRange[1]);
    }
  }, [
    chartType,
    initialLoad,
    dateRangeLoading,
    dateRange,
    loadVisualizationData,
  ]);

  // 새로고침 핸들러
  const refreshData = () => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      handleRefresh(dateRange[0], dateRange[1]);
    }
  };

  // 시각화 컴포넌트 렌더링
  const renderVisualization = () => {
    if (loading || dateRangeLoading) {
      return <LoadingSpin tip="데이터 로딩 중..." />;
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
          action={
            <Button type="primary" size="small" onClick={refreshData}>
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

    // 차트 타입에 따라 적절한 컴포넌트 반환
    return chartType === CHART_TYPES.DELIVERY_STATUS ? (
      <StatusPieCharts data={data} dateRange={dateRange} />
    ) : (
      <HourlyBarChart data={data} dateRange={dateRange} />
    );
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
              onClick={refreshData}
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

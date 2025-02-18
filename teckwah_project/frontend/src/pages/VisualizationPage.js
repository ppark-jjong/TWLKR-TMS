// frontend/src/pages/VisualizationPage.js
import React, { useState, useEffect } from 'react';
import { Layout, Select, DatePicker, Card, Alert, Typography } from 'antd';
import dayjs from 'dayjs';
import StatusPieChart from '../components/visualization/StatusPieChart';
import HourlyBarChart from '../components/visualization/HourlyBarChart';
import LoadingSpin from '../components/common/LoadingSpin';
import VisualizationService from '../services/VisualizationService';
import { CHART_TYPES, VISUALIZATION_OPTIONS, FONT_STYLES } from '../utils/Constants';
import { formatDateTime } from '../utils/Formatter';
import message, { MessageKeys, MessageTemplates } from '../utils/message';

const { Content } = Layout;
const { RangePicker } = DatePicker;
const { Text } = Typography;

const VisualizationPage = () => {
  const [vizType, setVizType] = useState(CHART_TYPES.DELIVERY_STATUS);
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'day'), dayjs()]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [oldestDate, setOldestDate] = useState(null);

  useEffect(() => {
    fetchOldestDate();
  }, []);

  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      fetchData();
    }
  }, [vizType, dateRange]);

  const fetchOldestDate = async () => {
    const key = MessageKeys.VISUALIZATION.DATE;
    try {
      message.loading('조회 가능 기간 확인 중...', key);
      const date = await VisualizationService.getOldestDataDate();
      setOldestDate(dayjs(date));
      message.loadingToSuccess('조회 가능 기간을 확인했습니다', key);
    } catch (error) {
      message.loadingToError('조회 가능 기간 확인 중 오류가 발생했습니다', key);
    }
  };

  // 날짜 선택 제한 로직
  const disabledDate = (current) => {
    if (!current || !oldestDate) return false;

    // 미래 날짜 비활성화
    if (current.isAfter(dayjs(), 'day')) return true;

    // 가장 오래된 데이터 날짜보다 이전 날짜 비활성화
    if (current.isBefore(oldestDate)) return true;

    // 현재 선택된 날짜 범위 기준으로 1개월 이상 선택 방지
    if (dateRange[0] && dateRange[1]) {
      const isStartDate = current.isSame(dateRange[0], 'day');
      const isEndDate = current.isSame(dateRange[1], 'day');
      
      if (!isStartDate && !isEndDate) {
        // 시작일 기준으로 1개월 이후 날짜 비활성화
        if (dateRange[0] && current.isAfter(dateRange[0].add(1, 'month'))) {
          return true;
        }
        // 종료일 기준으로 1개월 이전 날짜 비활성화
        if (dateRange[1] && current.isBefore(dateRange[1].subtract(1, 'month'))) {
          return true;
        }
      }
    }

    return false;
  };

  const fetchData = async () => {
    const key = MessageKeys.VISUALIZATION.LOAD;
    if (!dateRange[0] || !dateRange[1]) {
      message.warning(MessageTemplates.VISUALIZATION.DATE_INVALID, key);
      return;
    }

    if (dateRange[1].isAfter(dayjs(), 'day')) {
      message.warning(MessageTemplates.VISUALIZATION.FUTURE_DATE, key);
      return;
    }

    try {
      setLoading(true);
      message.loading('데이터 조회 중...', key);
      
      const response = await VisualizationService.getVisualizationData(
        vizType,
        dateRange[0].startOf('day').toDate(),
        dateRange[1].endOf('day').toDate()
      );
      
      setData(response);
      message.loadingToSuccess(MessageTemplates.VISUALIZATION.LOAD_SUCCESS, key);
    } catch (error) {
      message.loadingToError(MessageTemplates.VISUALIZATION.LOAD_FAIL, key);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Content style={{ padding: '12px', backgroundColor: 'white' }}>
      <Card bordered={false} bodyStyle={{ padding: '16px' }}>
        <Alert
          type="info"
          showIcon
          message={
            <div style={FONT_STYLES.BODY.MEDIUM}>
              <Text strong style={FONT_STYLES.BODY.LARGE}>데이터 조회 가능 기간</Text>
              <div style={{ marginTop: '4px' }}>
                {oldestDate && (
                  <>
                    {formatDateTime(oldestDate.toDate())} ~ {formatDateTime(dayjs().toDate())}
                    <Text type="secondary" style={{ marginLeft: '8px' }}>
                      (최대 1개월)
                    </Text>
                  </>
                )}
              </div>
            </div>
          }
          style={{ marginBottom: '16px' }}
        />
        
        <div style={{ 
          marginBottom: 16, 
          display: 'flex', 
          gap: 16, 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <Select
            value={vizType}
            onChange={setVizType}
            style={{ width: 200 }}
            options={VISUALIZATION_OPTIONS}
            size="large"
          />
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            disabledDate={disabledDate}
            allowClear={false}
            style={{ width: 320 }}
            size="large"
          />
        </div>

        {loading ? (
          <LoadingSpin />
        ) : (
          <>
            {vizType === CHART_TYPES.DELIVERY_STATUS && (
              <StatusPieChart data={data} />
            )}
            {vizType === CHART_TYPES.HOURLY_ORDERS && (
              <HourlyBarChart data={data} />
            )}
          </>
        )}
      </Card>
    </Content>
  );
};

export default VisualizationPage;
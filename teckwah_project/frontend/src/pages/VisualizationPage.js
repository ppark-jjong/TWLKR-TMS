// frontend/src/pages/VisualizationPage.js
import React, { useState, useEffect } from 'react';
import { Layout, Select, DatePicker, Card, Typography, Space } from 'antd';
import dayjs from 'dayjs';
import StatusPieChart from '../components/visualization/StatusPieChart';
import HourlyBarChart from '../components/visualization/HourlyBarChart';
import LoadingSpin from '../components/common/LoadingSpin';
import VisualizationService from '../services/VisualizationService';
import DashboardService from '../services/DashboardService';
import { CHART_TYPES, VISUALIZATION_OPTIONS, FONT_STYLES } from '../utils/Constants';
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
      setOldestDate(dayjs(response.oldest_date));
    } catch (error) {
      message.error('조회 가능 기간 확인 중 오류가 발생했습니다');
    }
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

  // 날짜 선택 제한 로직
  const disabledDate = (current) => {
    if (!current || !oldestDate) return false;
    return current.isBefore(oldestDate, 'day') || current.isAfter(dayjs(), 'day');
  };

  return (
    <Content style={{ padding: '12px', backgroundColor: 'white' }}>
      <Card bordered={false} bodyStyle={{ padding: '16px' }}>
        <div style={{ 
          marginBottom: 16, 
          display: 'flex', 
          gap: 16, 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <Space direction="vertical" size={4}>
            <Space size="large">
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
              {oldestDate && (
                <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
                  조회 가능 기간: {oldestDate.format('YYYY-MM-DD')} ~ {dayjs().format('YYYY-MM-DD')}
                </Text>
              )}
            </Space>
          </Space>
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
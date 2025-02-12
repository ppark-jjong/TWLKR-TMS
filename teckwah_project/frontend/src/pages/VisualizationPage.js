// frontend/src/pages/VisualizationPage.js
import React, { useState, useEffect } from 'react';
import { Layout, Select, DatePicker, Card, message } from 'antd';
import dayjs from 'dayjs';
import StatusPieChart from '../components/visualization/StatusPieChart';
import HourlyBarChart from '../components/visualization/HourlyBarChart';
import LoadingSpin from '../components/common/LoadingSpin';
import VisualizationService from '../services/VisualizationService';
import { VISUALIZATION_TYPES } from '../utils/Constants';

const { Content } = Layout;
const { RangePicker } = DatePicker;

/**
 * 시각화 페이지 컴포넌트
 */
const VisualizationPage = () => {
  const [vizType, setVizType] = useState(VISUALIZATION_TYPES.DELIVERY_STATUS);
  const [dateRange, setDateRange] = useState([dayjs(), dayjs()]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // 데이터 조회
  const fetchData = async () => {
    if (!dateRange[0] || !dateRange[1]) return;

    // 날짜 범위 검증
    const days = dateRange[1].diff(dateRange[0], 'days');
    if (days > 31) {
      message.error('조회 기간은 1개월을 초과할 수 없습니다');
      return;
    }

    // 미래 날짜 검증
    if (dateRange[1].isAfter(dayjs(), 'day')) {
      message.error('미래 날짜는 조회할 수 없습니다');
      return;
    }

    try {
      setLoading(true);
      const response = await VisualizationService.getVisualizationData(
        vizType,
        dateRange[0].startOf('day').toDate(),
        dateRange[1].endOf('day').toDate()
      );
      setData(response.data);
    } catch (error) {
      message.error('데이터 조회 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드 및 파라미터 변경 시 재조회
  useEffect(() => {
    fetchData();
  }, [vizType, dateRange]);

  // 시각화 타입 옵션
  const vizTypeOptions = [
    { value: VISUALIZATION_TYPES.DELIVERY_STATUS, label: '배송 현황' },
    { value: VISUALIZATION_TYPES.HOURLY_ORDERS, label: '시간별 접수량' }
  ];

  return (
    <Content style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', gap: 16 }}>
          <Select
            value={vizType}
            onChange={setVizType}
            style={{ width: 200 }}
            options={vizTypeOptions}
          />
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            disabledDate={current => current && current > dayjs().endOf('day')}
            style={{ width: 300 }}
          />
        </div>

        {loading ? (
          <LoadingSpin />
        ) : vizType === VISUALIZATION_TYPES.DELIVERY_STATUS ? (
          <StatusPieChart data={data} />
        ) : (
          <HourlyBarChart data={data} />
        )}
      </Card>
    </Content>
  );
};

export default VisualizationPage;
// frontend/src/pages/VisualizationPage.js
import React, { useState, useEffect } from 'react';
import { Layout, Select, DatePicker, Card, message, Typography } from 'antd';
import dayjs from 'dayjs';
import StatusPieChart from '../components/visualization/StatusPieChart';
import HourlyBarChart from '../components/visualization/HourlyBarChart';
import LoadingSpin from '../components/common/LoadingSpin';
import VisualizationService from '../services/VisualizationService';
import { CHART_TYPES, VISUALIZATION_OPTIONS } from '../utils/Constants';
import { useAuth } from '../contexts/AuthContext';

const { Content } = Layout;
const { RangePicker } = DatePicker;
const { Text } = Typography;

/**
 * @typedef {Object} StatusData
 * @property {string} status - 배송 상태
 * @property {number} count - 건수
 * @property {number} percentage - 비율
 */

/**
 * @typedef {Object} HourlyData
 * @property {number} hour - 시간 (0-23)
 * @property {number} count - 건수
 */

/**
 * @typedef {Object} VisualizationData
 * @property {number} total_count - 전체 건수
 * @property {StatusData[] | HourlyData[]} data - 시각화 데이터
 */

/**
 * 데이터 시각화 페이지 컴포넌트
 * @returns {React.ReactElement} 시각화 페이지 컴포넌트
 */
const VisualizationPage = () => {
  const [vizType, setVizType] = useState(CHART_TYPES.DELIVERY_STATUS);
  const [dateRange, setDateRange] = useState([dayjs(), dayjs()]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [oldestDate, setOldestDate] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    // 가장 오래된 데이터 날짜 조회
    const fetchOldestDate = async () => {
      try {
        const date = await VisualizationService.getOldestDataDate();
        setOldestDate(date);
      } catch (error) {
        console.error('가장 오래된 데이터 날짜 조회 실패:', error);
      }
    };

    fetchOldestDate();
  }, []);

  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      fetchData();
    }
  }, [vizType, dateRange]);

  /**
   * 시각화 데이터 조회
   */
  const fetchData = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      message.error('날짜를 선택해주세요');
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
      setData(response);
    } catch (error) {
      // 백엔드에서 전달한 에러 메시지 표시
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('데이터 조회 중 오류가 발생했습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  const disabledDate = (current) => {
    return current && current > dayjs().endOf('day');
  };

  return (
    <Content style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Select
            value={vizType}
            onChange={(value) => {
              setVizType(value);
              setData(null);
            }}
            style={{ width: 200 }}
            options={VISUALIZATION_OPTIONS}
          />
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            disabledDate={disabledDate}
            style={{ width: 300 }}
          />
          {oldestDate && (
            <Text type="secondary">
              * {oldestDate}부터 데이터 조회 가능
            </Text>
          )}
        </div>

        {loading ? (
          <LoadingSpin />
        ) : (
          <div style={{ height: 400 }}>
            {vizType === CHART_TYPES.DELIVERY_STATUS ? (
              <StatusPieChart data={data} />
            ) : (
              <HourlyBarChart data={data} />
            )}
          </div>
        )}
      </Card>
    </Content>
  );
};

export default VisualizationPage;
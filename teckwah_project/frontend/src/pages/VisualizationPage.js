// frontend/src/pages/VisualizationPage.js
import React, { useState, useEffect } from 'react';
import { Layout, Select, DatePicker, Card, Space } from 'antd';
import dayjs from 'dayjs';
import { PieChartOutlined, BarChartOutlined } from '@ant-design/icons';  
import { CHART_TYPES } from '../utils/Constants';
import DateRangeInfo from '../components/common/DateRangeInfo';
import StatusPieCharts from '../components/visualization/StatusPieChart';
import HourlyBarChart from '../components/visualization/HourlyBarChart';
import VisualizationService from '../services/VisualizationService';
import message from '../utils/message';

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
   try {
     setLoading(true);
     const response = await VisualizationService.getVisualizationData(
       chartType,
       dateRange[0],
       dateRange[1]
     );
     
     setData(response.data);
     setAvailableDateRange(response.date_range);
     
     if (!response.data.total_count) {
       message.info('해당 기간에 데이터가 없습니다');
     }
   } catch (error) {
     message.error('데이터 조회 중 오류가 발생했습니다');
   } finally {
     setLoading(false);
   }
 };

 // 초기 데이터 로드
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
             options={[
               { 
                 value: CHART_TYPES.DELIVERY_STATUS, 
                 label: '배송 현황',
                 icon: <PieChartOutlined />
               },
               { 
                 value: CHART_TYPES.HOURLY_ORDERS, 
                 label: '시간별 접수량',
                 icon: <BarChartOutlined />
               },
             ]}
           />
           <RangePicker
             value={dateRange}
             onChange={handleDateRangeChange}
             style={{ width: 320 }}
             size="large"
             disabled={loading}
             disabledDate={current => current && current.isAfter(dayjs())}
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
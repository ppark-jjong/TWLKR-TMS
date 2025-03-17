// frontend/src/components/visualization/ChartComponents.js
import React from 'react';
import StatusPieChart from './StatusPieChart';
import HourlyBarChart from './HourlyBarChart';

/**
 * 차트 컴포넌트 통합 모듈
 * 여러 시각화 컴포넌트를 한 번에 내보내는 파일
 */

// 개별 컴포넌트 내보내기
export { StatusPieChart, HourlyBarChart };

// 차트 타입에 따른 조건부 렌더링 컴포넌트
export const DynamicChart = ({ type, data, dateRange }) => {
  switch (type) {
    case 'delivery_status':
      return <StatusPieChart data={data} dateRange={dateRange} />;
    case 'hourly_orders':
      return <HourlyBarChart data={data} dateRange={dateRange} />;
    default:
      return <div>지원되지 않는 차트 타입입니다</div>;
  }
};

export default {
  StatusPieChart,
  HourlyBarChart,
  DynamicChart,
};

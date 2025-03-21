// src/components/visualization/VisualizationComponents.js
import React from 'react';
import StatusPieChart from './StatusPieChart';
import HourlyBarChart from './HourlyBarChart';

/**
 * 시각화 컴포넌트 통합 모듈
 * 차트 및 시각화 관련 컴포넌트들을 한 번에 내보내는 중앙 파일
 */

// 개별 컴포넌트 내보내기
export { StatusPieChart, HourlyBarChart };

/**
 * 차트 타입에 따른 동적 차트 렌더링 컴포넌트
 * @param {string} type - 차트 타입 (delivery_status 또는 hourly_orders)
 * @param {Object} data - 차트 데이터
 * @param {Array} dateRange - 날짜 범위
 */
export const DynamicChart = ({ type, data, dateRange }) => {
  switch (type) {
    case 'delivery_status':
      return <StatusPieChart data={data} dateRange={dateRange} />;
    case 'hourly_orders':
      return <HourlyBarChart data={data} dateRange={dateRange} />;
    default:
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>지원되지 않는 차트 타입입니다: {type}</p>
        </div>
      );
  }
};

/**
 * 통계 요약 컴포넌트
 * 차트 데이터의 주요 지표를 간략히 표시
 * @param {Object} data - 차트 데이터
 */
export const StatsSummary = ({ data }) => {
  if (!data || !data.total_count) {
    return null;
  }

  // 배송 현황 데이터인 경우
  if (data.type === 'delivery_status') {
    return (
      <div className="stats-summary">
        <h4>요약 정보</h4>
        <div className="summary-row">
          <div className="summary-item">
            <span className="label">총 건수:</span>
            <span className="value">{data.total_count}</span>
          </div>
          <div className="summary-item">
            <span className="label">부서별:</span>
            <span className="value">
              {Object.entries(data.department_breakdown)
                .map(([dept, info]) => `${dept} (${info.total})`)
                .join(', ')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 시간대별 접수량 데이터인 경우
  if (data.type === 'hourly_orders') {
    return (
      <div className="stats-summary">
        <h4>요약 정보</h4>
        <div className="summary-row">
          <div className="summary-item">
            <span className="label">총 접수량:</span>
            <span className="value">{data.total_count}</span>
          </div>
          <div className="summary-item">
            <span className="label">평균 접수량:</span>
            <span className="value">{data.average_count || 0}</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// 모듈 기본 내보내기
export default {
  StatusPieChart,
  HourlyBarChart,
  DynamicChart,
  StatsSummary,
};

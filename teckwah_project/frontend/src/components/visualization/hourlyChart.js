// frontend/src/components/visualization/hourlyChart.js

/**
 * 시간대별 접수량 막대 차트 컴포넌트
 * 24시간 기준 접수 현황을 시각적으로 표현
 * @module HourlyChart
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { makeStyles, useTheme } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  noData: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    color: theme.palette.text.secondary
  }
}));

const HourlyChart = ({ data }) => {
  const classes = useStyles();
  const theme = useTheme();

  if (!data || !data.hourly_counts) {
    return (
      <div className={classes.noData}>
        데이터가 없습니다.
      </div>
    );
  }

  // 시간대별 데이터 포맷팅
  const chartData = Object.entries(data.hourly_counts).map(([hour, count]) => ({
    hour: `${hour}시`,
    count: count,
    // 시간대별 색상 구분 (심야/주간/저녁)
    timeZone: parseInt(hour) < 6 ? 'night' : 
              parseInt(hour) < 18 ? 'day' : 'evening'
  }));

  // 커스텀 툴팁 컴포넌트
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          border: `1px solid ${theme.palette.divider}`
        }}>
          <p style={{ margin: 0 }}>{`${data.hour}`}</p>
          <p style={{ margin: 0, color: theme.palette.primary.main }}>
            {`접수량: ${data.count}건`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="hour"
          interval={0}
          angle={-45}
          textAnchor="end"
          height={70}
        />
        <YAxis
          label={{ 
            value: '접수량', 
            angle: -90, 
            position: 'insideLeft',
            style: { textAnchor: 'middle' }
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar
          dataKey="count"
          name="시간대별 접수량"
          fill={theme.palette.primary.main}
          // 시간대별 색상 변화
          fillOpacity={(data) => 
            data.timeZone === 'night' ? 0.4 :
            data.timeZone === 'day' ? 0.8 : 0.6
          }
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default HourlyChart;
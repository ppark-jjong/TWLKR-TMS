// frontend/src/components/visualization/statusChart.js

/**
 * 배송 현황 원형 차트 컴포넌트
 * @module StatusChart
 */

import React from 'react';
import { makeStyles } from '@material-ui/core';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const useStyles = makeStyles((theme) => ({
  noData: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    color: theme.palette.text.secondary
  }
}));

const COLORS = {
  WAITING: '#9e9e9e',      // 회색
  IN_PROGRESS: '#ffd54f',  // 노란색
  COMPLETE: '#81c784',     // 초록색
  ISSUE: '#e57373'         // 빨간색
};

const STATUS_LABELS = {
  WAITING: '대기',
  IN_PROGRESS: '진행',
  COMPLETE: '완료',
  ISSUE: '이슈'
};

const StatusChart = ({ data }) => {
  const classes = useStyles();

  if (!data || !data.status_counts) {
    return (
      <div className={classes.noData}>
        데이터가 없습니다.
      </div>
    );
  }

  const chartData = Object.entries(data.status_counts).map(([status, count]) => ({
    name: STATUS_LABELS[status],
    value: count,
    status: status
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={150}
          label={({
            cx,
            cy,
            midAngle,
            innerRadius,
            outerRadius,
            percent,
            name
          }) => {
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
            const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
            return (
              <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {`${name} ${(percent * 100).toFixed(1)}%`}
              </text>
            );
          }}
        >
          {chartData.map((entry, index) => (
            <Cell 
              key={index} 
              fill={COLORS[entry.status]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [
            `${value}건 (${((value / data.total) * 100).toFixed(1)}%)`,
            name
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default StatusChart;
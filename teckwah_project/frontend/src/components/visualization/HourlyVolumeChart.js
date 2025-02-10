// src/components/visualization/HourlyVolumeChart.js
import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * 시간대별 접수량 막대그래프 컴포넌트
 * @param {Object} props
 * @param {Object} props.data - 시간대별 접수량 데이터
 * @returns {JSX.Element} 막대그래프 컴포넌트
 */
function HourlyVolumeChart({ data }) {
  if (!data || !data.hourly_counts) return null;

  const chartData = data.hourly_counts.map((item) => ({
    name: `${String(item.hour).padStart(2, "0")}:00`,
    value: item.count,
  }));

  return (
    <Paper sx={{ p: 2, height: "400px" }}>
      <Typography variant="h6" gutterBottom>
        시간대별 접수량
      </Typography>
      <Typography variant="subtitle2" gutterBottom color="text.secondary">
        총 {data.total}건
      </Typography>
      <Box sx={{ width: "100%", height: "calc(100% - 60px)" }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value}건`, "접수량"]} />
            <Bar dataKey="value" fill="#1976d2" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}

export default HourlyVolumeChart;

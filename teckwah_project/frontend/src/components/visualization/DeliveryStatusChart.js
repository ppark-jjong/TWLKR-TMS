// src/components/visualization/DeliveryStatusChart.js
import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { DELIVERY_STATUS_MAP, STATUS_COLORS } from "../../utils/constants";

/**
 * 배송 현황 원그래프 컴포넌트
 * @param {Object} props
 * @param {Object} props.data - 배송 현황 데이터
 * @returns {JSX.Element} 원그래프 컴포넌트
 */
function DeliveryStatusChart({ data }) {
  if (!data || !data.status_counts) return null;

  const chartData = data.status_counts.map((item) => ({
    name: DELIVERY_STATUS_MAP[item.status],
    value: item.count,
    ratio: item.ratio,
  }));

  return (
    <Paper sx={{ p: 2, height: "400px" }}>
      <Typography variant="h6" gutterBottom>
        배송 현황
      </Typography>
      <Typography variant="subtitle2" gutterBottom color="text.secondary">
        총 {data.total}건
      </Typography>
      <Box sx={{ width: "100%", height: "calc(100% - 60px)" }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={({ name, ratio }) => `${name} (${ratio.toFixed(1)}%)`}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    STATUS_COLORS[
                      Object.keys(DELIVERY_STATUS_MAP).find(
                        (key) => DELIVERY_STATUS_MAP[key] === entry.name
                      )
                    ]
                  }
                />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value}건`, name]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
export default DeliveryStatusChart;

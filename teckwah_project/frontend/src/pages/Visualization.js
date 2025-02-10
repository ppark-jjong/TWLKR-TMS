// src/pages/Visualization.js
import React, { useState, useEffect } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
} from "@mui/material";
import { format } from "date-fns";
import { visualizationService } from "../services/visualizationService";
import DateRangePicker from "../components/visualization/DateRangePicker";
import DeliveryStatusChart from "../components/visualization/DeliveryStatusChart";
import HourlyVolumeChart from "../components/visualization/HourlyVolumeChart";

const VISUALIZATION_TYPES = {
  DELIVERY_STATUS: "배송 현황",
  HOURLY_VOLUME: "시간별 접수량",
};

/**
 * 시각화 페이지 컴포넌트
 * @returns {JSX.Element} Visualization 컴포넌트
 */
function Visualization() {
  const [visualizationType, setVisualizationType] = useState("DELIVERY_STATUS");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!startDate || !endDate) return;

    const formattedStartDate = format(startDate, "yyyy-MM-dd");
    const formattedEndDate = format(endDate, "yyyy-MM-dd");

    try {
      let response;
      if (visualizationType === "DELIVERY_STATUS") {
        response = await visualizationService.getDeliveryStatus(
          formattedStartDate,
          formattedEndDate
        );
      } else {
        response = await visualizationService.getHourlyVolume(
          formattedStartDate,
          formattedEndDate
        );
      }
      setData(response);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      loadData();
    }
  }, [visualizationType, startDate, endDate]);

  const handleStartDateChange = (date) => {
    setStartDate(date);
    if (!endDate) {
      setEndDate(date);
    }
  };

  const handleEndDateChange = (date) => {
    setEndDate(date);
    if (!startDate) {
      setStartDate(date);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>시각화 유형</InputLabel>
          <Select
            value={visualizationType}
            label="시각화 유형"
            onChange={(e) => setVisualizationType(e.target.value)}
          >
            {Object.entries(VISUALIZATION_TYPES).map(([key, value]) => (
              <MenuItem key={key} value={key}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
      />

      {data && (
        <Box sx={{ mt: 3 }}>
          {visualizationType === "DELIVERY_STATUS" ? (
            <DeliveryStatusChart data={data} />
          ) : (
            <HourlyVolumeChart data={data} />
          )}
        </Box>
      )}

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Visualization;

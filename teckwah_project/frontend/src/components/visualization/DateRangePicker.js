// src/components/visualization/DateRangePicker.js
import React from "react";
import { Box, TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { addMonths, isBefore } from "date-fns";

/**
 * 날짜 범위 선택 컴포넌트
 * @param {Object} props
 * @param {Date} props.startDate - 시작일
 * @param {Date} props.endDate - 종료일
 * @param {Function} props.onStartDateChange - 시작일 변경 핸들러
 * @param {Function} props.onEndDateChange - 종료일 변경 핸들러
 * @returns {JSX.Element} 날짜 범위 선택 컴포넌트
 */
function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) {
  const maxDate = new Date();
  const minDate = addMonths(maxDate, -1);

  const validateDate = (date) => {
    return !date || (isBefore(date, maxDate) && isBefore(minDate, date));
  };

  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
      <DatePicker
        label="시작일"
        value={startDate}
        onChange={onStartDateChange}
        maxDate={endDate || maxDate}
        minDate={minDate}
        shouldDisableDate={(date) => !validateDate(date)}
        renderInput={(params) => (
          <TextField {...params} helperText="최근 1개월 내 선택" />
        )}
      />
      <DatePicker
        label="종료일"
        value={endDate}
        onChange={onEndDateChange}
        maxDate={maxDate}
        minDate={startDate || minDate}
        shouldDisableDate={(date) => !validateDate(date)}
        renderInput={(params) => (
          <TextField {...params} helperText="최근 1개월 내 선택" />
        )}
      />
    </Box>
  );
}

export default DateRangePicker;

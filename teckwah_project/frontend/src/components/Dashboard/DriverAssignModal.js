// src/components/dashboard/DriverAssignModal.js
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box,
} from "@mui/material";

/**
 * 기사 배차 모달
 * @param {Object} props
 * @param {boolean} props.open - 모달 표시 여부
 * @param {Function} props.onClose - 닫기 핸들러
 * @param {Array} props.selectedOrders - 선택된 주문 번호 목록
 * @param {Array} props.drivers - 기사 목록
 * @param {Function} props.onAssign - 배차 핸들러
 * @returns {JSX.Element} 배차 모달
 */
function DriverAssignModal({
  open,
  onClose,
  selectedOrders,
  drivers,
  onAssign,
}) {
  const [driverId, setDriverId] = useState("");
  const [remark, setRemark] = useState("");
  const selectedDriver = drivers?.find((d) => d.driver_id === driverId);

  const handleSubmit = (e) => {
    e.preventDefault();
    onAssign({
      driverId,
      driverRemark: remark,
    });
    setDriverId("");
    setRemark("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>기사 배차</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              선택된 주문
            </Typography>
            <Typography>{selectedOrders.join(", ")}</Typography>
          </Box>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>기사 선택</InputLabel>
            <Select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              required
              label="기사 선택"
            >
              {drivers?.map((driver) => (
                <MenuItem key={driver.driver_id} value={driver.driver_id}>
                  {driver.driver_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedDriver?.driver_name === "기타" && (
            <TextField
              fullWidth
              required
              label="기사 메모"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              multiline
              rows={3}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>취소</Button>
          <Button type="submit" variant="contained">
            배차
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default DriverAssignModal;

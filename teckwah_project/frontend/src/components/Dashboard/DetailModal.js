// src/components/dashboard/DetailModal.js
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
} from "@mui/material";
import { DELIVERY_STATUS, DELIVERY_STATUS_MAP } from "../../utils/constants";
import { formatDateTime } from "../../utils/dateUtils";

/**
 * 대시보드 상세 정보 모달
 * @param {Object} props
 * @param {boolean} props.open - 모달 표시 여부
 * @param {Function} props.onClose - 닫기 핸들러
 * @param {Object} props.data - 상세 정보 데이터
 * @param {Function} props.onStatusChange - 상태 변경 핸들러
 * @param {Function} props.onRemarkChange - 메모 변경 핸들러
 * @returns {JSX.Element} 상세 정보 모달
 */
function DetailModal({ open, onClose, data, onStatusChange, onRemarkChange }) {
  const [remark, setRemark] = useState(data?.remark || "");
  const [status, setStatus] = useState(data?.status || "");

  const handleRemarkSave = () => {
    onRemarkChange(remark);
  };

  const handleStatusChange = (event) => {
    const newStatus = event.target.value;
    setStatus(newStatus);
    onStatusChange(newStatus);
  };

  if (!data) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>배송 상세 정보</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={4}>
            <Typography variant="subtitle2">종류</Typography>
            <Typography>{data.type}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2">부서</Typography>
            <Typography>{data.department}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2">출발 허브</Typography>
            <Typography>{data.warehouse}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2">담당 기사</Typography>
            <Typography>{data.driver_name || "-"}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2">기사 연락처</Typography>
            <Typography>{data.driver_contact || "-"}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2">Order No</Typography>
            <Typography>{data.order_no}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2">ETA</Typography>
            <Typography>{formatDateTime(new Date(data.eta))}</Typography>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>배송 상태</InputLabel>
              <Select value={status} onChange={handleStatusChange}>
                {Object.entries(DELIVERY_STATUS_MAP).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2">접수 시각</Typography>
            <Typography>
              {formatDateTime(new Date(data.create_time))}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2">주소</Typography>
            <Typography>{data.address}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2">거리</Typography>
            <Typography>{data.distance}km</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2">예상 소요 시간</Typography>
            <Typography>{data.duration_time}분</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2">수령인</Typography>
            <Typography>{data.customer}</Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="메모"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleRemarkSave}>메모 저장</Button>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}

export default DetailModal;

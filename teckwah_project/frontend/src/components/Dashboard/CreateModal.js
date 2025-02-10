// src/components/dashboard/CreateModal.js
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Alert,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";

/**
 * 대시보드 생성 모달 컴포넌트
 * @param {Object} props
 * @param {boolean} props.open - 모달 표시 여부
 * @param {Function} props.onClose - 닫기 핸들러
 * @param {Function} props.onCreate - 생성 핸들러
 * @param {string} props.userDepartment - 사용자 부서
 * @returns {JSX.Element} 생성 모달
 */
function CreateModal({ open, onClose, onCreate, userDepartment }) {
  const [formData, setFormData] = useState({
    type: "",
    order_no: "",
    warehouse: "",
    sla: "",
    postal_code: "",
    address: "",
    customer: "",
    contact: "",
    remark: "",
  });
  const [eta, setEta] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // 우편번호 유효성 검증
    if (!/^\d{5}$/.test(formData.postal_code)) {
      setError("우편번호는 5자리 숫자여야 합니다.");
      return;
    }
    try {
      await onCreate({
        ...formData,
        department: userDepartment,
        eta: eta.toISOString(),
      });
      handleClose();
    } catch (err) {
      setError(err.response?.data?.detail || "대시보드 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: "",
      order_no: "",
      warehouse: "",
      sla: "",
      postal_code: "",
      address: "",
      customer: "",
      contact: "",
      remark: "",
    });
    setEta(new Date());
    setError("");
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        elevation: 3,
        sx: { borderRadius: 1 }
      }}
    >
      <DialogTitle>
        <Typography variant="h6">대시보드 생성</Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>종류</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  label="종류"
                >
                  <MenuItem value="DELIVERY">DELIVERY</MenuItem>
                  <MenuItem value="RETURN">RETURN</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                size="small"
                fullWidth
                required
                label="Order No"
                value={formData.order_no}
                onChange={(e) => setFormData(prev => ({ ...prev, order_no: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>출발 허브</InputLabel>
                <Select
                  value={formData.warehouse}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouse: e.target.value }))}
                  label="출발 허브"
                >
                  <MenuItem value="SEOUL">SEOUL</MenuItem>
                  <MenuItem value="BUSAN">BUSAN</MenuItem>
                  <MenuItem value="GWANGJU">GWANGJU</MenuItem>
                  <MenuItem value="DAEJEON">DAEJEON</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>SLA</InputLabel>
                <Select
                  value={formData.sla}
                  onChange={(e) => setFormData(prev => ({ ...prev, sla: e.target.value }))}
                  label="SLA"
                >
                  <MenuItem value="XHR">XHR</MenuItem>
                  <MenuItem value="POX">POX</MenuItem>
                  <MenuItem value="EMC">EMC</MenuItem>
                  <MenuItem value="WEWORK">WEWORK</MenuItem>
                  <MenuItem value="LENOVO">LENOVO</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <DateTimePicker
                label="ETA"
                value={eta}
                onChange={setEta}
                ampm={false}
                format="YYYY-MM-DD HH:mm"
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    required: true
                  }
                }}
                views={['year', 'month', 'day', 'hours', 'minutes']}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                size="small"
                fullWidth
                required
                label="우편번호"
                value={formData.postal_code}
                onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                inputProps={{ maxLength: 5 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                size="small"
                fullWidth
                required
                label="도착주소"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                size="small"
                fullWidth
                required
                label="수령인"
                value={formData.customer}
                onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                size="small"
                fullWidth
                required
                label="연락처"
                value={formData.contact}
                onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                size="small"
                fullWidth
                label="메모"
                multiline
                rows={3}
                value={formData.remark}
                onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose}>취소</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={loading}
          >
            {loading ? '생성 중...' : '생성'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default CreateModal;
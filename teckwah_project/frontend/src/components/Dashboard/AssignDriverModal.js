// frontend/src/components/dashboard/assignDriverModal.js

/**
 * 기사 배차를 위한 모달 컴포넌트
 * 기사 선택 및 메모 입력 기능 제공
 * @module AssignDriverModal
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  makeStyles,
  MenuItem
} from '@material-ui/core';
import DashboardService from '../../services/dashboardService';

const useStyles = makeStyles((theme) => ({
  content: {
    minWidth: 400,
    padding: theme.spacing(2)
  },
  orderList: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  }
}));

const AssignDriverModal = ({ open, onClose, onSuccess, selectedIds }) => {
  const classes = useStyles();
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await DashboardService.getDrivers();
      setDrivers(response.data);
    } catch (error) {
      setError('기사 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedDriver) {
      setError('기사를 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await DashboardService.assignDriver(selectedIds, selectedDriver, remark);
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.detail || '기사 배차 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>기사 배차</DialogTitle>
      <DialogContent className={classes.content}>
        <TextField
          select
          fullWidth
          label="기사 선택"
          value={selectedDriver}
          onChange={(e) => setSelectedDriver(e.target.value)}
          margin="normal"
        >
          {drivers.map((driver) => (
            <MenuItem key={driver.driver_id} value={driver.driver_id}>
              {driver.driver_name}
            </MenuItem>
          ))}
        </TextField>

        {selectedDriver && drivers.find(d => d.driver_id === selectedDriver)?.driver_name === '기타' && (
          <TextField
            fullWidth
            label="메모"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />
        )}

        <div className={classes.orderList}>
          <Typography variant="subtitle2">선택된 주문:</Typography>
          <Typography variant="body2" color="textSecondary">
            {selectedIds.join(', ')}
          </Typography>
        </div>

        {error && (
          <Typography color="error">{error}</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={loading}
        >
          배차
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignDriverModal;
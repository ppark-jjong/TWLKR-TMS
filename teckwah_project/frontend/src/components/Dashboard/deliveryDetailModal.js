// frontend/src/components/dashboard/deliveryDetailModal.js

/**
 * 배송 상세 정보 조회 및 상태 관리 모달
 * @module DeliveryDetailModal
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  MenuItem,
  makeStyles
} from '@material-ui/core';
import { format } from 'date-fns';
import DashboardService from '../../services/dashboardService';

const useStyles = makeStyles((theme) => ({
  content: {
    minWidth: 600,
    padding: theme.spacing(2)
  },
  label: {
    fontWeight: 'bold',
    color: theme.palette.text.secondary
  },
  value: {
    marginBottom: theme.spacing(2)
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`
  }
}));

const STATUS_OPTIONS = [
  { value: 'WAITING', label: '대기' },
  { value: 'IN_PROGRESS', label: '진행' },
  { value: 'COMPLETE', label: '완료' },
  { value: 'ISSUE', label: '이슈' }
];

const DeliveryDetailModal = ({ open, onClose, delivery, onUpdate }) => {
  const classes = useStyles();
  const [status, setStatus] = useState(delivery.status);
  const [remark, setRemark] = useState(delivery.remark || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    setError('');

    try {
      await DashboardService.updateStatus(delivery.dashboard_id, newStatus);
      setStatus(newStatus);
      onUpdate();
    } catch (error) {
      setError('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemarkUpdate = async () => {
    setLoading(true);
    setError('');

    try {
      await DashboardService.updateRemark(delivery.dashboard_id, remark);
      onUpdate();
    } catch (error) {
      setError('메모 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const InfoItem = ({ label, value }) => (
    <Grid item xs={6}>
      <Typography variant="caption" className={classes.label}>
        {label}
      </Typography>
      <Typography variant="body1" className={classes.value}>
        {value || '-'}
      </Typography>
    </Grid>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md">
      <DialogTitle>배송 상세 정보</DialogTitle>
      <DialogContent className={classes.content}>
        <Grid container spacing={2}>
          <InfoItem label="종류" value={delivery.type} />
          <InfoItem label="부서" value={delivery.department} />
          <InfoItem label="출발 허브" value={delivery.warehouse} />
          <InfoItem label="담당 기사" value={delivery.driver_name} />
          <InfoItem 
            label="ETA" 
            value={format(new Date(delivery.eta), 'yyyy-MM-dd HH:mm')} 
          />
          <InfoItem label="Order No" value={delivery.order_no} />
          <InfoItem 
            label="생성 시각" 
            value={format(new Date(delivery.create_time), 'yyyy-MM-dd HH:mm')} 
          />
          <InfoItem label="주소" value={delivery.address} />
          <InfoItem label="수령인" value={delivery.customer} />
          <InfoItem label="연락처" value={delivery.contact} />

          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="배송 상태"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={loading}
              margin="normal"
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="메모"
              multiline
              rows={4}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              margin="normal"
            />
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Typography color="error">{error}</Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions className={classes.actions}>
        <Button onClick={onClose} disabled={loading}>
          닫기
        </Button>
        <Button
          onClick={handleRemarkUpdate}
          color="primary"
          variant="contained"
          disabled={loading}
        >
          메모 저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeliveryDetailModal;
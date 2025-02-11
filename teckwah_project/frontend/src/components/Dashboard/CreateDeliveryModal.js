// frontend/src/components/dashboard/CreateDeliveryModal.js

/**
 * 새로운 배송 등록을 위한 모달 컴포넌트
 * 사용자 입력 검증 및 데이터 전송 처리
 * @module CreateDeliveryModal
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
  MenuItem,
  makeStyles
} from '@material-ui/core';
import { DateTimePicker } from '@material-ui/pickers';
import DashboardService from '../../services/dashboard.service';

const useStyles = makeStyles((theme) => ({
  content: {
    minWidth: 500,
    padding: theme.spacing(2)
  },
  field: {
    marginBottom: theme.spacing(2)
  }
}));

const DELIVERY_TYPES = ['DELIVERY', 'RETURN'];
const WAREHOUSES = ['SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON'];
const SLA_TYPES = ['XHR', 'POX', 'EMC', 'WEWORK', 'LENOVO'];

const CreateDeliveryModal = ({ open, onClose, onSuccess }) => {
  const classes = useStyles();
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    type: '',
    order_no: '',
    department: currentUser.user_department,
    warehouse: '',
    sla: '',
    eta: new Date(),
    postal_code: '',
    address: '',
    customer: '',
    contact: '',
    remark: ''
  });

  const handleChange = (name) => (event) => {
    setFormData({
      ...formData,
      [name]: event.target.value
    });
  };

  const validateForm = () => {
    const required = ['type', 'order_no', 'warehouse', 'sla', 'postal_code', 'address', 'customer', 'contact'];
    const missing = required.filter(field => !formData[field]);
    if (missing.length > 0) {
      setError('필수 항목을 모두 입력해주세요.');
      return false;
    }
    if (formData.postal_code.length !== 5 || !/^\d+$/.test(formData.postal_code)) {
      setError('올바른 우편번호 형식이 아닙니다.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      await DashboardService.create(formData);
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.detail || '배송 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md">
      <DialogTitle>새로운 배송 등록</DialogTitle>
      <DialogContent className={classes.content}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              select
              fullWidth
              label="종류"
              value={formData.type}
              onChange={handleChange('type')}
              className={classes.field}
              required
            >
              {DELIVERY_TYPES.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Order No"
              value={formData.order_no}
              onChange={handleChange('order_no')}
              className={classes.field}
              required
            />
          </Grid>
          {/* 나머지 필드들도 동일한 패턴으로 구현 */}
          {error && (
            <Grid item xs={12}>
              <Typography color="error">{error}</Typography>
            </Grid>
          )}
        </Grid>
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
          등록
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDeliveryModal;
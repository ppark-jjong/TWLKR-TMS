// frontend/src/pages/dashboardPage.js

/**
 * 대시보드 메인 페이지 컴포넌트
 * 배송 현황 관리 및 데이터 처리 담당
 */

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  makeStyles,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Grid,
  MenuItem,
  Snackbar
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  LocalShipping as AssignIcon
} from '@material-ui/icons';
import { DatePicker } from '@material-ui/pickers';
import DeliveryTable from '../components/dashboard/deliveryTable';
import CreateDeliveryModal from '../components/dashboard/createDeliveryModal';
import AssignDriverModal from '../components/dashboard/assignDriverModal';
import DeliveryDetailModal from '../components/dashboard/deliveryDetailModal';
import DashboardService from '../services/dashboard.service';
import { formatDate } from '../utils/date.utils';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    height: '100vh',
    display: 'flex',
    flexDirection: 'column'  
  },
  header: {
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(2)
  },
  filters: {
    display: 'flex',
    gap: theme.spacing(2),
    alignItems: 'center'
  },
  tableContainer: {
    flexGrow: 1,
    overflow: 'hidden'  }
}));

const DashboardPage = () => {
  const classes = useStyles();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [deliveries, setDeliveries] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [department, setDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const data = await DashboardService.getList(formattedDate);
      setDeliveries(data);
    } catch (error) {
      setError('배송 목록 조회 중 오류가 발생했습니다.');
      setSnackbar({
        open: true,
        message: '데이터 조회 실패',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedItems([]);
  };

  const handleRefresh = () => {
    fetchDeliveries();
    setSelectedItems([]);
  };

  const handleCreateSuccess = () => {
    setOpenCreate(false);
    setSnackbar({
      open: true,
      message: '배송이 성공적으로 등록되었습니다.',
      severity: 'success'
    });
    fetchDeliveries();
  };

  const handleAssignSuccess = () => {
    setOpenAssign(false);
    setSnackbar({
      open: true,
      message: '기사 배차가 완료되었습니다.',
      severity: 'success'
    });
    fetchDeliveries();
    setSelectedItems([]);
  };

  const handleDelete = async () => {
    if (!window.confirm('선택한 항목을 삭제하시겠습니까?')) return;
    
    try {
      await DashboardService.deleteMultiple(selectedItems);
      setSnackbar({
        open: true,
        message: '선택한 항목이 삭제되었습니다.',
        severity: 'success'
      });
      fetchDeliveries();
      setSelectedItems([]);
    } catch (error) {
      setSnackbar({
        open: true,
        message: '삭제 처리 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  const filteredDeliveries = deliveries
    .filter(delivery => 
      department === 'all' || delivery.department === department
    )
    .filter(delivery =>
      searchTerm === '' || 
      delivery.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className={classes.root}>
      <Paper className={classes.header}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <div className={classes.filters}>
              <DatePicker
                variant="inline"
                format="yyyy-MM-dd"
                value={selectedDate}
                onChange={handleDateChange}
                autoOk
                disableToolbar
              />
              <TextField
                select
                label="부서"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                variant="outlined"
                size="small"
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="CS">CS</MenuItem>
                <MenuItem value="HES">HES</MenuItem>
                <MenuItem value="LENOVO">LENOVO</MenuItem>
              </TextField>
              <TextField
                label="검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="outlined"
                size="small"
              />
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div className={classes.actions}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenCreate(true)}
              >
                신규 등록
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AssignIcon />}
                onClick={() => setOpenAssign(true)}
                disabled={selectedItems.length === 0}
              >
                기사 배차
              </Button>
              <IconButton onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
              <IconButton
                onClick={handleDelete}
                disabled={selectedItems.length === 0}
              >
                <DeleteIcon />
              </IconButton>
            </div>
          </Grid>
        </Grid>
      </Paper>

      <div className={classes.tableContainer}>
        <DeliveryTable
          deliveries={filteredDeliveries}
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
          onRowClick={(delivery) => {
            setSelectedDelivery(delivery);
            setOpenDetail(true);
          }}
          loading={loading}
          error={error}
        />
      </div>

      {openCreate && (
        <CreateDeliveryModal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {openAssign && (
        <AssignDriverModal
          open={openAssign}
          onClose={() => setOpenAssign(false)}
          onSuccess={handleAssignSuccess}
          selectedIds={selectedItems}
        />
      )}

      {openDetail && selectedDelivery && (
        <DeliveryDetailModal
          open={openDetail}
          onClose={() => {
            setOpenDetail(false);
            setSelectedDelivery(null);
          }}
          delivery={selectedDelivery}
          onUpdate={fetchDeliveries}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default DashboardPage;
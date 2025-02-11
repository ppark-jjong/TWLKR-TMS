// frontend/src/pages/DashboardPage.js

/**
 * 대시보드 메인 페이지 컴포넌트
 * 배송 현황 리스트와 관련 기능을 총괄 관리
 * @module DashboardPage
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  makeStyles,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Grid,
  MenuItem
} from '@material-ui/core';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  DriveEta as AssignIcon
} from '@material-ui/icons';
import DeliveryTable from '../components/dashboard/DeliveryTable';
import CreateDeliveryModal from '../components/dashboard/CreateDeliveryModal';
import AssignDriverModal from '../components/dashboard/AssignDriverModal';
import DeliveryDetailModal from '../components/dashboard/DeliveryDetailModal';
import DashboardService from '../services/dashboardService';
import { DatePicker } from '@material-ui/pickers';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3)
  },
  header: {
    marginBottom: theme.spacing(3),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(2)
  },
  filters: {
    display: 'flex',
    gap: theme.spacing(2),
    alignItems: 'center'
  }
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

  useEffect(() => {
    fetchDeliveries();
  }, [selectedDate]);

  const fetchDeliveries = async () => {
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const data = await DashboardService.getList(formattedDate);
      setDeliveries(data);
    } catch (error) {
      console.error('배송 목록 조회 실패:', error);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleRefresh = () => {
    fetchDeliveries();
  };

  const handleCreateSuccess = () => {
    setOpenCreate(false);
    fetchDeliveries();
  };

  const handleAssignSuccess = () => {
    setOpenAssign(false);
    fetchDeliveries();
    setSelectedItems([]);
  };

  const handleDelete = async () => {
    if (!window.confirm('선택한 항목을 삭제하시겠습니까?')) return;
    try {
      await DashboardService.deleteMultiple(selectedItems);
      fetchDeliveries();
      setSelectedItems([]);
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  // 검색과 필터링된 데이터 계산
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
        <Grid container spacing={2} alignItems="center">
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

      <DeliveryTable
        deliveries={filteredDeliveries}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        onRowClick={(delivery) => {
          setSelectedDelivery(delivery);
          setOpenDetail(true);
        }}
      />

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
    </div>
  );
};

export default DashboardPage;
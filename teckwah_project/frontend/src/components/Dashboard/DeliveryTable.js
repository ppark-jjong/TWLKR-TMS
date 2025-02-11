// frontend/src/components/dashboard/deliveryTable.js

import React from 'react';
import {
  makeStyles,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  Typography
} from '@material-ui/core';
import { formatDateTime } from '../../utils/date.utils';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    position: 'relative'
  },
  container: {
    maxHeight: 'calc(100vh - 250px)', // 헤더와 필터 영역을 고려한 높이
    overflowY: 'auto'
  },
  stickyHeader: {
    position: 'sticky',
    top: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: 1
  },
  noData: {
    padding: theme.spacing(3),
    textAlign: 'center',
    color: theme.palette.text.secondary
  },
  waitingRow: {
    backgroundColor: theme.palette.grey[100]
  },
  inProgressRow: {
    backgroundColor: theme.palette.warning.light
  },
  completeRow: {
    backgroundColor: theme.palette.success.light
  },
  issueRow: {
    backgroundColor: theme.palette.error.light
  }
}));

const DeliveryTable = ({
  deliveries,
  selectedItems,
  onSelectionChange,
  onRowClick,
  loading,
  error
}) => {
  const classes = useStyles();

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const waitingDeliveries = deliveries
        .filter(d => d.status === 'WAITING')
        .map(d => d.dashboard_id);
      onSelectionChange(waitingDeliveries);
      return;
    }
    onSelectionChange([]);
  };

  const handleSelect = (id) => {
    const selectedIndex = selectedItems.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedItems, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedItems.slice(1));
    } else if (selectedIndex === selectedItems.length - 1) {
      newSelected = newSelected.concat(selectedItems.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedItems.slice(0, selectedIndex),
        selectedItems.slice(selectedIndex + 1),
      );
    }

    onSelectionChange(newSelected);
  };

  if (loading) {
    return (
      <Paper className={classes.noData}>
        <Typography variant="body1">데이터를 불러오는 중입니다...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper className={classes.noData}>
        <Typography variant="body1" color="error">{error}</Typography>
      </Paper>
    );
  }

  if (!deliveries || deliveries.length === 0) {
    return (
      <Paper className={classes.noData}>
        <Typography variant="body1">조회되는 데이터가 없습니다.</Typography>
      </Paper>
    );
  }

  return (
    <Paper className={classes.root}>
      <TableContainer className={classes.container}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" className={classes.stickyHeader}>
                <Checkbox
                  indeterminate={selectedItems.length > 0 && selectedItems.length < deliveries.length}
                  checked={deliveries.length > 0 && selectedItems.length === deliveries.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell className={classes.stickyHeader}>종류</TableCell>
              <TableCell className={classes.stickyHeader}>부서</TableCell>
              <TableCell className={classes.stickyHeader}>출발 허브</TableCell>
              <TableCell className={classes.stickyHeader}>담당 기사</TableCell>
              <TableCell className={classes.stickyHeader}>Order No</TableCell>
              <TableCell className={classes.stickyHeader}>생성시간</TableCell>
              <TableCell className={classes.stickyHeader}>출발 시각</TableCell>
              <TableCell className={classes.stickyHeader}>ETA</TableCell>
              <TableCell className={classes.stickyHeader}>배송 상태</TableCell>
              <TableCell className={classes.stickyHeader}>도착 지역</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deliveries.map((delivery) => (
              <TableRow
                hover
                onClick={() => onRowClick(delivery)}
                key={delivery.dashboard_id}
                className={classes[`${delivery.status.toLowerCase()}Row`]}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.indexOf(delivery.dashboard_id) !== -1}
                    onChange={() => handleSelect(delivery.dashboard_id)}
                    disabled={delivery.status !== 'WAITING'}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                <TableCell>{delivery.type}</TableCell>
                <TableCell>{delivery.department}</TableCell>
                <TableCell>{delivery.warehouse}</TableCell>
                <TableCell>{delivery.driver_name || '-'}</TableCell>
                <TableCell>{delivery.order_no}</TableCell>
                <TableCell>{formatDateTime(delivery.create_time)}</TableCell>
                <TableCell>{delivery.depart_time ? formatDateTime(delivery.depart_time) : '-'}</TableCell>
                <TableCell>{formatDateTime(delivery.eta)}</TableCell>
                <TableCell>{formatDeliveryStatus(delivery.status)}</TableCell>
                <TableCell>{delivery.region}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default DeliveryTable;
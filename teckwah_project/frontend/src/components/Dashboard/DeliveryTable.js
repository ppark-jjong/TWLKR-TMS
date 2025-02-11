// frontend/src/components/dashboard/DeliveryTable.js

/**
 * 배송 현황 테이블 컴포넌트
 * 데이터 상태 관리 및 에러 처리 포함
 * @module DeliveryTable
 */

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
  Paper
} from '@material-ui/core';
import { format } from 'date-fns';
import ErrorDisplay from '../common/ErrorDisplay';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    marginTop: theme.spacing(3)
  },
  table: {
    minWidth: 750
  },
  tableHead: {
    backgroundColor: theme.palette.grey[100],
    position: 'sticky',
    top: 64, // AppBar 높이 + 필터 영역 높이
    zIndex: 1
  },
  statusCell: {
    fontWeight: 'bold'
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

const getStatusText = (status) => {
  const statusMap = {
    'WAITING': '대기',
    'IN_PROGRESS': '진행',
    'COMPLETE': '완료',
    'ISSUE': '이슈'
  };
  return statusMap[status] || status;
};

const getRowStyle = (status, classes) => {
  const styleMap = {
    'WAITING': classes.waitingRow,
    'IN_PROGRESS': classes.inProgressRow,
    'COMPLETE': classes.completeRow,
    'ISSUE': classes.issueRow
  };
  return styleMap[status] || '';
};

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

  // 에러 상태 및 로딩 상태 처리
  if (loading || error || deliveries.length === 0) {
    return (
      <ErrorDisplay
        loading={loading}
        error={error}
        noData={!loading && !error && deliveries.length === 0}
      />
    );
  }

  return (
    <Paper className={classes.root}>
      <TableContainer>
        <Table className={classes.table} size="small">
          <TableHead className={classes.tableHead}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedItems.length > 0 && selectedItems.length < deliveries.length}
                  checked={deliveries.length > 0 && selectedItems.length === deliveries.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>종류</TableCell>
              <TableCell>부서</TableCell>
              <TableCell>출발 허브</TableCell>
              <TableCell>담당 기사</TableCell>
              <TableCell>Order No</TableCell>
              <TableCell>생성시간</TableCell>
              <TableCell>출발 시각</TableCell>
              <TableCell>ETA</TableCell>
              <TableCell>배송 상태</TableCell>
              <TableCell>도착 지역</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deliveries.map((delivery) => (
              <TableRow
                hover
                onClick={() => onRowClick(delivery)}
                key={delivery.dashboard_id}
                className={getRowStyle(delivery.status, classes)}
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
                <TableCell>{format(new Date(delivery.create_time), 'yyyy-MM-dd HH:mm')}</TableCell>
                <TableCell>
                  {delivery.depart_time 
                    ? format(new Date(delivery.depart_time), 'yyyy-MM-dd HH:mm')
                    : '-'}
                </TableCell>
                <TableCell>{format(new Date(delivery.eta), 'yyyy-MM-dd HH:mm')}</TableCell>
                <TableCell className={classes.statusCell}>
                  {getStatusText(delivery.status)}
                </TableCell>
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
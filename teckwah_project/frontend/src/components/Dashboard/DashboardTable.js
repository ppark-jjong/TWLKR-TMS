import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  styled,
  Chip
} from '@mui/material';
import { formatDateTime } from '../../utils/dateUtils';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  maxHeight: 'calc(100vh - 200px)',
  '& .MuiTableHead-root': {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    backgroundColor: theme.palette.background.paper,
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: `${theme.palette.action.hover} !important`,
    cursor: 'pointer',
  }
}));

const StatusChip = styled(Chip)(({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'WAITING': return { bg: '#f5f5f5', color: '#666' };
      case 'IN_PROGRESS': return { bg: '#fff3cd', color: '#856404' };
      case 'COMPLETE': return { bg: '#d4edda', color: '#155724' };
      case 'ISSUE': return { bg: '#f8d7da', color: '#721c24' };
      default: return { bg: '#f5f5f5', color: '#666' };
    }
  };
  const { bg, color } = getStatusColor();
  return {
    backgroundColor: bg,
    color: color,
    fontWeight: 'bold',
    fontSize: '0.85rem'
  };
});

function DashboardTable({ data, selectedIds, onSelect, onRowClick }) {
  const getStatusLabel = (status) => {
    const statusMap = {
      'WAITING': '대기',
      'IN_PROGRESS': '진행',
      'COMPLETE': '완료',
      'ISSUE': '이슈'
    };
    return statusMap[status] || status;
  };

  return (
    <StyledTableContainer component={Paper} elevation={3}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedIds.length > 0 && selectedIds.length < data.length}
                checked={data.length > 0 && selectedIds.length === data.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelect(data.map((row) => row.dashboard_id));
                  } else {
                    onSelect([]);
                  }
                }}
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
          {data.map((row) => (
            <TableRow
              key={row.dashboard_id}
              hover
              onClick={() => onRowClick(row)}
              selected={selectedIds.includes(row.dashboard_id)}
              sx={{
                '&.MuiTableRow-root': {
                  backgroundColor: row.status === 'WAITING' ? '#f5f5f5' :
                    row.status === 'IN_PROGRESS' ? '#fff3cd' :
                    row.status === 'COMPLETE' ? '#d4edda' :
                    row.status === 'ISSUE' ? '#f8d7da' : 'inherit',
                  transition: 'background-color 0.2s ease'
                }
              }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedIds.includes(row.dashboard_id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (e.target.checked) {
                      onSelect([...selectedIds, row.dashboard_id]);
                    } else {
                      onSelect(selectedIds.filter((id) => id !== row.dashboard_id));
                    }
                  }}
                />
              </TableCell>
              <TableCell>{row.type}</TableCell>
              <TableCell>{row.department}</TableCell>
              <TableCell>{row.warehouse}</TableCell>
              <TableCell>{row.driver_name || '-'}</TableCell>
              <TableCell>{row.order_no}</TableCell>
              <TableCell>{formatDateTime(new Date(row.create_time))}</TableCell>
              <TableCell>{row.depart_time ? formatDateTime(new Date(row.depart_time)) : '-'}</TableCell>
              <TableCell>{formatDateTime(new Date(row.eta))}</TableCell>
              <TableCell>
                <StatusChip
                  label={getStatusLabel(row.status)}
                  status={row.status}
                  size="small"
                />
              </TableCell>
              <TableCell>{row.region}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </StyledTableContainer>
  );
}

export default DashboardTable;
import React, { useState } from 'react';
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
  Chip,
  TablePagination,
} from '@mui/material';
import { formatDateTime } from '../../utils/dateUtils';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  maxHeight: 'calc(100vh - 250px)', // 페이지네이션을 위한 공간 확보
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50); // 기본 50개 행

  const getStatusLabel = (status) => {
    const statusMap = {
      'WAITING': '대기',
      'IN_PROGRESS': '진행',
      'COMPLETE': '완료',
      'ISSUE': '이슈'
    };
    return statusMap[status] || status;
  };

  const getRowStyle = (status) => {
    switch (status) {
      case 'WAITING':
        return { backgroundColor: '#f5f5f5' };
      case 'IN_PROGRESS':
        return { backgroundColor: '#fff3cd' };
      case 'COMPLETE':
        return { backgroundColor: '#d4edda' };
      case 'ISSUE':
        return { backgroundColor: '#f8d7da' };
      default:
        return {};
    }
  };

  // 페이지네이션 처리
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 현재 페이지에 표시할 데이터 계산
  const paginatedData = data.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Paper elevation={3}>
      <StyledTableContainer>
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
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} style={{ textAlign: 'center' }}>
                  조회된 데이터가 없습니다.
                </TableCell>
              </TableRow>
          ):(paginatedData.map((row) => (
              <TableRow
                key={row.dashboard_id}
                hover
                onClick={() => onRowClick(row)}
                selected={selectedIds.includes(row.dashboard_id)}
                style={getRowStyle(row.status)}
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
            )))}
          </TableBody>
        </Table>
      </StyledTableContainer>
      <TablePagination
        component="div"
        count={data.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[25, 50, 100]}
        labelRowsPerPage="페이지당 행 수"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} / 전체 ${count}`
        }
      />
    </Paper>
  );
}

export default DashboardTable;
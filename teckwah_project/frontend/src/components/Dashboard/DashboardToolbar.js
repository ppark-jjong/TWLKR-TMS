import React from 'react';
import {
  Box,
  Button,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tooltip,
  styled
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  PersonAdd as AssignIcon
} from '@mui/icons-material';

const ToolbarContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
  backgroundColor: '#fff',
  position: 'sticky',
  top: 64,
  zIndex: 2,
  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
  boxShadow: theme.shadows[1]
}));

const ActionButton = styled(Button)(({ theme }) => ({
  minWidth: 'auto',
  padding: theme.spacing(1, 2),
  borderRadius: theme.shape.borderRadius,
  '& .MuiButton-startIcon': {
    marginRight: theme.spacing(1)
  }
}));

function DashboardToolbar({
  selectedDate,
  onDateChange,
  searchText,
  onSearchChange,
  departmentFilter,
  onDepartmentFilterChange,
  onRefresh,
  onAdd,
  onAssign,
  onDelete,
  showDeleteButton,
  showAssignButton
}) {
  return (
    <ToolbarContainer>
      <DatePicker
        label="날짜 선택"
        value={selectedDate}
        onChange={onDateChange}
        format="YYYY-MM-DD"
        slotProps={{
          textField: {
            size: "small",
            fullWidth: true,
            sx: { width: 150 }
          }
        }}
      />
      
      <TextField
        size="small"
        label="검색"
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ width: 200 }}
      />

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>부서</InputLabel>
        <Select
          value={departmentFilter}
          label="부서"
          onChange={(e) => onDepartmentFilterChange(e.target.value)}
        >
          <MenuItem value="">전체</MenuItem>
          <MenuItem value="CS">CS</MenuItem>
          <MenuItem value="HES">HES</MenuItem>
          <MenuItem value="LENOVO">LENOVO</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ flexGrow: 1 }} />
      
      <Stack direction="row" spacing={1}>
        <Tooltip title="새로고침">
          <IconButton onClick={onRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        <ActionButton
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAdd}
          color="primary"
        >
          생성
        </ActionButton>

        {showAssignButton && (
          <ActionButton
            variant="contained"
            startIcon={<AssignIcon />}
            onClick={onAssign}
            color="secondary"
          >
            배차
          </ActionButton>
        )}

        {showDeleteButton && (
          <ActionButton
            variant="contained"
            startIcon={<DeleteIcon />}
            onClick={onDelete}
            color="error"
          >
            삭제
          </ActionButton>
        )}
      </Stack>
    </ToolbarContainer>
  );
}

export default DashboardToolbar;
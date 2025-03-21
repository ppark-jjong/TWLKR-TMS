// src/components/dashboard/DashboardTable.js (수정)
import React, { useState, useCallback } from 'react';
import { Table } from 'antd';
import DashboardFilters from './DashboardFilters';
import {
  STATUS_TEXTS,
  STATUS_COLORS,
  TYPE_TEXTS,
  DEPARTMENT_TEXTS,
  WAREHOUSE_TEXTS,
} from '../../utils/Constants';
import { formatDateTime, formatPhoneNumber } from '../../utils/Formatter';
import './DashboardTable.css';

/**
 * 간소화된 대시보드 테이블 컴포넌트
 */
const DashboardTable = ({
  dataSource = [],
  loading = false,
  selectedRows = [],
  onSelectRows = () => {},
  onRowClick = () => {},
  onRefresh = () => {},
  currentPage = 1,
  pageSize = 50,
  onPageChange = () => {},
  isAdminPage = false,
  // 필터 관련 props
  typeFilter,
  departmentFilter,
  warehouseFilter,
  orderNoSearch,
  onTypeFilterChange,
  onDepartmentFilterChange,
  onWarehouseFilterChange,
  onOrderNoSearchChange,
  onResetFilters,
  onApplyFilters,
  searchLoading = false,
}) => {
  // 정렬 상태 관리
  const [sortedInfo, setSortedInfo] = useState({});

  // 테이블 정렬 변경 핸들러
  const handleTableChange = useCallback((pagination, filters, sorter) => {
    setSortedInfo(sorter);
  }, []);

  // 테이블 컬럼 구성
  const columns = [
    {
      title: '종류',
      dataIndex: 'type',
      key: 'type',
      width: 70,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'type' && sortedInfo.order,
      render: (type) => (
        <span className={`type-column-${type?.toLowerCase()}`}>
          {TYPE_TEXTS[type] || type || '-'}
        </span>
      ),
    },
    {
      title: '주문번호',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 120,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'order_no' && sortedInfo.order,
    },
    {
      title: '부서',
      dataIndex: 'department',
      key: 'department',
      width: 100,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'department' && sortedInfo.order,
      render: (department) => DEPARTMENT_TEXTS[department] || department || '-',
    },
    {
      title: '출발허브',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 100,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'warehouse' && sortedInfo.order,
      render: (warehouse) => WAREHOUSE_TEXTS[warehouse] || warehouse || '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'status' && sortedInfo.order,
      render: (status) => (
        <span className={`status-tag ${STATUS_COLORS[status]}`}>
          {STATUS_TEXTS[status] || status || '-'}
        </span>
      ),
    },
    {
      title: 'ETA',
      dataIndex: 'eta',
      key: 'eta',
      width: 150,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'eta' && sortedInfo.order,
      render: (eta) => formatDateTime(eta),
    },
    {
      title: '접수시각',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 150,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'create_time' && sortedInfo.order,
      render: (create_time) => formatDateTime(create_time),
    },
    {
      title: 'SLA',
      dataIndex: 'sla',
      key: 'sla',
      width: 80,
    },
    {
      title: '수령인',
      dataIndex: 'customer',
      key: 'customer',
      width: 120,
    },
    {
      title: '연락처',
      dataIndex: 'contact',
      key: 'contact',
      width: 130,
      render: (contact) => formatPhoneNumber(contact) || '-',
    },
    {
      title: '배송담당',
      dataIndex: 'driver_name',
      key: 'driver_name',
      width: 100,
      render: (driver_name) =>
        driver_name ? (
          <span>{driver_name}</span>
        ) : (
          <span style={{ color: '#d9d9d9' }}>미배차</span>
        ),
    },
    {
      title: '배송연락처',
      dataIndex: 'driver_contact',
      key: 'driver_contact',
      width: 130,
      render: (driver_contact) => formatPhoneNumber(driver_contact) || '-',
    },
  ];

  // 관리자 페이지일 때만 버전 컬럼 추가
  if (isAdminPage) {
    columns.push({
      title: '버전',
      dataIndex: 'version',
      key: 'version',
      width: 70,
    });
  }

  // 행 선택 핸들러 구성
  const rowSelection = {
    selectedRowKeys: selectedRows.map((row) => row.dashboard_id),
    onChange: (selectedRowKeys, selectedTableRows) => {
      onSelectRows(selectedTableRows);
    },
  };

  // 행 클릭 핸들러
  const onRowHandler = (record) => {
    return {
      onClick: () => onRowClick(record),
      className: `ant-table-row-${record.status?.toLowerCase()}`,
    };
  };

  // 필터 변경 핸들러
  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'typeFilter':
        onTypeFilterChange?.(value);
        break;
      case 'departmentFilter':
        onDepartmentFilterChange?.(value);
        break;
      case 'warehouseFilter':
        onWarehouseFilterChange?.(value);
        break;
      case 'searchInput':
        // 현재는 필터 값만 변경하고 검색은 하지 않음
        break;
    }
  };

  return (
    <div
      className={`dashboard-table-container ${
        isAdminPage ? 'admin-table' : ''
      }`}
    >
      {/* 필터 영역 */}
      <DashboardFilters
        filters={{
          typeFilter,
          departmentFilter,
          warehouseFilter,
          searchInput: orderNoSearch,
        }}
        onFilterChange={handleFilterChange}
        onResetFilters={onResetFilters}
        onApplyFilters={onApplyFilters}
        onRefresh={onRefresh}
        onOrderNoSearchChange={onOrderNoSearchChange}
        searchLoading={searchLoading}
      />

      {/* 테이블 - 가상화 제거하고 기본 테이블 사용 */}
      <Table
        className="dashboard-table"
        rowKey="dashboard_id"
        dataSource={dataSource}
        columns={columns}
        loading={loading}
        rowSelection={rowSelection}
        onChange={handleTableChange}
        onRow={onRowHandler}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          onChange: onPageChange,
          showSizeChanger: false,
          showTotal: (total) => `총 ${total}건`,
        }}
        size="middle"
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};

export default DashboardTable;

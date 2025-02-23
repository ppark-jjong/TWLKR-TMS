// frontend/src/components/dashboard/DashboardTable.js
import React from 'react';
import { Table, Tag, Tooltip } from 'antd';
import {
  STATUS_TYPES,
  STATUS_TEXTS,
  STATUS_COLORS,
  TYPE_TEXTS,
  TYPE_COLORS,
  WAREHOUSE_TEXTS,
  DEPARTMENT_TEXTS,
  FONT_STYLES,
} from '../../utils/Constants';
import { formatDateTime } from '../../utils/Formatter';

const DashboardTable = ({
  dataSource,
  loading,
  selectedRows,
  onSelectRows,
  onRowClick,
  currentPage,
  pageSize,
  onPageChange,
  isAdminPage,
}) => {
  const columns = [
    {
      title: '종류',
      dataIndex: 'type',
      align: 'center',
      width: 80,
      render: (text) => (
        <span
          style={{
            color: TYPE_COLORS[text],
            fontWeight: 500,
            ...FONT_STYLES.BODY.MEDIUM,
          }}
        >
          {TYPE_TEXTS[text]}
        </span>
      ),
    },
    {
      title: '부서',
      dataIndex: 'department',
      align: 'center',
      width: 80,
      render: (text) => (
        <span style={FONT_STYLES.BODY.MEDIUM}>{DEPARTMENT_TEXTS[text]}</span>
      ),
    },
    {
      title: '출발 허브',
      dataIndex: 'warehouse',
      align: 'center',
      width: 100,
      render: (text) => (
        <span style={FONT_STYLES.BODY.MEDIUM}>{WAREHOUSE_TEXTS[text]}</span>
      ),
    },
    {
      title: '배송 담당',
      dataIndex: 'driver_name',
      align: 'center',
      width: 100,
      render: (text) => (
        <span
          style={{
            color: text ? 'black' : '#999',
            ...FONT_STYLES.BODY.MEDIUM,
          }}
        >
          {text || '-'}
        </span>
      ),
    },
    {
      title: 'order#',
      dataIndex: 'order_no',
      align: 'center',
      width: 130,
      render: (text) => <span style={FONT_STYLES.BODY.MEDIUM}>{text}</span>,
    },
    {
      title: '출발 시각',
      dataIndex: 'depart_time',
      align: 'center',
      width: 150,
      render: (text) => (
        <span
          style={{
            color: text ? 'black' : '#999',
            ...FONT_STYLES.BODY.MEDIUM,
          }}
        >
          {formatDateTime(text) || '-'}
        </span>
      ),
    },
    {
      title: 'ETA',
      dataIndex: 'eta',
      align: 'center',
      width: 150,
      render: (text) => (
        <span style={FONT_STYLES.BODY.MEDIUM}>{formatDateTime(text)}</span>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      align: 'center',
      width: 100,
      render: (status) => (
        <Tag
          color={STATUS_COLORS[status]}
          style={{
            minWidth: '60px',
            textAlign: 'center',
            fontWeight: 500,
            ...FONT_STYLES.BODY.MEDIUM,
          }}
        >
          {STATUS_TEXTS[status]}
        </Tag>
      ),
    },
    {
      title: '도착 지역',
      dataIndex: 'region',
      align: 'center',
      width: 130,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span style={FONT_STYLES.BODY.MEDIUM}>{text || '-'}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="dashboard_id"
      loading={loading}
      size="middle"
      scroll={{ x: 1200, y: 'calc(100vh - 260px)' }}
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        total: dataSource?.length || 0,
        onChange: onPageChange,
        showSizeChanger: false,
        showTotal: (total) => `총 ${total}건`,
      }}
      rowSelection={{
        selectedRowKeys: selectedRows.map((row) => row.dashboard_id),
        onChange: (_, rows) => onSelectRows(rows),
      }}
      onRow={(record) => ({
        onClick: () => onRowClick(record),
        style: {
          cursor: 'pointer',
        },
      })}
      locale={{
        emptyText: '데이터가 없습니다',
      }}
    />
  );
};

export default DashboardTable;

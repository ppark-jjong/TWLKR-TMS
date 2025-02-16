// frontend/src/components/dashboard/DashboardTable.js
import React, { useState, useMemo } from 'react';
import { Table, Tag, Input, Select, Space, Pagination } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { formatDateTime } from '../../utils/Formatter';
import { 
  STATUS_TYPES,
  STATUS_TEXTS,
  STATUS_COLORS,
  DEPARTMENT_TYPES,
  DEPARTMENT_TEXTS,
  TYPE_TEXTS,
  WAREHOUSE_TEXTS
} from '../../utils/Constants';

const { Search } = Input;
const { Option } = Select;

const DashboardTable = ({ 
  dataSource, 
  loading, 
  selectedRows, 
  onSelectRows, 
  onRowClick 
}) => {
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // 테이블 헤더 스타일
  const headerStyle = {
    backgroundColor: '#f7fafc',
    color: '#1a202c',
    fontWeight: 600,
    fontSize: '14px',
    borderBottom: '2px solid #e2e8f0'
  };

  // 테이블 셀 스타일
  const cellStyle = {
    fontSize: '14px',
    padding: '12px 16px',
    fontWeight: 'normal'
  };

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    let filtered = [...dataSource];

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(item => 
        item.order_no.toString().includes(searchLower) ||
        item.customer?.toLowerCase().includes(searchLower) ||
        (item.driver_name && item.driver_name.toLowerCase().includes(searchLower))
      );
    }

    if (departmentFilter) {
      filtered = filtered.filter(item => item.department === departmentFilter);
    }

    return filtered;
  }, [dataSource, searchText, departmentFilter]);

  const columns = [
    {
      title: '종류',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: text => <span style={cellStyle}>{TYPE_TEXTS[text]}</span>
    },
    {
      title: '부서',
      dataIndex: 'department',
      key: 'department',
      width: 100,
      render: text => <span style={cellStyle}>{DEPARTMENT_TEXTS[text]}</span>
    },
    {
      title: '출발 허브',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 120,
      render: text => <span style={cellStyle}>{WAREHOUSE_TEXTS[text]}</span>
    },
    {
      title: '담당 기사',
      dataIndex: 'driver_name',
      key: 'driver_name',
      width: 120,
      render: text => <span style={cellStyle}>{text || '-'}</span>
    },
    {
      title: 'order_no',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 150,
      render: text => <span style={cellStyle}>{text}</span>
    },
    {
      title: '생성시간',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 150,
      render: text => <span style={cellStyle}>{formatDateTime(text)}</span>
    },
    {
      title: '출발 시각',
      dataIndex: 'depart_time',
      key: 'depart_time',
      width: 150,
      render: text => <span style={cellStyle}>{formatDateTime(text)}</span>
    },
    {
      title: 'ETA',
      dataIndex: 'eta',
      key: 'eta',
      width: 150,
      render: text => <span style={cellStyle}>{formatDateTime(text)}</span>
    },
    {
      title: '배송 상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: status => (
        <Tag 
          color={STATUS_COLORS[status]} 
          style={{
            padding: '4px 12px',
            fontSize: '14px',
            borderRadius: '4px'
          }}
        >
          {STATUS_TEXTS[status]}
        </Tag>
      )
    },
    {
      title: '도착 지역',
      dataIndex: 'region',
      key: 'region',
      width: 150,
      render: text => <span style={cellStyle}>{text}</span>
    }
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* 상단 고정 영역 */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        backgroundColor: '#fff',
        zIndex: 10,
        padding: '16px 0',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16 
        }}>
          <Space size="middle">
            <Search
              placeholder="주문번호, 고객명, 기사명 검색"
              allowClear
              onSearch={setSearchText}
              style={{ width: 300 }}
            />
            <Select
              allowClear
              placeholder="부서 선택"
              style={{ width: 200 }}
              onChange={setDepartmentFilter}
            >
              {Object.entries(DEPARTMENT_TYPES).map(([key, value]) => (
                <Option key={key} value={value}>{DEPARTMENT_TEXTS[key]}</Option>
              ))}
            </Select>
          </Space>
          <Pagination
            current={currentPage}
            onChange={setCurrentPage}
            pageSize={pageSize}
            total={filteredData.length}
            showTotal={(total) => `총 ${total}건`}
            showSizeChanger={false}
            size="default"
          />
        </div>
      </div>

      <Table
        columns={columns.map(column => ({
          ...column,
          onHeaderCell: () => ({
            style: headerStyle
          })
        }))}
        dataSource={filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
        loading={loading}
        rowKey="dashboard_id"
        scroll={{ x: 1500, y: 'calc(100vh - 250px)' }}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedRows.map(row => row.dashboard_id),
          onChange: (_, rows) => onSelectRows(rows),
        }}
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          style: {
            cursor: 'pointer',
            backgroundColor: 
              record.status === STATUS_TYPES.WAITING ? '#f7fafc' :
              record.status === STATUS_TYPES.IN_PROGRESS ? '#fffaf0' :
              record.status === STATUS_TYPES.COMPLETE ? '#f0fff4' :
              record.status === STATUS_TYPES.ISSUE ? '#fff5f5' : 'white'
          }
        })}
      />
    </div>
  );
};

export default DashboardTable;
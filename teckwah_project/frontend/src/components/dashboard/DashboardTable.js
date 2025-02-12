// frontend/src/components/dashboard/DashboardTable.js
import React, { useState, useMemo } from 'react';
import { Table, Tag, Input, Select, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { formatDateTime } from '../../utils/Formatter';
import { 
  STATUS_COLORS, 
  STATUS_TEXTS,
  DEPARTMENTS 
} from '../../utils/Constants';

const { Search } = Input;
const { Option } = Select;

/**
 * @typedef {import('../../types').Dashboard} Dashboard
 */

/**
 * 대시보드 테이블 컴포넌트
 * @param {Object} props
 * @param {Dashboard[]} props.dataSource - 테이블 데이터
 * @param {boolean} props.loading - 로딩 상태
 * @param {Dashboard[]} props.selectedRows - 선택된 행 데이터
 * @param {Function} props.onSelectRows - 행 선택 핸들러
 * @param {Function} props.onRowClick - 행 클릭 핸들러
 */
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

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    let filtered = [...dataSource];

    // 검색어 필터링
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(item => 
        item.order_no.toString().includes(searchLower) ||
        item.customer.toLowerCase().includes(searchLower) ||
        (item.driver_name && item.driver_name.toLowerCase().includes(searchLower))
      );
    }

    // 부서 필터링
    if (departmentFilter) {
      filtered = filtered.filter(item => item.department === departmentFilter);
    }

    return filtered;
  }, [dataSource, searchText, departmentFilter]);

  // 컬럼 정의
  const columns = [
    {
      title: '종류',
      dataIndex: 'type',
      key: 'type',
      width: 100,
    },
    {
      title: '부서',
      dataIndex: 'department',
      key: 'department',
      width: 100,
    },
    {
      title: '출발 허브',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 120,
    },
    {
      title: '담당 기사',
      dataIndex: 'driver_name',
      key: 'driver_name',
      width: 120,
      render: text => text || '-'
    },
    {
      title: 'order_no',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 150,
    },
    {
      title: '생성시간',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 150,
      render: text => formatDateTime(text)
    },
    {
      title: '출발 시각',
      dataIndex: 'depart_time',
      key: 'depart_time',
      width: 150,
      render: text => formatDateTime(text)
    },
    {
      title: 'ETA',
      dataIndex: 'eta',
      key: 'eta',
      width: 150,
      render: text => formatDateTime(text)
    },
    {
      title: '배송 상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: status => (
        <Tag color={STATUS_COLORS[status]}>
          {STATUS_TEXTS[status]}
        </Tag>
      )
    },
    {
      title: '도착 지역',
      dataIndex: 'region',
      key: 'region',
      width: 150,
    }
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
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
          {Object.entries(DEPARTMENTS).map(([key, value]) => (
            <Option key={key} value={value}>{value}</Option>
          ))}
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        rowKey="dashboard_id"
        scroll={{ x: 1500 }}
        rowSelection={{
          selectedRowKeys: selectedRows.map(row => row.dashboard_id),
          onChange: (_, rows) => onSelectRows(rows),
        }}
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          style: {
            cursor: 'pointer',
            backgroundColor: 
              record.status === 'WAITING' ? '#f5f5f5' :
              record.status === 'IN_PROGRESS' ? '#fff7e6' :
              record.status === 'COMPLETE' ? '#f6ffed' :
              record.status === 'ISSUE' ? '#fff1f0' : 'white'
          }
        })}
        pagination={{
          current: currentPage,
          onChange: setCurrentPage,
          pageSize: 50,
          total: filteredData.length,
          showTotal: (total) => `총 ${total}건`,
          showSizeChanger: false
        }}
      />
    </div>
  );
};

export default DashboardTable;
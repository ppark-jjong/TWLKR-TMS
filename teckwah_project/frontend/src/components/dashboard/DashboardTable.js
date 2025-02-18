// frontend/src/components/dashboard/DashboardTable.js
import React, { useState, useMemo } from 'react';
import { Table, Tag, Input, Select, Space, Button, Tooltip, DatePicker, Pagination } from 'antd';
import { SearchOutlined, ReloadOutlined, CarOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { formatDateTime } from '../../utils/Formatter';
import { 
  STATUS_TYPES,
  STATUS_TEXTS,
  STATUS_COLORS,
  STATUS_BG_COLORS,
  DEPARTMENT_TYPES,
  DEPARTMENT_TEXTS,
  TYPE_TYPES,
  TYPE_TEXTS,
  TYPE_COLORS,
  WAREHOUSE_TEXTS,
  FONT_STYLES
} from '../../utils/Constants';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;

const DashboardTable = ({ 
  dataSource, 
  loading, 
  selectedDate,
  onDateChange,
  selectedRows, 
  onSelectRows, 
  onRowClick,
  onRefresh,
  onCreateClick,
  onAssignClick,
  onDeleteClick
}) => {
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

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

    if (typeFilter) {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    return filtered;
  }, [dataSource, searchText, departmentFilter, typeFilter]);

  // 현재 페이지의 데이터
  const currentPageData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // 테이블 컬럼 정의
  const tableColumns = [
    {
      title: '종류',
      dataIndex: 'type',
      align: 'center',
      key: 'type',
      width: 80,
      render: text => (
        <span style={{ 
          color: TYPE_COLORS[text],
          fontWeight: 500,
          ...FONT_STYLES.BODY.MEDIUM
        }}>
          {TYPE_TEXTS[text]}
        </span>
      ),
      filters: [
        { text: '배송', value: 'DELIVERY' },
        { text: '회수', value: 'RETURN' }
      ],
      onFilter: (value, record) => record.type === value
    },
    {
      title: '부서',
      dataIndex: 'department',
      align: 'center',
      key: 'department',
      width: 80,
      render: text => (
        <span style={FONT_STYLES.BODY.MEDIUM}>{DEPARTMENT_TEXTS[text]}</span>
      )
    },
    {
      title: '출발 허브',
      dataIndex: 'warehouse',
      align: 'center',
      key: 'warehouse',
      width: 100,
      render: text => (
        <span style={FONT_STYLES.BODY.MEDIUM}>{WAREHOUSE_TEXTS[text]}</span>
      )
    },
    {
      title: '배송 담당',
      dataIndex: 'driver_name',
      key: 'driver_name',
      align: 'center',
      width: 100,
      render: text => (
        <span style={{ 
          color: text ? 'black' : '#999',
          ...FONT_STYLES.BODY.MEDIUM 
        }}>
          {text || '-'}
        </span>
      )
    },
    {
      title: 'order#',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 130,
      align: 'center',
      render: text => (
        <span style={FONT_STYLES.BODY.MEDIUM}>{text}</span>
      )
    },
    {
      title: '출발 시각',
      dataIndex: 'depart_time',
      align: 'center',
      key: 'depart_time',
      width: 150,
      render: text => (
        <span style={{ 
          color: text ? 'black' : '#999',
          ...FONT_STYLES.BODY.MEDIUM 
        }}>
          {formatDateTime(text) || '-'}
        </span>
      )
    },
    {
      title: 'ETA',
      align: 'center',
      dataIndex: 'eta',
      key: 'eta',
      width: 150,
      render: text => (
        <span style={FONT_STYLES.BODY.MEDIUM}>{formatDateTime(text)}</span>
      )
    },
    {
      title: '배송 상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: status => (
        <Tag 
          color={STATUS_COLORS[status]} 
          style={{
            minWidth: '60px',
            textAlign: 'center',
            fontWeight: 500,
            ...FONT_STYLES.BODY.MEDIUM
          }}
        >
          {STATUS_TEXTS[status]}
        </Tag>
      )
    },
    {
      title: '도착 지역',
      dataIndex: 'region',
      align: 'center',
      key: 'region',
      width: 130,
      ellipsis: true,
      render: text => (
        <Tooltip title={text}>
          <span style={FONT_STYLES.BODY.MEDIUM}>{text}</span>
        </Tooltip>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 검색 및 액션 영역 */}
      <div style={{ 
        backgroundColor: '#fff',
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        {/* 날짜 선택 및 페이지네이션 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <DatePicker
            value={selectedDate}
            onChange={onDateChange}
            allowClear={false}
            style={{ width: 280 }}
            size="large"
          />
          <Pagination
            current={currentPage}
            onChange={setCurrentPage}
            pageSize={pageSize}
            total={filteredData.length}
            showTotal={(total) => `총 ${total}건`}
            showSizeChanger={false}
          />
        </div>

        {/* 검색 및 액션 버튼 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Space size="large">
            <Search
              placeholder="주문번호, 고객명, 기사명 검색"
              allowClear
              onSearch={setSearchText}
              style={{ width: 350 }}
              size="large"
            />
            <Select
              allowClear
              placeholder="부서 선택"
              style={{ width: 200 }}
              onChange={setDepartmentFilter}
              size="large"
            >
              {Object.entries(DEPARTMENT_TYPES).map(([key, value]) => (
                <Option key={key} value={value}>{DEPARTMENT_TEXTS[key]}</Option>
              ))}
            </Select>
            <Select
              allowClear
              placeholder="종류 선택"
              style={{ width: 200 }}
              onChange={setTypeFilter}
              size="large"
            >
              {Object.entries(TYPE_TYPES).map(([key, value]) => (
                <Option key={key} value={value}>{TYPE_TEXTS[key]}</Option>
              ))}
            </Select>
          </Space>

          <Space size="middle">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onCreateClick}
              size="large"
            >
              생성
            </Button>
            <Button
              icon={<CarOutlined />}
              onClick={onAssignClick}
              disabled={selectedRows.length === 0}
              size="large"
            >
              배차
            </Button>
            <Button
              icon={<DeleteOutlined />}
              onClick={onDeleteClick}
              disabled={selectedRows.length === 0}
              danger
              size="large"
            >
              삭제
            </Button>
            <Tooltip title="새로고침">
              <Button
                icon={<ReloadOutlined />}
                onClick={onRefresh}
                size="large"
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      {/* 테이블 */}
      <Table
        columns={tableColumns}
        dataSource={currentPageData}
        loading={loading}
        rowKey="dashboard_id"
        scroll={{ x: 1200, y: 'calc(100vh - 250px)' }}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedRows.map(row => row.dashboard_id),
          onChange: (_, rows) => onSelectRows(rows),
        }}
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          style: {
            cursor: 'pointer',
            backgroundColor: STATUS_BG_COLORS[record.status].normal,
            transition: 'all 0.3s',
            ':hover': {
              backgroundColor: STATUS_BG_COLORS[record.status].hover
            }
          }
        })}
      />
    </div>
  );
};

export default DashboardTable;
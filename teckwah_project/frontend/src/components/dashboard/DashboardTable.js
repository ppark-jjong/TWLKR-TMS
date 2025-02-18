// frontend/src/components/dashboard/DashboardTable.js
import React, { useState, useMemo } from 'react';
import { Table, Tag, Input, Select, Space, Button, Tooltip, Typography } from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  CarOutlined, 
  DeleteOutlined, 
  PlusOutlined 
} from '@ant-design/icons';
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

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

const DashboardTable = ({ 
  dataSource, 
  loading, 
  selectedRows, 
  onSelectRows, 
  onRowClick,
  onRefresh,
  onCreateClick,
  onAssignClick,
  onDeleteClick,
  isAdminPage
}) => {
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    let filtered = [...dataSource];

    // 검색어 필터링
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(item => 
        item.order_no.toString().includes(searchLower) ||
        item.customer?.toLowerCase().includes(searchLower) ||
        (item.driver_name && item.driver_name.toLowerCase().includes(searchLower))
      );
    }

    // 부서 필터링
    if (departmentFilter) {
      filtered = filtered.filter(item => item.department === departmentFilter);
    }

    // 종류 필터링
    if (typeFilter) {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    return filtered;
  }, [dataSource, searchText, departmentFilter, typeFilter]);

  // 현재 페이지의 데이터
  const currentPageData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage]);

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

  // 액션 버튼 렌더링
  const renderActionButtons = () => {
    const buttons = [
      <Button
        key="create"
        type="primary"
        icon={<PlusOutlined />}
        onClick={onCreateClick}
        size="large"
      >
        생성
      </Button>,
      <Button
        key="assign"
        icon={<CarOutlined />}
        onClick={onAssignClick}
        disabled={selectedRows.length === 0}
        size="large"
      >
        배차
      </Button>
    ];

    // 관리자 페이지에서만 삭제 버튼 표시
    if (isAdminPage) {
      buttons.push(
        <Button
          key="delete"
          icon={<DeleteOutlined />}
          onClick={onDeleteClick}
          disabled={selectedRows.length === 0}
          danger
          size="large"
        >
          삭제
        </Button>
      );
    }

    buttons.push(
      <Tooltip key="refresh" title="새로고침">
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          size="large"
        />
      </Tooltip>
    );

    return buttons;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 검색 및 필터 영역 */}
      <div style={{ 
        backgroundColor: '#fff',
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Space size="middle">
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
              options={Object.entries(DEPARTMENT_TYPES).map(([key, value]) => ({
                value: value,
                label: DEPARTMENT_TEXTS[key]
              }))}
            />
            <Select
              allowClear
              placeholder="종류 선택"
              style={{ width: 200 }}
              onChange={setTypeFilter}
              size="large"
              options={Object.entries(TYPE_TYPES).map(([key, value]) => ({
                value: value,
                label: TYPE_TEXTS[key]
              }))}
            />
          </Space>

          <Space size="middle">
            {renderActionButtons()}
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
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: filteredData.length,
          onChange: setCurrentPage,
          showSizeChanger: false
        }}
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
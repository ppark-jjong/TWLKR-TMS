// frontend/src/components/dashboard/DashboardTable.js
import React, { useState, useEffect, useMemo } from 'react';
import { Table, Tag, Tooltip, Input, Select, Space, Button } from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  STATUS_TYPES,
  STATUS_TEXTS,
  STATUS_COLORS,
  TYPE_TEXTS,
  TYPE_TYPES,
  TYPE_COLORS,
  WAREHOUSE_TEXTS,
  WAREHOUSE_TYPES,
  DEPARTMENT_TEXTS,
  DEPARTMENT_TYPES,
  FONT_STYLES,
  STATUS_BG_COLORS,
} from '../../utils/Constants';
import { formatDateTime } from '../../utils/Formatter';
import './DashboardTable.css';

const { Option } = Select;

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
}) => {
  // 필터링 상태 관리
  const [typeFilter, setTypeFilter] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [warehouseFilter, setWarehouseFilter] = useState(null);
  const [orderNoSearch, setOrderNoSearch] = useState('');
  const [filteredData, setFilteredData] = useState([]);

  // 안전한 데이터 소스 확인
  const safeDataSource = Array.isArray(dataSource) ? dataSource : [];

  // 필터링된 데이터 계산 및 정렬
  useEffect(() => {
    let result = [...safeDataSource];

    // type 필터 적용
    if (typeFilter) {
      result = result.filter((item) => item.type === typeFilter);
    }

    // department 필터 적용
    if (departmentFilter) {
      result = result.filter((item) => item.department === departmentFilter);
    }

    // warehouse 필터 적용
    if (warehouseFilter) {
      result = result.filter((item) => item.warehouse === warehouseFilter);
    }

    // order_no 검색 적용
    if (orderNoSearch) {
      result = result.filter((item) =>
        String(item.order_no).includes(orderNoSearch)
      );
    }

    // 정렬 로직 적용
    // 1. 상태별 그룹화 (대기, 진행 중은 앞쪽, 완료/이슈/취소는 뒤쪽)
    // 2. 같은 상태 그룹 내에서는 ETA 기준 오름차순 정렬
    result.sort((a, b) => {
      // 상태 우선순위 정의
      const statusPriority = {
        WAITING: 1,
        IN_PROGRESS: 2,
        COMPLETE: 10,
        ISSUE: 11,
        CANCEL: 12,
      };

      // 상태 우선순위 비교
      const aPriority = statusPriority[a.status] || 99;
      const bPriority = statusPriority[b.status] || 99;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // 같은 상태 그룹 내에서는 ETA 기준 오름차순 정렬
      return new Date(a.eta) - new Date(b.eta);
    });

    setFilteredData(result);
  }, [
    safeDataSource,
    typeFilter,
    departmentFilter,
    warehouseFilter,
    orderNoSearch,
  ]);

  // 필터 초기화 함수
  const resetFilters = () => {
    setTypeFilter(null);
    setDepartmentFilter(null);
    setWarehouseFilter(null);
    setOrderNoSearch('');
  };

  // 행 스타일 생성 함수
  const getRowStyle = (record) => {
    const { status } = record;

    // 상태별 배경색 및 스타일 적용
    const style = {
      backgroundColor: STATUS_BG_COLORS[status]?.normal || '#ffffff',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
    };

    // 완료, 취소, 이슈 상태는 더 어둡게 표시
    if (['COMPLETE', 'CANCEL', 'ISSUE'].includes(status)) {
      style.color = '#888888'; // 텍스트 색상 어둡게
    }

    return style;
  };

  // 행 hover 스타일 설정
  const onRowOver = (record) => {
    return {
      onMouseEnter: (e) => {
        const { status } = record;
        e.currentTarget.style.backgroundColor =
          STATUS_BG_COLORS[status]?.hover || '#f5f5f5';
      },
      onMouseLeave: (e) => {
        const { status } = record;
        e.currentTarget.style.backgroundColor =
          STATUS_BG_COLORS[status]?.normal || '#ffffff';
      },
    };
  };

  // 필터 컴포넌트 생성
  const renderFilters = () => (
    <div
      className="dashboard-filters"
      style={{ marginBottom: 16, display: 'flex', gap: 16 }}
    >
      <div>
        <span style={{ marginRight: 8 }}>타입:</span>
        <Select
          allowClear
          style={{ width: 120 }}
          placeholder="타입 선택"
          value={typeFilter}
          onChange={setTypeFilter}
        >
          {Object.entries(TYPE_TYPES).map(([key, value]) => (
            <Option key={key} value={value}>
              {TYPE_TEXTS[key]}
            </Option>
          ))}
        </Select>
      </div>

      <div>
        <span style={{ marginRight: 8 }}>부서:</span>
        <Select
          allowClear
          style={{ width: 120 }}
          placeholder="부서 선택"
          value={departmentFilter}
          onChange={setDepartmentFilter}
        >
          {Object.entries(DEPARTMENT_TYPES).map(([key, value]) => (
            <Option key={key} value={value}>
              {DEPARTMENT_TEXTS[key]}
            </Option>
          ))}
        </Select>
      </div>

      <div>
        <span style={{ marginRight: 8 }}>출발 허브:</span>
        <Select
          allowClear
          style={{ width: 120 }}
          placeholder="허브 선택"
          value={warehouseFilter}
          onChange={setWarehouseFilter}
        >
          {Object.entries(WAREHOUSE_TYPES).map(([key, value]) => (
            <Option key={key} value={value}>
              {WAREHOUSE_TEXTS[key]}
            </Option>
          ))}
        </Select>
      </div>

      <div>
        <span style={{ marginRight: 8 }}>주문번호:</span>
        <Input
          placeholder="주문번호 검색"
          value={orderNoSearch}
          onChange={(e) => setOrderNoSearch(e.target.value)}
          style={{ width: 150 }}
          prefix={<SearchOutlined />}
          allowClear
        />
      </div>

      <Button
        icon={<ReloadOutlined />}
        onClick={resetFilters}
        style={{ marginLeft: 'auto' }}
      >
        필터 초기화
      </Button>
    </div>
  );

  const columns = [
    {
      title: '종류',
      dataIndex: 'type',
      align: 'center',
      width: 80,
      render: (text) => (
        <span
          className={`type-column-${text.toLowerCase()}`}
          style={{
            color: TYPE_COLORS[text] || '#666',
            fontWeight: 700, // 더 굵게 표시
            fontSize: '14px', // 더 크게 표시
            ...FONT_STYLES.BODY.MEDIUM,
          }}
        >
          {TYPE_TEXTS[text] || text}
        </span>
      ),
    },
    {
      title: '부서',
      dataIndex: 'department',
      align: 'center',
      width: 80,
      render: (text) => (
        <span style={FONT_STYLES.BODY.MEDIUM}>
          {DEPARTMENT_TEXTS[text] || text}
        </span>
      ),
    },
    {
      title: '출발 허브',
      dataIndex: 'warehouse',
      align: 'center',
      width: 100,
      render: (text) => (
        <span style={FONT_STYLES.BODY.MEDIUM}>
          {WAREHOUSE_TEXTS[text] || text}
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
      title: 'SLA',
      dataIndex: 'sla',
      align: 'center',
      width: 100,
      render: (text) => (
        <span style={FONT_STYLES.BODY.MEDIUM}>{text || '-'}</span>
      ),
    },
    {
      title: 'ETA',
      dataIndex: 'eta',
      align: 'center',
      width: 150,
      render: (text, record) => (
        <span
          style={{
            ...FONT_STYLES.BODY.MEDIUM,
            fontWeight: ['WAITING', 'IN_PROGRESS'].includes(record.status)
              ? 600
              : 400,
          }}
        >
          {formatDateTime(text)}
        </span>
      ),
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
      title: '도착 지역',
      dataIndex: 'region',
      align: 'center',
      width: 150,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span style={FONT_STYLES.BODY.MEDIUM}>{text || '-'}</span>
        </Tooltip>
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
      title: '수령인',
      dataIndex: 'customer',
      align: 'center',
      width: 100,
      render: (text) => (
        <span style={FONT_STYLES.BODY.MEDIUM}>{text || '-'}</span>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      align: 'center',
      width: 100,
      render: (status) => (
        <Tag
          color={STATUS_COLORS[status] || 'default'}
          style={{
            minWidth: '60px',
            textAlign: 'center',
            fontWeight: 600,
            ...FONT_STYLES.BODY.MEDIUM,
          }}
        >
          {STATUS_TEXTS[status] || status}
        </Tag>
      ),
    },
  ];

  // 테이블 CSS 스타일 적용을 위한 클래스 설정
  const tableClassName =
    'dashboard-table' + (isAdminPage ? ' admin-table' : '');

  return (
    <div className="dashboard-table-container">
      {/* 필터 컴포넌트 */}
      {renderFilters()}

      {/* 테이블 컴포넌트 */}
      <Table
        className={tableClassName}
        columns={columns}
        dataSource={filteredData}
        rowKey="dashboard_id"
        loading={loading}
        size="middle"
        scroll={{ x: 1200, y: 'calc(100vh - 340px)' }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: filteredData?.length || 0,
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
          className: `ant-table-row-${record.status.toLowerCase()}`,
          style: getRowStyle(record),
          ...onRowOver(record),
        })}
        locale={{
          emptyText: '데이터가 없습니다',
        }}
      />
    </div>
  );
};

export default DashboardTable;

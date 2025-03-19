// src/components/dashboard/DashboardTable.js
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { Table, Tag, Tooltip, Input, Select, Space, Button, Badge } from 'antd';
// 개별 아이콘 임포트로 번들 크기 최적화
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import FilterOutlined from '@ant-design/icons/FilterOutlined';
import ClearOutlined from '@ant-design/icons/ClearOutlined';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import CarOutlined from '@ant-design/icons/CarOutlined';
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
import { formatDateTime, formatPhoneNumber } from '../../utils/Formatter';
import { useLogger } from '../../utils/LogUtils';
import { useAuth } from '../../contexts/AuthContext';
import './DashboardTable.css';

const { Option } = Select;

/**
 * 대시보드 테이블 컴포넌트 (최적화 버전)
 * - 불필요한 메모이제이션 제거
 * - 필터링 로직 단순화
 * - 과도한 렌더링 최적화
 * - 백엔드 API 명세 준수
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
  // 외부 필터링 props
  typeFilter,
  departmentFilter,
  warehouseFilter,
  orderNoSearch,
  onTypeFilterChange = () => {},
  onDepartmentFilterChange = () => {},
  onWarehouseFilterChange = () => {},
  onOrderNoSearchChange = () => {},
  onResetFilters = () => {},
  onApplyFilters = () => {},
}) => {
  const logger = useLogger('DashboardTable');
  const { isAdmin } = useAuth();

  // 로컬 필터링 상태 관리 - 단순화
  const [localTypeFilter, setLocalTypeFilter] = useState(typeFilter);
  const [localDepartmentFilter, setLocalDepartmentFilter] =
    useState(departmentFilter);
  const [localWarehouseFilter, setLocalWarehouseFilter] =
    useState(warehouseFilter);
  const [localOrderNoSearch, setLocalOrderNoSearch] = useState(orderNoSearch);
  const [filteredData, setFilteredData] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [showVersionColumn, setShowVersionColumn] = useState(isAdmin);
  const [sortedInfo, setSortedInfo] = useState({});

  // 필터링 실행 플래그
  const isFilteringRef = useRef(false);

  // 외부 props가 변경되면 로컬 상태 업데이트 - 효율화
  useEffect(() => {
    setLocalTypeFilter(typeFilter);
    setLocalDepartmentFilter(departmentFilter);
    setLocalWarehouseFilter(warehouseFilter);
    setLocalOrderNoSearch(orderNoSearch);
  }, [typeFilter, departmentFilter, warehouseFilter, orderNoSearch]);

  // 필터링된 데이터 계산 - 단순화
  useEffect(() => {
    // 데이터가 비어있거나 이미 필터링 중인 경우 스킵
    if (
      !Array.isArray(dataSource) ||
      dataSource.length === 0 ||
      isFilteringRef.current
    ) {
      setFilteredData([]);
      return;
    }

    isFilteringRef.current = true;

    try {
      // 원본 데이터 복사
      let result = [...dataSource];

      // 필터 적용 - 단순화된 로직
      if (localTypeFilter) {
        result = result.filter((item) => item.type === localTypeFilter);
      }

      if (localDepartmentFilter) {
        result = result.filter(
          (item) => item.department === localDepartmentFilter
        );
      }

      if (localWarehouseFilter) {
        result = result.filter(
          (item) => item.warehouse === localWarehouseFilter
        );
      }

      if (localOrderNoSearch) {
        result = result.filter((item) =>
          String(item.order_no).includes(localOrderNoSearch)
        );
      }

      // 정렬 적용
      result = applySorting(result, sortedInfo);

      setFilteredData(result);
    } finally {
      isFilteringRef.current = false;
    }
  }, [
    dataSource,
    localTypeFilter,
    localDepartmentFilter,
    localWarehouseFilter,
    localOrderNoSearch,
    sortedInfo,
  ]);

  /**
   * 데이터 정렬 함수 - 최적화
   */
  const applySorting = useCallback((data, sorterInfo = {}) => {
    if (!Array.isArray(data)) return [];

    const { columnKey, order } = sorterInfo;

    // 특정 컬럼 정렬이 없는 경우 - 기본 정렬
    if (!columnKey || !order) {
      return data.sort((a, b) => {
        // 상태 그룹화 (대기, 진행 vs 완료, 이슈, 취소)
        const aGroup = ['COMPLETE', 'ISSUE', 'CANCEL'].includes(a.status)
          ? 1
          : 0;
        const bGroup = ['COMPLETE', 'ISSUE', 'CANCEL'].includes(b.status)
          ? 1
          : 0;

        if (aGroup !== bGroup) {
          return aGroup - bGroup;
        }

        // 같은 그룹 내에서는 ETA 기준 정렬
        const aEta = a.eta ? new Date(a.eta) : new Date(9999, 11, 31);
        const bEta = b.eta ? new Date(b.eta) : new Date(9999, 11, 31);
        return aEta - bEta;
      });
    }

    // 지정된 컬럼으로 정렬
    return [...data].sort((a, b) => {
      let aValue = a[columnKey];
      let bValue = b[columnKey];

      // 날짜 필드 처리
      if (
        ['eta', 'create_time', 'depart_time', 'complete_time'].includes(
          columnKey
        )
      ) {
        aValue = aValue ? new Date(aValue) : null;
        bValue = bValue ? new Date(bValue) : null;

        if (!aValue && !bValue) return 0;
        if (!aValue) return order === 'descend' ? -1 : 1;
        if (!bValue) return order === 'descend' ? 1 : -1;

        return order === 'ascend' ? aValue - bValue : bValue - aValue;
      }

      // 문자열 필드 처리
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'ascend'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // 기본 정렬 (숫자 등)
      if (aValue === undefined || aValue === null) aValue = 0;
      if (bValue === undefined || bValue === null) bValue = 0;

      return order === 'ascend' ? aValue - bValue : bValue - aValue;
    });
  }, []);

  // 테이블 정렬 변경 핸들러 - 단순화
  const handleTableChange = useCallback((pagination, filters, sorter) => {
    setSortedInfo(sorter);
  }, []);

  // 필터 변경 핸들러 - 단순화
  const handleTypeFilterChange = useCallback((value) => {
    setLocalTypeFilter(value);
  }, []);

  const handleDepartmentFilterChange = useCallback((value) => {
    setLocalDepartmentFilter(value);
  }, []);

  const handleWarehouseFilterChange = useCallback((value) => {
    setLocalWarehouseFilter(value);
  }, []);

  // 필터 적용 함수 - 단순화
  const handleApplyFilters = useCallback(() => {
    onTypeFilterChange(localTypeFilter);
    onDepartmentFilterChange(localDepartmentFilter);
    onWarehouseFilterChange(localWarehouseFilter);
    onOrderNoSearchChange(localOrderNoSearch || searchInput);
    onApplyFilters();
  }, [
    localTypeFilter,
    localDepartmentFilter,
    localWarehouseFilter,
    localOrderNoSearch,
    searchInput,
    onTypeFilterChange,
    onDepartmentFilterChange,
    onWarehouseFilterChange,
    onOrderNoSearchChange,
    onApplyFilters,
  ]);

  // 필터 초기화 함수 - 단순화
  const resetFilters = useCallback(() => {
    setLocalTypeFilter(null);
    setLocalDepartmentFilter(null);
    setLocalWarehouseFilter(null);
    setLocalOrderNoSearch('');
    setSearchInput('');
    onResetFilters();
  }, [onResetFilters]);

  // 검색 입력 핸들러
  const handleSearchInputChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  // 검색 실행 핸들러
  const handleSearch = useCallback(() => {
    setLocalOrderNoSearch(searchInput);
  }, [searchInput]);

  // 엔터키 핸들러
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter' && searchInput.trim()) {
        handleSearch();
      }
    },
    [searchInput, handleSearch]
  );

  // 행 스타일 생성 함수 - 단순화
  const getRowClassName = useCallback((record) => {
    const status = record.status || 'WAITING';
    return `ant-table-row-${status.toLowerCase()}`;
  }, []);

  /**
   * 행 스타일 생성 함수 - 상태별 배경색 적용
   * 요구사항: 각 상태별 색상대로 각 행 전체에 색이 반영되어야 함
   */
  const getRowStyle = useCallback((record) => {
    // 기본 상태 검증
    const status = record.status || 'WAITING';

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
  }, []);

  /**
   * 행 Hover 이벤트 처리 - 동적 상태별 시각적 피드백
   */
  const onRowOver = useCallback((record) => {
    const status = record.status || 'WAITING';

    return {
      onMouseEnter: (e) => {
        e.currentTarget.style.backgroundColor =
          STATUS_BG_COLORS[status]?.hover || '#f5f5f5';
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.backgroundColor =
          STATUS_BG_COLORS[status]?.normal || '#ffffff';
      },
    };
  }, []);

  // 버전 컬럼 토글
  const toggleVersionColumn = useCallback(() => {
    setShowVersionColumn((prev) => !prev);
  }, []);

  // 컬럼 정의 - 필수 필드만 유지
  const columns = useMemo(() => {
    // 기본 컬럼
    const baseColumns = [
      {
        title: '종류',
        dataIndex: 'type',
        align: 'center',
        width: 80,
        render: (text) => {
          const validType = text && TYPE_TEXTS[text] ? text : 'DELIVERY';
          return (
            <span
              className={`type-column-${validType.toLowerCase()}`}
              style={{
                color: TYPE_COLORS[validType] || '#666',
                fontWeight: 700,
                fontSize: '14px',
                ...FONT_STYLES.BODY.MEDIUM,
              }}
            >
              {TYPE_TEXTS[validType] || validType}
            </span>
          );
        },
        sorter: true,
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
        sorter: true,
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
        sorter: true,
      },
      {
        title: 'order#',
        dataIndex: 'order_no',
        align: 'center',
        width: 130,
        render: (text) => (
          <span style={FONT_STYLES.BODY.MEDIUM}>{text || '-'}</span>
        ),
        sorter: true,
      },
      {
        title: 'SLA',
        dataIndex: 'sla',
        align: 'center',
        width: 100,
        render: (text) => (
          <span style={FONT_STYLES.BODY.MEDIUM}>{text || '표준'}</span>
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
            {formatDateTime(text) || '-'}
          </span>
        ),
        sorter: true,
        defaultSortOrder: 'ascend',
      },
      {
        title: '출발 시각',
        dataIndex: 'depart_time',
        align: 'center',
        width: 150,
        render: (text) => (
          <span style={FONT_STYLES.BODY.MEDIUM}>
            {formatDateTime(text) || '-'}
          </span>
        ),
        sorter: true,
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
          <span style={FONT_STYLES.BODY.MEDIUM}>{text || '-'}</span>
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
        title: '연락처',
        dataIndex: 'contact',
        align: 'center',
        width: 130,
        render: (text) => (
          <span style={FONT_STYLES.BODY.MEDIUM}>
            {formatPhoneNumber(text) || '-'}
          </span>
        ),
      },
      {
        title: '상태',
        dataIndex: 'status',
        align: 'center',
        width: 100,
        render: (status) => {
          const validStatus =
            status && STATUS_TEXTS[status] ? status : 'WAITING';
          return (
            <Tag
              color={STATUS_COLORS[validStatus] || 'default'}
              style={{
                minWidth: '60px',
                textAlign: 'center',
                fontWeight: 600,
                ...FONT_STYLES.BODY.MEDIUM,
              }}
              className="status-tag"
            >
              {STATUS_TEXTS[validStatus] || validStatus}
            </Tag>
          );
        },
        sorter: true,
      },
    ];

    // 관리자 전용 버전 컬럼 (선택적)
    if (isAdmin && showVersionColumn) {
      baseColumns.push({
        title: (
          <Tooltip title="버전 정보 (관리자용)">
            <Space>
              <span>버전</span>
              <InfoCircleOutlined />
            </Space>
          </Tooltip>
        ),
        dataIndex: 'version',
        align: 'center',
        width: 70,
        render: (version) => (
          <Badge
            count={version || 1}
            style={{
              backgroundColor: '#1890ff',
              fontSize: '10px',
            }}
          />
        ),
      });
    }

    return baseColumns;
  }, [isAdmin, showVersionColumn]);

  // 필터링 컴포넌트 - 렌더링 최적화
  const renderFilters = useMemo(
    () => (
      <div className="dashboard-filters">
        <Space size="middle" wrap>
          <div>
            <span style={{ marginRight: 8 }}>타입:</span>
            <Select
              allowClear
              style={{ width: 120 }}
              placeholder="타입 선택"
              value={localTypeFilter}
              onChange={handleTypeFilterChange}
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
              value={localDepartmentFilter}
              onChange={handleDepartmentFilterChange}
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
              value={localWarehouseFilter}
              onChange={handleWarehouseFilterChange}
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
            <Input.Search
              placeholder="주문번호 입력"
              value={searchInput}
              onChange={handleSearchInputChange}
              onSearch={handleSearch}
              onPressEnter={handleKeyPress}
              style={{ width: 150 }}
              allowClear
            />
          </div>

          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={handleApplyFilters}
          >
            필터 적용
          </Button>

          <Button
            type="default"
            icon={<ClearOutlined />}
            onClick={resetFilters}
            disabled={
              !localTypeFilter &&
              !localDepartmentFilter &&
              !localWarehouseFilter &&
              !searchInput &&
              !localOrderNoSearch
            }
          >
            필터 초기화
          </Button>

          {isAdmin && (
            <Button
              type="link"
              icon={<InfoCircleOutlined />}
              onClick={toggleVersionColumn}
            >
              {showVersionColumn ? '버전 숨기기' : '버전 표시'}
            </Button>
          )}
        </Space>
      </div>
    ),
    [
      localTypeFilter,
      localDepartmentFilter,
      localWarehouseFilter,
      searchInput,
      localOrderNoSearch,
      handleTypeFilterChange,
      handleDepartmentFilterChange,
      handleWarehouseFilterChange,
      handleSearchInputChange,
      handleSearch,
      handleKeyPress,
      handleApplyFilters,
      resetFilters,
      showVersionColumn,
      isAdmin,
      toggleVersionColumn,
    ]
  );

  return (
    <div className="dashboard-table-container">
      {/* 필터 컴포넌트 */}
      {renderFilters}

      {/* 테이블 컴포넌트 - 성능 최적화 */}
      <Table
        className={`dashboard-table${isAdminPage ? ' admin-table' : ''}`}
        columns={columns}
        dataSource={filteredData}
        rowKey="dashboard_id"
        loading={loading}
        size="middle"
        scroll={{ x: 1200, y: 'calc(100vh - 340px)' }}
        onChange={handleTableChange}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: filteredData?.length || 0,
          onChange: onPageChange,
          showSizeChanger: false,
          showTotal: (total) => `총 ${total}건`,
        }}
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys: selectedRows.map((row) => row.dashboard_id),
          onChange: (_, rows) => onSelectRows(rows),
          getCheckboxProps: (record) => ({
            disabled: isAdminPage ? false : record.status !== 'WAITING',
            name: record.order_no,
          }),
        }}
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          className: getRowClassName(record),
          style: getRowStyle(record),
          ...onRowOver(record),
        })}
        locale={{
          emptyText: '조회된 데이터가 없습니다',
        }}
      />
    </div>
  );
};

// 최적화된 memo 적용 - props 비교 함수 제거하여 단순화
export default React.memo(DashboardTable);

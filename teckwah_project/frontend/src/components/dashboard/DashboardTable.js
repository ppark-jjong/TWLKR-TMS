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
import LockOutlined from '@ant-design/icons/LockOutlined';
import SyncOutlined from '@ant-design/icons/SyncOutlined';
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
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import './DashboardTable.css';

const { Option } = Select;

/**
 * 대시보드 테이블 컴포넌트
 * 배송 주문 목록을 표시하고 필터링, 정렬, 선택 기능을 제공
 * 관리자/일반 사용자 권한에 따른 UI 차별화
 * 메모이제이션을 통한 성능 최적화
 *
 * @param {Object} props - 컴포넌트 속성
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
  // 컨텍스트 및 로거
  const logger = useLogger('DashboardTable');
  const { isAdmin } = useAuth();
  const dashboardContext = useDashboard();

  // 로컬 필터링 상태 관리(외부 props와 연동)
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

  // 필터링 중복 실행 방지 플래그
  const isFilteringRef = useRef(false);
  const skipEffectRef = useRef(false);

  // 성능 측정 로그
  useEffect(() => {
    if (dataSource && !loading) {
      logger.debug(`DashboardTable 데이터 수신: ${dataSource.length}건`);
    }
  }, [dataSource, loading, logger]);

  // 외부 props가 변경되면 로컬 상태 업데이트
  useEffect(() => {
    if (skipEffectRef.current) {
      skipEffectRef.current = false;
      return;
    }

    setLocalTypeFilter(typeFilter);
    setLocalDepartmentFilter(departmentFilter);
    setLocalWarehouseFilter(warehouseFilter);
    setLocalOrderNoSearch(orderNoSearch);
  }, [typeFilter, departmentFilter, warehouseFilter, orderNoSearch]);

  // 필터링된 데이터 계산 및 정렬 - useMemo로 최적화
  useEffect(() => {
    // 데이터가 비어있는 경우 필터링 스킵
    if (!Array.isArray(dataSource) || dataSource.length === 0) {
      setFilteredData([]);
      return;
    }

    // 필터링이 이미 진행 중인 경우 중복 실행 방지
    if (isFilteringRef.current) {
      return;
    }

    logger.debug('필터링 적용 시작:', {
      dataCount: dataSource.length,
      typeFilter: localTypeFilter,
      departmentFilter: localDepartmentFilter,
      warehouseFilter: localWarehouseFilter,
      orderNoSearch: localOrderNoSearch,
    });

    // 필터링 시작 플래그 설정
    isFilteringRef.current = true;

    try {
      // 원본 데이터 복사 (불변성 유지)
      let result = [...dataSource];

      // 필터링 적용
      if (localTypeFilter) {
        result = result.filter((item) => item.type === localTypeFilter);
        logger.debug(
          `타입 필터 적용: ${localTypeFilter}, 결과 건수: ${result.length}`
        );
      }

      if (localDepartmentFilter) {
        result = result.filter(
          (item) => item.department === localDepartmentFilter
        );
        logger.debug(
          `부서 필터 적용: ${localDepartmentFilter}, 결과 건수: ${result.length}`
        );
      }

      if (localWarehouseFilter) {
        result = result.filter(
          (item) => item.warehouse === localWarehouseFilter
        );
        logger.debug(
          `허브 필터 적용: ${localWarehouseFilter}, 결과 건수: ${result.length}`
        );
      }

      if (localOrderNoSearch) {
        result = result.filter((item) =>
          String(item.order_no).includes(localOrderNoSearch)
        );
        logger.debug(
          `주문번호 검색 적용: ${localOrderNoSearch}, 결과 건수: ${result.length}`
        );
      }

      // 정렬 로직 적용 (기본: 상태 그룹 -> ETA 기준)
      result = applySorting(result, sortedInfo);

      logger.debug(`정렬 및 필터링 완료, 최종 결과 건수: ${result.length}`);
      setFilteredData(result);
    } finally {
      // 필터링 완료 플래그 해제
      isFilteringRef.current = false;
    }
  }, [
    dataSource,
    localTypeFilter,
    localDepartmentFilter,
    localWarehouseFilter,
    localOrderNoSearch,
    sortedInfo,
    logger,
  ]);

  /**
   * 데이터 정렬 적용 함수
   * @param {Array} data - 정렬할 데이터 배열
   * @param {Object} sorterInfo - 정렬 정보
   * @returns {Array} - 정렬된 데이터 배열
   */
  const applySorting = useCallback((data, sorterInfo = {}) => {
    if (!Array.isArray(data)) return [];

    // 정렬 필드와 순서 추출
    const { columnKey, order } = sorterInfo;

    // 기본 정렬 (상태 그룹 -> ETA)
    if (!columnKey || !order) {
      return data.sort((a, b) => {
        // 상태 그룹화 (대기, 진행 vs 완료, 이슈, 취소)
        const aGroup = ['COMPLETE', 'ISSUE', 'CANCEL'].includes(a.status)
          ? 1
          : 0;
        const bGroup = ['COMPLETE', 'ISSUE', 'CANCEL'].includes(b.status)
          ? 1
          : 0;

        // 그룹이 다르면 그룹 기준으로 정렬 (대기,진행 우선)
        if (aGroup !== bGroup) {
          return aGroup - bGroup;
        }

        // 같은 상태 그룹 내에서는 ETA 기준 오름차순 정렬
        const aEta = a.eta ? new Date(a.eta) : new Date(9999, 11, 31);
        const bEta = b.eta ? new Date(b.eta) : new Date(9999, 11, 31);
        return aEta - bEta;
      });
    }

    // 지정된 필드로 정렬
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

        // null 처리
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

      // 숫자 필드 처리
      if (aValue === undefined || aValue === null) aValue = 0;
      if (bValue === undefined || bValue === null) bValue = 0;

      return order === 'ascend' ? aValue - bValue : bValue - aValue;
    });
  }, []);

  // 테이블 정렬 변경 핸들러
  const handleTableChange = useCallback(
    (pagination, filters, sorter) => {
      logger.debug('테이블 정렬 변경:', sorter);
      setSortedInfo(sorter);
    },
    [logger]
  );

  // 필터 변경 핸들러 메모이제이션
  const handleTypeFilterChange = useCallback((value) => {
    setLocalTypeFilter(value);
  }, []);

  const handleDepartmentFilterChange = useCallback((value) => {
    setLocalDepartmentFilter(value);
  }, []);

  const handleWarehouseFilterChange = useCallback((value) => {
    setLocalWarehouseFilter(value);
  }, []);

  // 검색 입력 핸들러
  const handleSearchInputChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  // 검색 버튼 클릭 핸들러
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

  // 필터 적용 버튼 클릭 핸들러
  const handleApplyFilters = useCallback(() => {
    skipEffectRef.current = true;
    // 모든 필터를 한꺼번에 부모 컴포넌트로 전달
    onTypeFilterChange(localTypeFilter);
    onDepartmentFilterChange(localDepartmentFilter);
    onWarehouseFilterChange(localWarehouseFilter);
    onOrderNoSearchChange(localOrderNoSearch || searchInput);
    onApplyFilters(); // 명시적 호출 추가
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

  // 필터 초기화 함수
  const resetFilters = useCallback(() => {
    setLocalTypeFilter(null);
    setLocalDepartmentFilter(null);
    setLocalWarehouseFilter(null);
    setLocalOrderNoSearch('');
    setSearchInput('');

    // 부모 컴포넌트 상태 업데이트
    skipEffectRef.current = true;
    onResetFilters(); // 상위 컴포넌트에 전달
  }, [onResetFilters]);

  /**
   * 버전 토글 핸들러
   */
  const toggleVersionColumn = useCallback(() => {
    setShowVersionColumn((prev) => !prev);
  }, []);

  /**
   * 락 상태 렌더링
   * 현재 편집 중인 항목에 대한 시각적 표시
   * @param {Object} record - 대시보드 레코드
   * @returns {React.ReactNode} - 렌더링할 노드
   */
  const renderLockStatus = useCallback((record) => {
    // 락 정보는 백엔드 API를 통해 가져올 수 있으나
    // 여기서는 로컬 UI 처리만 구현
    if (record._locked_by) {
      return (
        <Tooltip title={`${record._locked_by}님이 편집 중`}>
          <LockOutlined style={{ color: '#ff4d4f' }} />
        </Tooltip>
      );
    }
    return null;
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

  // 필터 컴포넌트 메모이제이션 (검색 기능 개선)
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
              icon={
                showVersionColumn ? (
                  <InfoCircleOutlined />
                ) : (
                  <InfoCircleOutlined />
                )
              }
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
      toggleVersionColumn,
      isAdmin,
    ]
  );

  // 관리자/일반 사용자 권한에 따른 열 정의 - useMemo로 메모이제이션
  const columns = useMemo(() => {
    // 기본 열 정의 (공통)
    const baseColumns = [
      {
        title: '종류',
        dataIndex: 'type',
        align: 'center',
        width: 80,
        render: (text) => {
          // 타입 값 검증 - 기본값 제공
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
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: '부서',
        dataIndex: 'department',
        align: 'center',
        width: 80,
        render: (text) => {
          const validDepartment = text && DEPARTMENT_TEXTS[text] ? text : 'CS';
          return (
            <span style={FONT_STYLES.BODY.MEDIUM}>
              {DEPARTMENT_TEXTS[validDepartment] || validDepartment}
            </span>
          );
        },
        sorter: true,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: '출발 허브',
        dataIndex: 'warehouse',
        align: 'center',
        width: 100,
        render: (text) => {
          const validWarehouse = text && WAREHOUSE_TEXTS[text] ? text : 'SEOUL';
          return (
            <span style={FONT_STYLES.BODY.MEDIUM}>
              {WAREHOUSE_TEXTS[validWarehouse] || validWarehouse}
            </span>
          );
        },
        sorter: true,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'order#',
        dataIndex: 'order_no',
        align: 'center',
        width: 130,
        render: (text, record) => (
          <Space size={2}>
            <span style={FONT_STYLES.BODY.MEDIUM}>{text || '-'}</span>
            {renderLockStatus(record)}
          </Space>
        ),
        sorter: true,
        sortDirections: ['ascend', 'descend'],
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
        sorter: (a, b) => {
          const aDate = a.eta ? new Date(a.eta) : null;
          const bDate = b.eta ? new Date(b.eta) : null;
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return aDate - bDate;
        },
        sortDirections: ['ascend', 'descend'],
        defaultSortOrder: 'ascend',
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
        sorter: true,
        sortDirections: ['ascend', 'descend'],
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
          // 상태 값 검증
          if (!status || !STATUS_TEXTS[status]) {
            logger.warn('알 수 없는 상태:', status);
            status = 'WAITING'; // 기본값 적용
          }

          return (
            <Tag
              color={STATUS_COLORS[status] || 'default'}
              style={{
                minWidth: '60px',
                textAlign: 'center',
                fontWeight: 600,
                ...FONT_STYLES.BODY.MEDIUM,
              }}
              className="status-tag"
            >
              {STATUS_TEXTS[status]}
            </Tag>
          );
        },
        sorter: (a, b) => {
          // 상태 우선순위 정의
          const statusPriority = {
            WAITING: 1,
            IN_PROGRESS: 2,
            COMPLETE: 3,
            ISSUE: 4,
            CANCEL: 5,
          };
          return (
            (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99)
          );
        },
        sortDirections: ['ascend', 'descend'],
      },
    ];

    // 관리자 전용 추가 열 (버전 정보)
    if (isAdmin && showVersionColumn) {
      baseColumns.push({
        title: (
          <Tooltip title="락 & 버전 정보 (관리자용)">
            <Space>
              <span>버전</span>
              <InfoCircleOutlined />
            </Space>
          </Tooltip>
        ),
        dataIndex: 'version',
        align: 'center',
        width: 70,
        render: (version, record) => (
          <Tooltip
            title={
              <>
                <div>낙관적 락 버전: {version || 1}</div>
                {record._lock_info && (
                  <div>락 소유자: {record._lock_info.locked_by}</div>
                )}
              </>
            }
          >
            <Badge
              count={version || 1}
              style={{
                backgroundColor: record._lock_info ? '#ff4d4f' : '#1890ff',
                fontSize: '10px',
              }}
            />
          </Tooltip>
        ),
      });
    }

    return baseColumns;
  }, [isAdmin, showVersionColumn, renderLockStatus, logger]);

  // 테이블 CSS 스타일 적용을 위한 클래스 설정
  const tableClassName = `dashboard-table${isAdminPage ? ' admin-table' : ''}`;

  // 가상화 적용 여부 - useMemo로 최적화
  const shouldUseVirtualizedTable = useMemo(() => {
    return filteredData.length > 200; // 200개 이상일 때 가상화 적용
  }, [filteredData.length]);

  return (
    <div className="dashboard-table-container">
      {/* 필터 컴포넌트 */}
      {renderFilters}

      {/* 테이블 컴포넌트 */}
      <Table
        className={tableClassName}
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
            // 일반 사용자 페이지에서는 배차 처리를 위한 선택만 제한 (대기 상태만 선택 가능)
            // 행 클릭을 통한 상세정보 조회는 모든 상태에서 가능
            disabled: isAdminPage ? false : record.status !== 'WAITING',
            name: record.order_no,
          }),
        }}
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          className: `ant-table-row-${(
            record.status || 'WAITING'
          ).toLowerCase()}`,
          style: getRowStyle(record),
          ...onRowOver(record),
        })}
        locale={{
          emptyText: '데이터가 없습니다',
        }}
        // 가상화 적용 (대용량 데이터 최적화)
        virtual={shouldUseVirtualizedTable}
        sortDirections={['ascend', 'descend']}
        sortOrder={sortedInfo.order}
        sortColumn={sortedInfo.columnKey}
      />
    </div>
  );
};

// React.memo와 커스텀 비교 함수를 사용한 최적화
function arePropsEqual(prevProps, nextProps) {
  // 주요 데이터/상태 변경 확인
  if (prevProps.dataSource !== nextProps.dataSource) return false;
  if (prevProps.loading !== nextProps.loading) return false;
  if (prevProps.selectedRows !== nextProps.selectedRows) return false;
  if (prevProps.currentPage !== nextProps.currentPage) return false;

  // 필터 상태 변경 확인
  if (prevProps.typeFilter !== nextProps.typeFilter) return false;
  if (prevProps.departmentFilter !== nextProps.departmentFilter) return false;
  if (prevProps.warehouseFilter !== nextProps.warehouseFilter) return false;
  if (prevProps.orderNoSearch !== nextProps.orderNoSearch) return false;

  // 변경사항 없음, 리렌더링 방지
  return true;
}

export default React.memo(DashboardTable, arePropsEqual);

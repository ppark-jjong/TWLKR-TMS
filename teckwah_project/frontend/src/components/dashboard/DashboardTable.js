// src/components/dashboard/DashboardTable.js
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Table, Tag, Tooltip, Input, Select, Space, Button, Badge } from "antd";
// 개별 아이콘 임포트로 번들 크기 최적화
import SearchOutlined from "@ant-design/icons/SearchOutlined";
import ReloadOutlined from "@ant-design/icons/ReloadOutlined";
import FilterOutlined from "@ant-design/icons/FilterOutlined";
import ClearOutlined from "@ant-design/icons/ClearOutlined";
import InfoCircleOutlined from "@ant-design/icons/InfoCircleOutlined";
import CarOutlined from "@ant-design/icons/CarOutlined";
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
} from "../../utils/Constants";
import { formatDateTime, formatPhoneNumber } from "../../utils/Formatter";
import { useLogger } from "../../utils/LogUtils";
import { useAuth } from "../../contexts/AuthContext";
import "./DashboardTable.css";

const { Option } = Select;

/**
 * 대시보드 테이블 컴포넌트 (최적화 버전)
 * - 백엔드 API와의 연동 최적화
 * - 불필요한 리렌더링 제거
 * - 성능 최적화
 *
 * @param {Object} props - 컴포넌트 속성
 */
const DashboardTable = ({
  dataSource = [], // 표시할 대시보드 데이터 배열
  loading = false, // 로딩 상태
  selectedRows = [], // 선택된 행 배열
  onSelectRows = () => {}, // 행 선택 콜백
  onRowClick = () => {}, // 행 클릭 콜백
  onRefresh = () => {}, // 새로고침 콜백
  currentPage = 1, // 현재 페이지
  pageSize = 50, // 페이지 크기
  onPageChange = () => {}, // 페이지 변경 콜백
  isAdminPage = false, // 관리자 페이지 여부

  // 필터링 관련 props
  typeFilter, // 종류 필터
  departmentFilter, // 부서 필터
  warehouseFilter, // 출발 허브 필터
  orderNoSearch, // 주문번호 검색어
  onTypeFilterChange = () => {}, // 종류 필터 변경 콜백
  onDepartmentFilterChange = () => {}, // 부서 필터 변경 콜백
  onWarehouseFilterChange = () => {}, // 출발 허브 필터 변경 콜백
  onOrderNoSearchChange = () => {}, // 주문번호 검색어 변경 콜백
  onResetFilters = () => {}, // 필터 초기화 콜백
  onApplyFilters = () => {}, // 필터 적용 콜백
}) => {
  const logger = useLogger("DashboardTable");
  const { isAdmin } = useAuth();

  // 로컬 필터링 상태
  const [localTypeFilter, setLocalTypeFilter] = useState(typeFilter);
  const [localDepartmentFilter, setLocalDepartmentFilter] =
    useState(departmentFilter);
  const [localWarehouseFilter, setLocalWarehouseFilter] =
    useState(warehouseFilter);
  const [localOrderNoSearch, setLocalOrderNoSearch] = useState(orderNoSearch);
  const [searchInput, setSearchInput] = useState("");
  const [showVersionColumn, setShowVersionColumn] = useState(isAdmin);
  const [sortedInfo, setSortedInfo] = useState({});

  // 필터링된 데이터 상태
  const [filteredData, setFilteredData] = useState([]);

  // 필터링 실행 플래그
  const isFilteringRef = useRef(false);

  // 외부 props가 변경되면 로컬 상태 업데이트
  useEffect(() => {
    setLocalTypeFilter(typeFilter);
    setLocalDepartmentFilter(departmentFilter);
    setLocalWarehouseFilter(warehouseFilter);
    setLocalOrderNoSearch(orderNoSearch);
  }, [typeFilter, departmentFilter, warehouseFilter, orderNoSearch]);

  /**
   * 필터링된 데이터 계산
   */
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
      // 성능 측정 시작
      const startTime = performance.now();
      logger.debug("테이블 데이터 필터링 시작:", {
        총건수: dataSource.length,
        종류필터: localTypeFilter,
        부서필터: localDepartmentFilter,
        허브필터: localWarehouseFilter,
        주문번호검색: localOrderNoSearch,
      });

      // 원본 데이터 복사
      let result = [...dataSource];

      // 필터 적용
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

      // 성능 측정 완료
      const endTime = performance.now();
      logger.debug(
        `테이블 데이터 필터링 완료: ${result.length}건, ${Math.round(
          endTime - startTime
        )}ms`
      );

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
    logger,
  ]);

  /**
   * 데이터 정렬 함수
   */
  const applySorting = useCallback((data, sorterInfo = {}) => {
    if (!Array.isArray(data)) return [];

    const { columnKey, order } = sorterInfo;

    // 특정 컬럼 정렬이 없는 경우 - 기본 정렬
    if (!columnKey || !order) {
      return data.sort((a, b) => {
        // 상태 그룹화 (대기, 진행 vs 완료, 이슈, 취소)
        const aGroup = ["COMPLETE", "ISSUE", "CANCEL"].includes(a.status)
          ? 1
          : 0;
        const bGroup = ["COMPLETE", "ISSUE", "CANCEL"].includes(b.status)
          ? 1
          : 0;

        // 그룹이 다르면 그룹으로 정렬
        if (aGroup !== bGroup) {
          return aGroup - bGroup;
        }

        // 같은 그룹 내에서는 ETA로 정렬
        const etaA = a.eta ? new Date(a.eta) : new Date(9999, 11, 31);
        const etaB = b.eta ? new Date(b.eta) : new Date(9999, 11, 31);
        return etaA - etaB;
      });
    }

    // 특정 컬럼 정렬이 요청된 경우
    return [...data].sort((a, b) => {
      let result = 0;

      // 컬럼별 정렬 로직
      switch (columnKey) {
        case "order_no":
          // 숫자형 주문번호 정렬
          result = String(a.order_no).localeCompare(
            String(b.order_no),
            undefined,
            {
              numeric: true,
            }
          );
          break;

        case "eta":
          // 날짜 정렬
          const etaA = a.eta ? new Date(a.eta) : new Date(9999, 11, 31);
          const etaB = b.eta ? new Date(b.eta) : new Date(9999, 11, 31);
          result = etaA - etaB;
          break;

        case "create_time":
          // 생성 시간 정렬
          const createTimeA = a.create_time
            ? new Date(a.create_time)
            : new Date(0);
          const createTimeB = b.create_time
            ? new Date(b.create_time)
            : new Date(0);
          result = createTimeA - createTimeB;
          break;

        case "status":
          // 상태 정렬 (WAITING, IN_PROGRESS, COMPLETE, ISSUE, CANCEL 순)
          const statusOrder = {
            WAITING: 1,
            IN_PROGRESS: 2,
            COMPLETE: 3,
            ISSUE: 4,
            CANCEL: 5,
          };
          result =
            (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
          break;

        case "type":
          // 종류 정렬
          result = (a.type || "").localeCompare(b.type || "");
          break;

        case "department":
          // 부서 정렬
          result = (a.department || "").localeCompare(b.department || "");
          break;

        case "warehouse":
          // 출발허브 정렬
          result = (a.warehouse || "").localeCompare(b.warehouse || "");
          break;

        case "version":
          // 버전 정렬 (숫자)
          result = (a.version || 0) - (b.version || 0);
          break;

        default:
          // 기본은 ETA 정렬
          const defaultEtaA = a.eta ? new Date(a.eta) : new Date(9999, 11, 31);
          const defaultEtaB = b.eta ? new Date(b.eta) : new Date(9999, 11, 31);
          result = defaultEtaA - defaultEtaB;
      }

      // 정렬 방향 적용
      return order === "descend" ? -result : result;
    });
  }, []);

  /**
   * 테이블 정렬 변경 핸들러
   */
  const handleTableChange = useCallback(
    (pagination, filters, sorter) => {
      logger.debug("테이블 정렬 변경:", sorter);
      setSortedInfo(sorter);
    },
    [logger]
  );

  /**
   * 행 선택 핸들러
   */
  const rowSelection = useMemo(() => {
    return {
      selectedRowKeys: selectedRows.map((row) => row.dashboard_id),
      onChange: (selectedRowKeys, selectedTableRows) => {
        onSelectRows(selectedTableRows);
      },
      getCheckboxProps: (record) => ({
        disabled: false, // 선택 비활성화 조건
      }),
    };
  }, [selectedRows, onSelectRows]);

  /**
   * 로컬 필터 변경 핸들러
   */
  const handleLocalTypeFilterChange = useCallback(
    (value) => {
      setLocalTypeFilter(value);
      onTypeFilterChange(value);
    },
    [onTypeFilterChange]
  );

  const handleLocalDepartmentFilterChange = useCallback(
    (value) => {
      setLocalDepartmentFilter(value);
      onDepartmentFilterChange(value);
    },
    [onDepartmentFilterChange]
  );

  const handleLocalWarehouseFilterChange = useCallback(
    (value) => {
      setLocalWarehouseFilter(value);
      onWarehouseFilterChange(value);
    },
    [onWarehouseFilterChange]
  );

  const handleLocalOrderNoSearchChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    setLocalOrderNoSearch(searchInput);
    onOrderNoSearchChange(searchInput);
  }, [searchInput, onOrderNoSearchChange]);

  /**
   * 필터 초기화 핸들러
   */
  const handleResetFilters = useCallback(() => {
    setLocalTypeFilter(null);
    setLocalDepartmentFilter(null);
    setLocalWarehouseFilter(null);
    setSearchInput("");
    setLocalOrderNoSearch("");
    onResetFilters();
  }, [onResetFilters]);

  /**
   * 행 클릭 핸들러
   */
  const onRowHandler = useCallback(
    (record) => {
      return {
        onClick: () => {
          onRowClick(record);
        },
        className: `ant-table-row-${record.status?.toLowerCase()}`,
      };
    },
    [onRowClick]
  );

  /**
   * 필터 영역 렌더링
   */
  const renderFilterArea = useMemo(() => {
    return (
      <div className="dashboard-filters">
        <Space size="middle" style={{ width: "100%", flexWrap: "wrap" }}>
          {/* 종류 필터 */}
          <Select
            placeholder="종류"
            style={{ width: 120 }}
            value={localTypeFilter}
            onChange={handleLocalTypeFilterChange}
            allowClear
          >
            {Object.entries(TYPE_TYPES).map(([key, value]) => (
              <Option key={key} value={value}>
                {TYPE_TEXTS[key]}
              </Option>
            ))}
          </Select>

          {/* 부서 필터 */}
          <Select
            placeholder="부서"
            style={{ width: 120 }}
            value={localDepartmentFilter}
            onChange={handleLocalDepartmentFilterChange}
            allowClear
          >
            {Object.entries(DEPARTMENT_TYPES).map(([key, value]) => (
              <Option key={key} value={value}>
                {DEPARTMENT_TEXTS[key]}
              </Option>
            ))}
          </Select>

          {/* 출발 허브 필터 */}
          <Select
            placeholder="출발 허브"
            style={{ width: 120 }}
            value={localWarehouseFilter}
            onChange={handleLocalWarehouseFilterChange}
            allowClear
          >
            {Object.entries(WAREHOUSE_TYPES).map(([key, value]) => (
              <Option key={key} value={value}>
                {WAREHOUSE_TEXTS[key]}
              </Option>
            ))}
          </Select>

          {/* 주문번호 검색 */}
          <Input.Search
            placeholder="주문번호 검색"
            value={searchInput}
            onChange={handleLocalOrderNoSearchChange}
            onSearch={handleSearchSubmit}
            style={{ width: 200 }}
            allowClear
          />

          {/* 필터 버튼 */}
          <Space>
            <Button
              type="primary"
              icon={<FilterOutlined />}
              onClick={onApplyFilters}
            >
              필터 적용
            </Button>
            <Button icon={<ClearOutlined />} onClick={handleResetFilters}>
              필터 초기화
            </Button>
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              새로고침
            </Button>
          </Space>
        </Space>
      </div>
    );
  }, [
    localTypeFilter,
    localDepartmentFilter,
    localWarehouseFilter,
    searchInput,
    handleLocalTypeFilterChange,
    handleLocalDepartmentFilterChange,
    handleLocalWarehouseFilterChange,
    handleLocalOrderNoSearchChange,
    handleSearchSubmit,
    handleResetFilters,
    onApplyFilters,
    onRefresh,
  ]);

  /**
   * 테이블 컬럼 정의
   */
  const columns = useMemo(() => {
    // 기본 컬럼 정의
    const baseColumns = [
      {
        title: "종류",
        dataIndex: "type",
        key: "type",
        width: 70,
        sorter: true,
        sortOrder: sortedInfo.columnKey === "type" && sortedInfo.order,
        render: (type) => (
          <span className={`type-column-${type?.toLowerCase()}`}>
            {TYPE_TEXTS[type] || type || "-"}
          </span>
        ),
      },
      {
        title: "주문번호",
        dataIndex: "order_no",
        key: "order_no",
        width: 120,
        sorter: true,
        sortOrder: sortedInfo.columnKey === "order_no" && sortedInfo.order,
      },
      {
        title: "부서",
        dataIndex: "department",
        key: "department",
        width: 100,
        sorter: true,
        sortOrder: sortedInfo.columnKey === "department" && sortedInfo.order,
        render: (department) =>
          DEPARTMENT_TEXTS[department] || department || "-",
      },
      {
        title: "출발허브",
        dataIndex: "warehouse",
        key: "warehouse",
        width: 100,
        sorter: true,
        sortOrder: sortedInfo.columnKey === "warehouse" && sortedInfo.order,
        render: (warehouse) => WAREHOUSE_TEXTS[warehouse] || warehouse || "-",
      },
      {
        title: "상태",
        dataIndex: "status",
        key: "status",
        width: 80,
        sorter: true,
        sortOrder: sortedInfo.columnKey === "status" && sortedInfo.order,
        render: (status) => (
          <Tag color={STATUS_COLORS[status]} className="status-tag">
            {STATUS_TEXTS[status] || status || "-"}
          </Tag>
        ),
      },
      {
        title: "ETA",
        dataIndex: "eta",
        key: "eta",
        width: 150,
        sorter: true,
        sortOrder: sortedInfo.columnKey === "eta" && sortedInfo.order,
        render: (eta) => formatDateTime(eta),
      },
      {
        title: "접수시각",
        dataIndex: "create_time",
        key: "create_time",
        width: 150,
        sorter: true,
        sortOrder: sortedInfo.columnKey === "create_time" && sortedInfo.order,
        render: (create_time) => formatDateTime(create_time),
      },
      {
        title: "SLA",
        dataIndex: "sla",
        key: "sla",
        width: 80,
      },
      {
        title: "수령인",
        dataIndex: "customer",
        key: "customer",
        width: 120,
      },
      {
        title: "연락처",
        dataIndex: "contact",
        key: "contact",
        width: 130,
        render: (contact) => formatPhoneNumber(contact) || "-",
      },
      {
        title: "배송담당",
        dataIndex: "driver_name",
        key: "driver_name",
        width: 100,
        render: (driver_name) =>
          driver_name ? (
            <span>
              <CarOutlined style={{ marginRight: 4 }} />
              {driver_name}
            </span>
          ) : (
            <span style={{ color: "#d9d9d9" }}>미배차</span>
          ),
      },
      {
        title: "배송연락처",
        dataIndex: "driver_contact",
        key: "driver_contact",
        width: 130,
        render: (driver_contact) => formatPhoneNumber(driver_contact) || "-",
      },
    ];

    // 관리자 or 개발 모드일 때만 버전 컬럼 표시
    if (showVersionColumn) {
      baseColumns.push({
        title: (
          <Tooltip title="데이터 버전 (낙관적 락)">
            <span>
              버전 <InfoCircleOutlined />
            </span>
          </Tooltip>
        ),
        dataIndex: "version",
        key: "version",
        width: 70,
        sorter: true,
        sortOrder: sortedInfo.columnKey === "version" && sortedInfo.order,
      });
    }

    return baseColumns;
  }, [sortedInfo, showVersionColumn]);

  /**
   * 행 클래스 이름 생성 함수
   * 상태별 배경색 적용을 위해 사용
   */
  const getRowClassName = useCallback((record) => {
    return `ant-table-row-${record.status?.toLowerCase()}`;
  }, []);

  return (
    <div
      className={`dashboard-table-container ${
        isAdminPage ? "admin-table" : ""
      }`}
    >
      {/* 필터 영역 */}
      {renderFilterArea}

      {/* 테이블 */}
      <Table
        className="dashboard-table"
        rowKey="dashboard_id"
        dataSource={filteredData.length > 0 ? filteredData : dataSource}
        columns={columns}
        loading={loading}
        rowSelection={rowSelection}
        onChange={handleTableChange}
        onRow={onRowHandler}
        rowClassName={getRowClassName}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          onChange: onPageChange,
          showSizeChanger: false,
          showTotal: (total) => `총 ${total}건`,
        }}
        size="middle"
        scroll={{ x: "max-content" }}
      />
    </div>
  );
};

// 불필요한 리렌더링 방지를 위한 메모이제이션
export default React.memo(DashboardTable, (prevProps, nextProps) => {
  // 데이터 변경 시 항상 리렌더링
  if (prevProps.dataSource !== nextProps.dataSource) return false;
  if (prevProps.loading !== nextProps.loading) return false;
  if (prevProps.selectedRows !== nextProps.selectedRows) return false;
  if (prevProps.currentPage !== nextProps.currentPage) return false;

  // 필터 상태 변경 시 리렌더링
  if (prevProps.typeFilter !== nextProps.typeFilter) return false;
  if (prevProps.departmentFilter !== nextProps.departmentFilter) return false;
  if (prevProps.warehouseFilter !== nextProps.warehouseFilter) return false;
  if (prevProps.orderNoSearch !== nextProps.orderNoSearch) return false;

  // 그 외의 경우 리렌더링 하지 않음
  return true;
});

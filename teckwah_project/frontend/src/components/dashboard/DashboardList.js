// src/components/dashboard/DashboardList.js
import React, { memo, useState, useEffect, useCallback } from "react";
import { Empty, Alert, Button } from "antd";
import DashboardTable from "./DashboardTable";
import LoadingSpin from "../common/LoadingSpin";
import { useLogger } from "../../utils/LogUtils";

/**
 * 대시보드 목록 컴포넌트
 * 테이블, 로딩 상태, 검색 모드 등을 관리하는 래퍼 컴포넌트
 */
const DashboardList = ({
  dashboards,
  loading,
  searchMode,
  orderNoSearch,
  selectedRows,
  onSelectRows,
  onRowClick,
  onRefresh,
  typeFilter,
  departmentFilter,
  warehouseFilter,
  onTypeFilterChange,
  onDepartmentFilterChange,
  onWarehouseFilterChange,
  onOrderNoSearchChange,
  onResetFilters,
  onApplyFilters,
  onPageChange,
  currentPage,
  isAdmin,
  resetSearchMode,
}) => {
  const logger = useLogger("DashboardList");
  const [pageSize] = useState(50);

  // 성능 측정 로그
  useEffect(() => {
    if (dashboards && !loading) {
      logger.debug(`DashboardList 렌더링: ${dashboards.length}건 데이터`);
    }
  }, [dashboards, loading, logger]);

  // 메모이제이션된 이벤트 핸들러
  const handleSelectRows = useCallback(
    (rows) => {
      logger.debug(`${rows.length}개 행 선택됨`);
      onSelectRows(rows);
    },
    [onSelectRows, logger]
  );

  const handleRowClick = useCallback(
    (record) => {
      logger.debug(`행 클릭: ID=${record.dashboard_id}`);
      onRowClick(record);
    },
    [onRowClick, logger]
  );

  const handlePageChange = useCallback(
    (page) => {
      logger.debug(`페이지 변경: ${page}페이지로 이동`);
      onPageChange(page);
    },
    [onPageChange, logger]
  );

  const handleApplyFilters = useCallback(() => {
    logger.debug("필터 적용 버튼 클릭");
    onApplyFilters();
  }, [onApplyFilters, logger]);

  const handleResetFilters = useCallback(() => {
    logger.debug("필터 초기화 버튼 클릭");
    onResetFilters();
  }, [onResetFilters, logger]);

  const handleResetSearchMode = useCallback(() => {
    logger.debug("검색 모드 초기화");
    resetSearchMode();
  }, [resetSearchMode, logger]);

  // 상태별 UI 렌더링
  if (loading) {
    return <LoadingSpin tip="데이터 불러오는 중..." />;
  }

  if (dashboards.length === 0) {
    return <Empty description="조회된 데이터가 없습니다" />;
  }

  return (
    <div className="dashboard-list-container">
      {/* 검색 모드 표시 */}
      {searchMode && orderNoSearch && (
        <Alert
          message={`주문번호로 검색 중: "${orderNoSearch}"`}
          type="info"
          showIcon
          action={
            <Button size="small" onClick={handleResetSearchMode}>
              검색 초기화
            </Button>
          }
          style={{ marginBottom: "16px" }}
        />
      )}

      {/* 대시보드 테이블 - 최적화된 콜백 함수 전달 */}
      <DashboardTable
        dataSource={dashboards}
        loading={loading}
        selectedRows={selectedRows}
        onSelectRows={handleSelectRows}
        onRowClick={handleRowClick}
        onRefresh={onRefresh}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        isAdminPage={isAdmin}
        // 필터링 관련 props
        typeFilter={typeFilter}
        departmentFilter={departmentFilter}
        warehouseFilter={warehouseFilter}
        orderNoSearch={orderNoSearch}
        onTypeFilterChange={onTypeFilterChange}
        onDepartmentFilterChange={onDepartmentFilterChange}
        onWarehouseFilterChange={onWarehouseFilterChange}
        onOrderNoSearchChange={onOrderNoSearchChange}
        onResetFilters={handleResetFilters}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
};

// 메모이제이션을 위한 props 비교 함수
function arePropsEqual(prevProps, nextProps) {
  // 주요 데이터/상태 변경 확인
  if (prevProps.dashboards !== nextProps.dashboards) return false;
  if (prevProps.loading !== nextProps.loading) return false;
  if (prevProps.searchMode !== nextProps.searchMode) return false;
  if (prevProps.orderNoSearch !== nextProps.orderNoSearch) return false;
  if (prevProps.selectedRows !== nextProps.selectedRows) return false;
  if (prevProps.currentPage !== nextProps.currentPage) return false;

  // 필터 상태 변경 확인
  if (prevProps.typeFilter !== nextProps.typeFilter) return false;
  if (prevProps.departmentFilter !== nextProps.departmentFilter) return false;
  if (prevProps.warehouseFilter !== nextProps.warehouseFilter) return false;

  // 변경사항 없음, 리렌더링 방지
  return true;
}

// 메모이제이션 적용하여 불필요한 리렌더링 방지
export default memo(DashboardList, arePropsEqual);

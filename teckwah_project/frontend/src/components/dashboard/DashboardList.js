// src/components/dashboard/DashboardList.js
import React, { memo, useState, useEffect } from 'react';
import { Empty, Alert } from 'antd';
import DashboardTable from './DashboardTable';
import LoadingSpin from '../common/LoadingSpin';

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
  const [pageSize] = useState(50);

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
      {searchMode && (
        <Alert
          message={`주문번호로 검색 중: "${orderNoSearch}"`}
          type="info"
          showIcon
          action={
            <Button size="small" onClick={resetSearchMode}>
              검색 초기화
            </Button>
          }
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 대시보드 테이블 */}
      <DashboardTable
        dataSource={dashboards}
        loading={loading}
        selectedRows={selectedRows}
        onSelectRows={onSelectRows}
        onRowClick={onRowClick}
        onRefresh={onRefresh}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={onPageChange}
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
        onResetFilters={onResetFilters}
        onApplyFilters={onApplyFilters}
      />
    </div>
  );
};

// 메모이제이션 적용하여 불필요한 리렌더링 방지
export default memo(DashboardList);

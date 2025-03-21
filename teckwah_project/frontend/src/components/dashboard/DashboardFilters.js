// src/components/dashboard/DashboardFilters.js
import React, { memo, useMemo } from 'react';
import { Space, Select, Button, Input } from 'antd';
import {
  FilterOutlined,
  ClearOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  TYPE_TYPES,
  TYPE_TEXTS,
  WAREHOUSE_TYPES,
  WAREHOUSE_TEXTS,
  DEPARTMENT_TYPES,
  DEPARTMENT_TEXTS,
} from '../../utils/Constants';

const { Option } = Select;
const { Search } = Input;

/**
 * 대시보드 필터링 컴포넌트
 * 각종 필터 옵션 및 검색 기능 제공
 *
 * @param {Object} props - 컴포넌트 속성
 */
const DashboardFilters = ({
  filters = {},
  onFilterChange = () => {},
  onResetFilters = () => {},
  onApplyFilters = () => {},
  onRefresh = () => {},
  onOrderNoSearchChange = () => {},
  searchLoading = false,
}) => {
  // 필터 상태 추출
  const { typeFilter, departmentFilter, warehouseFilter, searchInput } =
    filters;

  /**
   * 타입별 옵션 항목 렌더링
   */
  const typeOptions = useMemo(() => {
    return Object.entries(TYPE_TYPES).map(([key, value]) => (
      <Option key={key} value={value}>
        {TYPE_TEXTS[key]}
      </Option>
    ));
  }, []);

  /**
   * 부서별 옵션 항목 렌더링
   */
  const departmentOptions = useMemo(() => {
    return Object.entries(DEPARTMENT_TYPES).map(([key, value]) => (
      <Option key={key} value={value}>
        {DEPARTMENT_TEXTS[key]}
      </Option>
    ));
  }, []);

  /**
   * 창고별 옵션 항목 렌더링
   */
  const warehouseOptions = useMemo(() => {
    return Object.entries(WAREHOUSE_TYPES).map(([key, value]) => (
      <Option key={key} value={value}>
        {WAREHOUSE_TEXTS[key]}
      </Option>
    ));
  }, []);

  /**
   * 필터 변경 핸들러
   * @param {string} filterType - 필터 유형
   * @param {any} value - 선택된 값
   */
  const handleFilterChange = (filterType, value) => {
    onFilterChange(filterType, value);
  };

  /**
   * 주문번호 검색어 변경 핸들러
   */
  const handleSearchInputChange = (e) => {
    onFilterChange('searchInput', e.target.value);
  };

  return (
    <div className="dashboard-filters">
      <Space size="middle" style={{ width: '100%', flexWrap: 'wrap' }}>
        {/* 종류 필터 */}
        <Select
          placeholder="종류"
          style={{ width: 120 }}
          value={typeFilter}
          onChange={(value) => handleFilterChange('typeFilter', value)}
          allowClear
        >
          {typeOptions}
        </Select>

        {/* 부서 필터 */}
        <Select
          placeholder="부서"
          style={{ width: 120 }}
          value={departmentFilter}
          onChange={(value) => handleFilterChange('departmentFilter', value)}
          allowClear
        >
          {departmentOptions}
        </Select>

        {/* 출발 허브 필터 */}
        <Select
          placeholder="출발 허브"
          style={{ width: 120 }}
          value={warehouseFilter}
          onChange={(value) => handleFilterChange('warehouseFilter', value)}
          allowClear
        >
          {warehouseOptions}
        </Select>

        {/* 주문번호 검색 */}
        <Search
          placeholder="주문번호 검색"
          value={searchInput}
          onChange={handleSearchInputChange}
          onSearch={() => onOrderNoSearchChange(searchInput)}
          style={{ width: 200 }}
          loading={searchLoading}
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
          <Button icon={<ClearOutlined />} onClick={onResetFilters}>
            필터 초기화
          </Button>
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            새로고침
          </Button>
        </Space>
      </Space>
    </div>
  );
};

// 성능 최적화를 위한 메모이제이션
export default memo(DashboardFilters, (prevProps, nextProps) => {
  // 필터 상태가 변경되었을 때만 리렌더링
  return (
    JSON.stringify(prevProps.filters) === JSON.stringify(nextProps.filters) &&
    prevProps.searchLoading === nextProps.searchLoading
  );
});

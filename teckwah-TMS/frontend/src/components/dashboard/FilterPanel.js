import React, { useState } from 'react';
import { Card, Row, Col, Input, DatePicker, Select, Button, Space } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { 
  STATUS_OPTIONS, 
  DEPARTMENT_OPTIONS, 
  WAREHOUSE_OPTIONS, 
  PAGE_SIZE_OPTIONS 
} from '../../utils/constants';

const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * 대시보드 필터링 패널 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Function} props.onFilter - 필터 적용 콜백
 * @param {Function} props.onReset - 필터 초기화 콜백
 * @param {Function} props.onRefresh - 새로고침 콜백
 * @param {Object} props.defaultValues - 기본 필터 값
 */
const FilterPanel = ({ onFilter, onReset, onRefresh, defaultValues = {} }) => {
  // 필터 상태 관리
  const [filters, setFilters] = useState({
    dateRange: defaultValues.dateRange || null,
    status: defaultValues.status || null,
    department: defaultValues.department || null,
    warehouse: defaultValues.warehouse || null,
    keyword: defaultValues.keyword || '',
    pageSize: defaultValues.pageSize || 10,
  });

  // 필터 값 변경 핸들러
  const handleChange = (name, value) => {
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  // 필터 적용 핸들러
  const handleApplyFilter = () => {
    if (onFilter) {
      onFilter(filters);
    }
  };

  // 필터 초기화 핸들러
  const handleReset = () => {
    setFilters({
      dateRange: null,
      status: null,
      department: null,
      warehouse: null,
      keyword: '',
      pageSize: 10,
    });
    
    if (onReset) {
      onReset();
    }
  };

  return (
    <Card className="filter-panel" style={{ marginBottom: 16 }}>
      {/* 상단 영역: 날짜 선택 및 검색 */}
      <Row gutter={[16, 16]} align="bottom">
        <Col xs={24} md={12}>
          <label style={{ display: 'block', marginBottom: 8 }}>날짜 범위 (ETA 기준)</label>
          <RangePicker
            style={{ width: '100%' }}
            value={filters.dateRange}
            onChange={(dates) => handleChange('dateRange', dates)}
            placeholder={['시작일', '종료일']}
          />
        </Col>
        <Col xs={24} md={8}>
          <label style={{ display: 'block', marginBottom: 8 }}>검색어</label>
          <Input
            placeholder="주문번호, 고객명, 주소로 검색"
            value={filters.keyword}
            onChange={(e) => handleChange('keyword', e.target.value)}
            suffix={<SearchOutlined />}
            allowClear
          />
        </Col>
        <Col xs={24} md={4}>
          <label style={{ display: 'block', marginBottom: 8 }}>표시 행수</label>
          <Select
            style={{ width: '100%' }}
            value={filters.pageSize}
            onChange={(value) => handleChange('pageSize', value)}
          >
            {PAGE_SIZE_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>{option.label}</Option>
            ))}
          </Select>
        </Col>
      </Row>

      {/* 하단 영역: 상태, 부서, 창고 필터 및 버튼 */}
      <Row gutter={[16, 16]} align="bottom" style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <label style={{ display: 'block', marginBottom: 8 }}>상태</label>
          <Select
            style={{ width: '100%' }}
            placeholder="모든 상태"
            allowClear
            value={filters.status}
            onChange={(value) => handleChange('status', value)}
          >
            {STATUS_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>{option.label}</Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} md={8}>
          <label style={{ display: 'block', marginBottom: 8 }}>부서</label>
          <Select
            style={{ width: '100%' }}
            placeholder="모든 부서"
            allowClear
            value={filters.department}
            onChange={(value) => handleChange('department', value)}
          >
            {DEPARTMENT_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>{option.label}</Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} md={8}>
          <label style={{ display: 'block', marginBottom: 8 }}>창고</label>
          <Select
            style={{ width: '100%' }}
            placeholder="모든 창고"
            allowClear
            value={filters.warehouse}
            onChange={(value) => handleChange('warehouse', value)}
          >
            {WAREHOUSE_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>{option.label}</Option>
            ))}
          </Select>
        </Col>
      </Row>

      {/* 버튼 영역 */}
      <Row justify="end" style={{ marginTop: 16 }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            새로고침
          </Button>
          <Button onClick={handleReset}>
            초기화
          </Button>
          <Button type="primary" icon={<FilterOutlined />} onClick={handleApplyFilter}>
            필터 적용
          </Button>
        </Space>
      </Row>
    </Card>
  );
};

export default FilterPanel;

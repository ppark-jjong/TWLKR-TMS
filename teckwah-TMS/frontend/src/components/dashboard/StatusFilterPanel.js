import React, { useState } from 'react';
import { Card, Row, Col, Select, Button, Space } from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  CarOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  STATUS_OPTIONS,
  DEPARTMENT_OPTIONS,
  WAREHOUSE_OPTIONS,
} from '../../utils/Constants';

const { Option } = Select;

/**
 * 상태 필터 및 액션 버튼 패널 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Function} props.onFilter - 필터 적용 콜백
 * @param {Function} props.onRefresh - 새로고침 콜백
 * @param {Function} props.onReset - 필터 초기화 콜백
 * @param {Function} props.onNewOrder - 신규 주문 생성 콜백
 * @param {Function} props.onAssignDriver - 드라이버 배정 콜백
 * @param {Function} props.onStatusChange - 상태 변경 콜백
 * @param {Object} props.defaultValues - 기본 필터 값
 * @param {boolean} props.hasSelection - 행 선택 여부
 */
const StatusFilterPanel = ({
  onFilter,
  onRefresh,
  onReset,
  onNewOrder,
  onAssignDriver,
  onStatusChange,
  defaultValues = {},
  hasSelection = false,
}) => {
  // 필터 상태 관리
  const [filters, setFilters] = useState({
    status: defaultValues.status || null,
    department: defaultValues.department || null,
    warehouse: defaultValues.warehouse || null,
  });

  // 필터 값 변경 핸들러
  const handleChange = (name, value) => {
    const newFilters = {
      ...filters,
      [name]: value,
    };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  return (
    <Card className="status-filter-panel" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={15}>
          <Space size="middle">
            <Select
              style={{ width: 120 }}
              placeholder="상태"
              allowClear
              value={filters.status}
              onChange={(value) => handleChange('status', value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
            <Select
              style={{ width: 120 }}
              placeholder="부서"
              allowClear
              value={filters.department}
              onChange={(value) => handleChange('department', value)}
            >
              {DEPARTMENT_OPTIONS.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
            <Select
              style={{ width: 120 }}
              placeholder="창고"
              allowClear
              value={filters.warehouse}
              onChange={(value) => handleChange('warehouse', value)}
            >
              {WAREHOUSE_OPTIONS.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
            <Button onClick={onReset}>초기화</Button>
          </Space>
        </Col>
        <Col xs={24} md={9}>
          <Row justify="end">
            <Space>
              <Button icon={<ReloadOutlined />} onClick={onRefresh}>
                새로고침
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={onNewOrder}
              >
                신규 주문
              </Button>
              {hasSelection && (
                <>
                  <Button
                    type="primary"
                    icon={<CarOutlined />}
                    onClick={onAssignDriver}
                  >
                    기사 배정
                  </Button>
                  <Button
                    type="primary"
                    icon={<SyncOutlined />}
                    onClick={onStatusChange}
                  >
                    상태 변경
                  </Button>
                </>
              )}
            </Space>
          </Row>
        </Col>
      </Row>
    </Card>
  );
};

export default StatusFilterPanel;

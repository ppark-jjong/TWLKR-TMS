import React, { useState } from 'react';
import { Card, Row, Col, Input, DatePicker, Button, Space } from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

const { RangePicker } = DatePicker;

/**
 * 날짜 필터 패널 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Function} props.onDateFilter - 날짜 필터 적용 콜백
 * @param {Function} props.onSearch - 검색어 적용 콜백
 * @param {Object} props.defaultValues - 기본 필터 값
 */
const DateFilterPanel = ({ onDateFilter, onSearch, defaultValues = {} }) => {
  // 필터 상태 관리
  const [dateRange, setDateRange] = useState(defaultValues.dateRange || null);
  const [keyword, setKeyword] = useState(defaultValues.keyword || '');

  // 날짜 필터 적용 핸들러
  const handleDateFilterApply = () => {
    if (onDateFilter) {
      onDateFilter({ dateRange });
    }
  };

  // 검색 적용 핸들러
  const handleSearchApply = () => {
    if (onSearch && keyword.trim()) {
      onSearch({ keyword: keyword.trim() });
    }
  };

  // 엔터키 검색 핸들러
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchApply();
    }
  };

  return (
    <Card className="date-filter-panel" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={10}>
          <RangePicker
            style={{ width: '100%' }}
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            placeholder={['시작일', '종료일']}
          />
        </Col>
        <Col xs={24} md={3}>
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            onClick={handleDateFilterApply}
            style={{ width: '100%' }}
          >
            기간 조회
          </Button>
        </Col>
        <Col xs={24} md={8}>
          <Input
            placeholder="주문번호, 고객명, 주소로 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            suffix={<SearchOutlined />}
            allowClear
            onKeyPress={handleKeyPress}
          />
        </Col>
        <Col xs={24} md={3}>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearchApply}
            style={{ width: '100%' }}
            disabled={!keyword.trim()}
          >
            검색
          </Button>
        </Col>
      </Row>
    </Card>
  );
};

export default DateFilterPanel;

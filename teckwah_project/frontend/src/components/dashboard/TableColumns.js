// src/components/dashboard/TableColumns.js
import React from 'react';
import { Tag, Tooltip } from 'antd';
import { InfoCircleOutlined, CarOutlined } from '@ant-design/icons';
import {
  TYPE_TEXTS,
  STATUS_TEXTS,
  STATUS_COLORS,
  DEPARTMENT_TEXTS,
  WAREHOUSE_TEXTS,
} from '../../utils/Constants';
import { formatDateTime, formatPhoneNumber } from '../../utils/Formatter';

/**
 * 대시보드 테이블 컬럼 정의 생성 함수
 * 상황에 따라 동적으로 컬럼 구성을 변경할 수 있음
 *
 * @param {Object} sortedInfo - 현재 정렬 정보
 * @param {boolean} showVersionColumn - 버전 컬럼 표시 여부 (관리자 전용)
 * @returns {Array} 컬럼 설정 배열
 */
const getTableColumns = (sortedInfo = {}, showVersionColumn = false) => {
  // 기본 컬럼 정의
  const baseColumns = [
    {
      title: '종류',
      dataIndex: 'type',
      key: 'type',
      width: 70,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'type' && sortedInfo.order,
      render: (type) => (
        <span className={`type-column-${type?.toLowerCase()}`}>
          {TYPE_TEXTS[type] || type || '-'}
        </span>
      ),
    },
    {
      title: '주문번호',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 120,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'order_no' && sortedInfo.order,
    },
    {
      title: '부서',
      dataIndex: 'department',
      key: 'department',
      width: 100,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'department' && sortedInfo.order,
      render: (department) => DEPARTMENT_TEXTS[department] || department || '-',
    },
    {
      title: '출발허브',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 100,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'warehouse' && sortedInfo.order,
      render: (warehouse) => WAREHOUSE_TEXTS[warehouse] || warehouse || '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'status' && sortedInfo.order,
      render: (status) => (
        <Tag color={STATUS_COLORS[status]} className="status-tag">
          {STATUS_TEXTS[status] || status || '-'}
        </Tag>
      ),
    },
    {
      title: 'ETA',
      dataIndex: 'eta',
      key: 'eta',
      width: 150,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'eta' && sortedInfo.order,
      render: (eta) => formatDateTime(eta),
    },
    {
      title: '접수시각',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 150,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'create_time' && sortedInfo.order,
      render: (create_time) => formatDateTime(create_time),
    },
    {
      title: 'SLA',
      dataIndex: 'sla',
      key: 'sla',
      width: 80,
    },
    {
      title: '수령인',
      dataIndex: 'customer',
      key: 'customer',
      width: 120,
    },
    {
      title: '연락처',
      dataIndex: 'contact',
      key: 'contact',
      width: 130,
      render: (contact) => formatPhoneNumber(contact) || '-',
    },
    {
      title: '배송담당',
      dataIndex: 'driver_name',
      key: 'driver_name',
      width: 100,
      render: (driver_name) =>
        driver_name ? (
          <span>
            <CarOutlined style={{ marginRight: 4 }} />
            {driver_name}
          </span>
        ) : (
          <span style={{ color: '#d9d9d9' }}>미배차</span>
        ),
    },
    {
      title: '배송연락처',
      dataIndex: 'driver_contact',
      key: 'driver_contact',
      width: 130,
      render: (driver_contact) => formatPhoneNumber(driver_contact) || '-',
    },
  ];

  // 관리자 또는 개발 모드일 때만 버전 컬럼 추가
  if (showVersionColumn) {
    baseColumns.push({
      title: (
        <Tooltip title="데이터 버전 (낙관적 락)">
          <span>
            버전 <InfoCircleOutlined />
          </span>
        </Tooltip>
      ),
      dataIndex: 'version',
      key: 'version',
      width: 70,
      sorter: true,
      sortOrder: sortedInfo.columnKey === 'version' && sortedInfo.order,
    });
  }

  return baseColumns;
};

export default getTableColumns;

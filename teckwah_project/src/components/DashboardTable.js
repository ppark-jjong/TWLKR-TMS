// src/components/DashboardTable.js
import React, { useMemo, useState } from 'react';
import { Table, Button, Space, Tag, Select } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import {
  getStatusColor,
  getStatusText,
  hasPermission,
} from '../utils/permissionUtils';
import dayjs from 'dayjs';

/**
 * 대시보드 테이블 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Array} props.data - 대시보드 데이터 배열
 * @param {boolean} props.loading - 로딩 상태
 * @param {Array} props.selectedRowKeys - 선택된 행 키 배열
 * @param {Function} props.onSelectChange - 선택 변경 핸들러
 * @param {Object} props.pagination - 페이지네이션 정보
 * @param {Function} props.onChange - 테이블 변경 핸들러
 * @param {string} props.userRole - 사용자 권한
 * @param {Function} props.onShowStatusModal - 상태 변경 모달 열기 함수
 * @param {Function} props.onRowClick - 행 클릭 핸들러 (상세 정보 표시)
 */
const DashboardTable = ({
  data,
  loading,
  selectedRowKeys = [],
  onSelectChange,
  pagination,
  onChange,
  userRole = 'USER',
  onShowStatusModal,
  onRowClick,
}) => {
  const [pageSize, setPageSize] = useState(pagination?.pageSize || 15);

  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    onChange &&
      onChange({
        ...pagination,
        pageSize: size,
        current: 1, // 페이지 크기가 변경되면 첫 페이지로
      });
  };

  // 권한에 따른 컬럼 설정
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: '주문번호',
        dataIndex: 'order_no',
        key: 'order_no',
        width: 120,
        fixed: 'left',
        align: 'center',
      },
      {
        title: '고객',
        dataIndex: 'customer',
        key: 'customer',
        width: 100,
        align: 'center',
      },
      {
        title: '유형',
        dataIndex: 'type',
        key: 'type',
        width: 80,
        align: 'center',
        render: (type) => (
          <Tag color={type === 'DELIVERY' ? 'blue' : 'purple'}>
            {type === 'DELIVERY' ? '배송' : '회수'}
          </Tag>
        ),
      },
      {
        title: '상태',
        dataIndex: 'status',
        key: 'status',
        width: 80,
        align: 'center',
        render: (status) => (
          <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
        ),
      },
      {
        title: '부서',
        dataIndex: 'department',
        key: 'department',
        width: 80,
        align: 'center',
      },
      {
        title: '창고',
        dataIndex: 'warehouse',
        key: 'warehouse',
        width: 80,
        align: 'center',
      },
      {
        title: 'ETA',
        dataIndex: 'eta',
        key: 'eta',
        width: 150,
        align: 'center',
        render: (eta) => (eta ? dayjs(eta).format('YYYY-MM-DD HH:MM') : '-'),
      },
      {
        title: '배송기사',
        dataIndex: 'driver_name',
        key: 'driver_name',
        width: 120,
        align: 'center',
        render: (driver_name) => driver_name || '-',
      },
      {
        title: '액션',
        key: 'action',
        width: 100,
        fixed: 'right',
        align: 'center',
        render: (_, record) => (
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation(); // 이벤트 버블링 방지
              onShowStatusModal(record);
            }}
            disabled={
              !hasPermission('change_status', userRole) ||
              ['COMPLETE', 'ISSUE', 'CANCEL'].includes(record.status)
            }
          >
            상태변경
          </Button>
        ),
      },
    ];

    return baseColumns;
  }, [userRole, onShowStatusModal]);

  // 페이지네이션 설정 업데이트
  const updatedPagination = {
    ...pagination,
    pageSize,
    showSizeChanger: false, // 기본 사이즈 변경기 비활성화
  };

  return (
    <div className="dashboard-table-container">
      <div
        className="table-options"
        style={{ marginBottom: 16, textAlign: 'right' }}
      >
        <Space>
          <span>표시 행 수:</span>
          <Select
            value={pageSize}
            onChange={handlePageSizeChange}
            options={[
              { value: 15, label: '15행' },
              { value: 30, label: '30행' },
              { value: 50, label: '50행' },
            ]}
            style={{ width: 80 }}
          />
        </Space>
      </div>

      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: onSelectChange,
        }}
        columns={columns}
        dataSource={data}
        rowKey="dashboard_id"
        pagination={updatedPagination}
        onChange={onChange}
        scroll={{ x: 'max-content', y: 'calc(100vh - 340px)' }}
        size="middle"
        loading={loading}
        onRow={(record) => ({
          onClick: () => onRowClick && onRowClick(record.dashboard_id),
          style: { cursor: 'pointer' },
        })}
        sticky={{ offsetHeader: 0 }}
      />
    </div>
  );
};

export default DashboardTable;

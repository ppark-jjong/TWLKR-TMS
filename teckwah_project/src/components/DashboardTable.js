// src/components/DashboardTable.js
import React, { useMemo } from 'react';
import { Table, Button, Space, Tag } from 'antd';
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
 * @param {Function} props.onShowDetailDrawer - 상세 정보 드로어 열기 함수
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
  onShowDetailDrawer,
}) => {
  // 권한에 따른 컬럼 설정
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: '주문번호',
        dataIndex: 'order_no',
        key: 'order_no',
        width: 120,
      },
      {
        title: '고객',
        dataIndex: 'customer',
        key: 'customer',
        width: 100,
      },
      {
        title: '유형',
        dataIndex: 'type',
        key: 'type',
        width: 80,
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
        render: (status) => (
          <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
        ),
      },
      {
        title: '부서',
        dataIndex: 'department',
        key: 'department',
        width: 80,
      },
      {
        title: '창고',
        dataIndex: 'warehouse',
        key: 'warehouse',
        width: 80,
      },
      {
        title: 'ETA',
        dataIndex: 'eta',
        key: 'eta',
        width: 150,
        render: (eta) => (eta ? dayjs(eta).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        title: '배송기사',
        dataIndex: 'driver_name',
        key: 'driver_name',
        width: 120,
        render: (driver_name) => driver_name || '-',
      },
      {
        title: '액션',
        key: 'action',
        width: 150,
        render: (_, record) => (
          <Space size="small">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => onShowStatusModal(record)}
              disabled={
                !hasPermission('change_status', userRole) ||
                ['COMPLETE', 'ISSUE', 'CANCEL'].includes(record.status)
              }
            >
              상태변경
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={() => onShowDetailDrawer(record)}
            >
              상세
            </Button>
          </Space>
        ),
      },
    ];

    return baseColumns;
  }, [userRole, onShowStatusModal, onShowDetailDrawer]);

  return (
    <Table
      rowSelection={{
        selectedRowKeys,
        onChange: onSelectChange,
      }}
      columns={columns}
      dataSource={data}
      rowKey="dashboard_id"
      pagination={pagination}
      onChange={onChange}
      scroll={{ x: 1000 }}
      size="middle"
      loading={loading}
    />
  );
};

export default DashboardTable;

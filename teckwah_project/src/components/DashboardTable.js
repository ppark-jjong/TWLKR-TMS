// src/components/DashboardTable.js
import React, { useMemo, useState, useEffect } from 'react';
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
  // 개발 모드에서 props 변화 모니터링
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group('DashboardTable 렌더링');
      console.log('data 상태:', {
        isDefined: !!data,
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A',
        sample: Array.isArray(data) && data.length > 0 ? data[0] : null,
      });

      console.log('pagination 상태:', pagination);
      console.log('selectedRowKeys 상태:', {
        isDefined: !!selectedRowKeys,
        isArray: Array.isArray(selectedRowKeys),
        length: Array.isArray(selectedRowKeys) ? selectedRowKeys.length : 'N/A',
      });
      console.groupEnd();
    }
  }, [data, pagination, selectedRowKeys]);

  // 페이지 크기 초기값 - pagination에서 안전하게 추출
  const initialPageSize =
    pagination && typeof pagination.pageSize === 'number'
      ? pagination.pageSize
      : 15;

  const [pageSize, setPageSize] = useState(initialPageSize);

  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = (size) => {
    if (!size || typeof size !== 'number') return;

    setPageSize(size);

    if (onChange && typeof onChange === 'function') {
      const safePagination = pagination || {};
      onChange({
        ...safePagination,
        pageSize: size,
        current: 1, // 페이지 크기가 변경되면 첫 페이지로
      });
    }
  };

  // 데이터가 배열인지 확인하고 안전한 배열 보장
  const safeData = Array.isArray(data) ? data : [];

  // 테이블 컬럼에서 안전한 렌더링 함수
  const renderText = (text) =>
    text !== undefined && text !== null ? text : '-';

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
        render: renderText,
        sorter: (a, b) => {
          if (!a || !b) return 0;
          const aValue = a.order_no || '';
          const bValue = b.order_no || '';
          return aValue.localeCompare(bValue);
        },
      },
      {
        title: '고객',
        dataIndex: 'customer',
        key: 'customer',
        width: 100,
        align: 'center',
        render: renderText,
      },
      {
        title: '유형',
        dataIndex: 'type',
        key: 'type',
        width: 80,
        align: 'center',
        render: (type) => {
          if (!type) return <Tag>-</Tag>;
          return (
            <Tag color={type === 'DELIVERY' ? 'blue' : 'purple'}>
              {type === 'DELIVERY' ? '배송' : '회수'}
            </Tag>
          );
        },
      },
      {
        title: '상태',
        dataIndex: 'status',
        key: 'status',
        width: 80,
        align: 'center',
        render: (status) => {
          if (!status) return <Tag>-</Tag>;
          return (
            <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
          );
        },
      },
      {
        title: '부서',
        dataIndex: 'department',
        key: 'department',
        width: 80,
        align: 'center',
        render: renderText,
      },
      {
        title: '창고',
        dataIndex: 'warehouse',
        key: 'warehouse',
        width: 80,
        align: 'center',
        render: renderText,
      },
      {
        title: 'ETA',
        dataIndex: 'eta',
        key: 'eta',
        width: 150,
        align: 'center',
        render: (eta) => (eta ? dayjs(eta).format('YYYY-MM-DD HH:mm') : '-'),
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
        render: (_, record) => {
          // record가 없는 경우 빈 칸 렌더링
          if (!record) return null;

          return (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation(); // 이벤트 버블링 방지
                if (
                  onShowStatusModal &&
                  typeof onShowStatusModal === 'function'
                ) {
                  // 개발 모드에서 액션 추적 로깅
                  if (process.env.NODE_ENV === 'development') {
                    console.log('상태 변경 버튼 클릭:', record.dashboard_id);
                  }
                  onShowStatusModal(record);
                }
              }}
              disabled={
                !hasPermission('change_status', userRole) ||
                !record.status ||
                ['COMPLETE', 'ISSUE', 'CANCEL'].includes(record.status)
              }
            >
              상태변경
            </Button>
          );
        },
      },
    ];

    return baseColumns;
  }, [userRole, onShowStatusModal]);

  // 페이지네이션 설정 업데이트 - 안전 처리
  const updatedPagination = pagination
    ? {
        ...pagination,
        pageSize: pageSize || 15,
        current:
          pagination.current && typeof pagination.current === 'number'
            ? pagination.current
            : 1,
        total:
          pagination.total && typeof pagination.total === 'number'
            ? pagination.total
            : 0,
        showSizeChanger: false, // 기본 사이즈 변경기 비활성화
      }
    : false; // pagination이 없으면 비활성화

  // rowClassName 함수 안전성 보장
  const getRowClassName = (record) => {
    if (!record) return '';

    // 상태에 따른 행 스타일 적용
    switch (record.status) {
      case 'ASSIGNED':
        return 'assigned-row';
      case 'COMPLETED':
        return 'completed-row';
      case 'PENDING':
        return 'pending-row';
      default:
        return '';
    }
  };

  // 행 클릭 이벤트 처리 - 안전 처리
  const handleRowClick = (record) => {
    if (!record || !onRowClick || typeof onRowClick !== 'function') return;

    // 개발 모드에서 액션 추적 로깅
    if (process.env.NODE_ENV === 'development') {
      console.log('행 클릭:', record.dashboard_id);
    }

    if (record.dashboard_id) {
      onRowClick(record.dashboard_id);
    }
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
        rowSelection={
          onSelectChange && Array.isArray(selectedRowKeys)
            ? {
                selectedRowKeys,
                onChange: onSelectChange,
              }
            : undefined
        }
        columns={columns}
        dataSource={safeData}
        rowKey={(record) => record?.dashboard_id || Math.random().toString()}
        pagination={updatedPagination}
        onChange={onChange}
        scroll={{ x: 'max-content', y: 'calc(100vh - 340px)' }}
        size="middle"
        loading={loading}
        rowClassName={getRowClassName}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
        sticky={{ offsetHeader: 0 }}
      />
    </div>
  );
};

export default DashboardTable;

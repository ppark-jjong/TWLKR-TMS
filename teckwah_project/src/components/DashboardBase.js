import React from 'react';
import { Card, Button, Space, Divider, Layout } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

// 내부 컴포넌트 임포트
import DashboardTable from './DashboardTable';
import DashboardSearch from './DashboardSearch';

const { Content } = Layout;

/**
 * 대시보드 기본 컴포넌트 - DashboardPage와 AdminPage의 공통 로직
 */
const DashboardBase = ({
  title,
  userRole,
  data,
  isLoading,
  searchParams,
  filterOptions,
  handleSearch,
  handlePaginationChange,
  handleDateRangeChange,
  refreshData,
  totalItems,
  dateRange,
  selectedRowKeys,
  onSelectChange,
  showStatusModal,
  showDetailModal,
  additionalActions,
  children,
}) => {
  return (
    <Content style={{ padding: '20px' }}>
      <Card
        title={
          title || (userRole === 'ADMIN' ? '관리자 대시보드' : '배송 대시보드')
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={refreshData}
              loading={isLoading}
            >
              새로고침
            </Button>
            {additionalActions}
          </Space>
        }
      >
        <DashboardSearch
          filterOptions={filterOptions}
          dateRange={dateRange}
          onSearch={handleSearch}
          onDateChange={handleDateRangeChange}
        />
        <Divider />
        <DashboardTable
          data={data}
          loading={isLoading}
          searchParams={searchParams}
          selectedRowKeys={selectedRowKeys}
          onSelectChange={onSelectChange}
          onShowStatusModal={showStatusModal}
          onShowDetailModal={showDetailModal}
          totalItems={totalItems}
          onPaginationChange={handlePaginationChange}
          userRole={userRole}
        />
        {children}
      </Card>
    </Content>
  );
};

DashboardBase.propTypes = {
  title: PropTypes.string,
  userRole: PropTypes.string.isRequired,
  data: PropTypes.array,
  isLoading: PropTypes.bool,
  searchParams: PropTypes.object,
  filterOptions: PropTypes.object,
  handleSearch: PropTypes.func.isRequired,
  handlePaginationChange: PropTypes.func.isRequired,
  handleDateRangeChange: PropTypes.func.isRequired,
  refreshData: PropTypes.func.isRequired,
  totalItems: PropTypes.number,
  dateRange: PropTypes.array,
  selectedRowKeys: PropTypes.array,
  onSelectChange: PropTypes.func,
  showStatusModal: PropTypes.func,
  showDetailModal: PropTypes.func,
  additionalActions: PropTypes.node,
  children: PropTypes.node,
};

export default DashboardBase;

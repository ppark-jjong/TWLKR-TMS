// src/pages/DashboardPage.js
import React from 'react';
import { Card, Button, Space, Divider, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

// 개선된 통합 훅 사용
import useDashboard from '../hooks/useDashboard';

// 공통 컴포넌트
import DashboardTable from '../components/DashboardTable';
import DashboardSearch from '../components/DashboardSearch';
import StatusChangeModal from '../components/StatusChangeModal';
import AssignDriverModal from '../components/AssignDriverModal';
import DashboardDetailDrawer from '../components/DashboardDetailDrawer';
import LockConflictModal from '../components/LockConflictModal';
import CreateDashboardModal from '../components/CreateDashboardModal';
import LoadingSpinner from '../components/LoadingSpinner';

const DashboardPage = () => {
  // 대시보드 통합 훅 사용
  const dashboard = useDashboard('USER');

  return (
    <div>
      <Card
        title="대시보드"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={dashboard.refreshData}>
              새로고침
            </Button>
            <Button
              type="primary"
              onClick={() => dashboard.setCreateModalVisible(true)}
            >
              신규 등록
            </Button>
          </Space>
        }
      >
        {/* 검색 컴포넌트 */}
        <DashboardSearch
          onSearch={dashboard.handleSearch}
          onReset={dashboard.handleReset}
        />

        <Divider />

        {/* 테이블 컴포넌트 */}
        {dashboard.isLoading ? (
          <LoadingSpinner tip="데이터를 불러오는 중..." />
        ) : (
          <>
            <Space style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                disabled={dashboard.selectedRowKeys.length === 0}
                onClick={dashboard.showAssignModal}
              >
                배차 처리 ({dashboard.selectedRowKeys.length}건)
              </Button>
            </Space>

            <DashboardTable
              data={dashboard.data?.items || []}
              meta={dashboard.meta}
              loading={dashboard.isLoading}
              selectedRowKeys={dashboard.selectedRowKeys}
              onSelectChange={dashboard.onSelectChange}
              onChange={dashboard.handleTableChange}
              onStatusChange={dashboard.showStatusModal}
              onDetailView={dashboard.fetchDashboardDetail}
            />
          </>
        )}
      </Card>

      {/* 상태 변경 모달 */}
      <StatusChangeModal
        visible={dashboard.statusModalVisible}
        onCancel={dashboard.closeStatusModal}
        onOk={dashboard.handleStatusSubmit}
        form={dashboard.statusForm}
        confirmLoading={dashboard.statusMutation.isLoading}
      />

      {/* 배차 처리 모달 */}
      <AssignDriverModal
        visible={dashboard.assignModalVisible}
        onCancel={dashboard.closeAssignModal}
        onOk={dashboard.handleAssignSubmit}
        form={dashboard.assignForm}
        confirmLoading={dashboard.assignMutation.isLoading}
        selectedCount={dashboard.selectedRowKeys.length}
      />

      {/* 상세 정보 드로어 */}
      <DashboardDetailDrawer
        visible={dashboard.detailVisible}
        onClose={dashboard.closeDetailDrawer}
        form={dashboard.detailForm}
        dashboard={dashboard.currentDashboard}
      />

      {/* 신규 등록 모달 */}
      <CreateDashboardModal
        visible={dashboard.createModalVisible}
        onCancel={() => dashboard.setCreateModalVisible(false)}
        onSuccess={() => {
          dashboard.setCreateModalVisible(false);
          dashboard.refreshData();
        }}
      />

      {/* 락 충돌 모달 */}
      <LockConflictModal
        visible={!!dashboard.lockConflictInfo}
        lockInfo={dashboard.lockConflictInfo || {}}
        onCancel={dashboard.cancelLock}
        onRetry={dashboard.retryLock}
      />
    </div>
  );
};

export default DashboardPage;

// src/pages/DashboardPage.js
import React, { useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Divider,
  message,
  Form,
  DatePicker,
  Row,
  Col,
  Input,
  Select,
  Layout,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateStatus, assignDriver, getDashboardDetail } from '../utils/api';
import { getUserFromToken } from '../utils/authHelpers';
import { handleApiError } from '../utils/errorHandlers';
import { DashboardItemType, UserType } from '../types.js';
import PropTypes from 'prop-types';
import locale from 'antd/es/date-picker/locale/ko_KR';
import dayjs from 'dayjs';

// 커스텀 훅 가져오기
import useDashboardData from '../hooks/useDashboardData';
import useDashboardLock from '../hooks/useDashboardLock';
import useDashboardModals from '../hooks/useDashboardModals';

// 공통 컴포넌트 가져오기
import DashboardTable from '../components/DashboardTable';
import DashboardSearch from '../components/DashboardSearch';
import StatusChangeModal from '../components/StatusChangeModal';
import AssignDriverModal from '../components/AssignDriverModal';
import DashboardDetailModal from '../components/DashboardDetailModal';
import LockConflictModal from '../components/LockConflictModal';
import CreateDashboardModal from '../components/CreateDashboardModal';
import LoadingSpinner from '../components/LoadingSpinner';

const { RangePicker } = DatePicker;

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const [createModalVisible, setCreateModalVisible] = React.useState(false);

  // 커스텀 훅 사용
  const {
    dashboards: data,
    isLoading,
    searchParams,
    filterOptions,
    handleSearch,
    handlePaginationChange,
    handleDateRangeChange,
    refetch: refreshData,
    totalItems,
    dateRange,
  } = useDashboardData('USER');

  // 선택된 행 상태 관리
  const [selectedRowKeys, setSelectedRowKeys] = React.useState([]);
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const {
    lockConflictInfo,
    isLockLoading,
    handleAcquireLock: acquireLock,
    handleReleaseLock: releaseLock,
    handleAcquireMultipleLocks: acquireMultipleLocks,
    handleReleaseMultipleLocks: releaseMultipleLocks,
    handleCancelLock: cancelLock,
    handleRetryLock: retryLock,
  } = useDashboardLock();

  const {
    statusForm,
    assignForm,
    detailForm,
    statusModalVisible,
    assignModalVisible,
    detailModalVisible,
    currentDashboard,
    setCurrentDashboard,
    openStatusModal,
    closeStatusModal,
    openAssignModal,
    closeAssignModal,
    openDetailModal,
    closeDetailModal,
  } = useDashboardModals();

  // 상태 변경 뮤테이션
  const statusMutation = useMutation(({ id, data }) => updateStatus(id, data), {
    onSuccess: () => {
      message.success('상태가 변경되었습니다');
      closeStatusModal();
      queryClient.invalidateQueries(['dashboards']);

      // 락 해제
      if (currentDashboard) {
        releaseLock(currentDashboard.dashboard_id, 'STATUS');
      }
    },
    onError: (error) => {
      handleApiError(error, {
        context: '상태 변경',
      });

      // 오류 발생해도 락 해제 시도
      if (currentDashboard) {
        releaseLock(currentDashboard.dashboard_id, 'STATUS');
      }
    },
  });

  // 배차 처리 뮤테이션
  const assignMutation = useMutation((data) => assignDriver(data), {
    onSuccess: () => {
      message.success('배차가 완료되었습니다');
      closeAssignModal();
      setSelectedRowKeys([]);
      queryClient.invalidateQueries(['dashboards']);

      // 락 해제
      releaseMultipleLocks(selectedRowKeys, 'ASSIGN');
    },
    onError: (error) => {
      handleApiError(error, {
        context: '배차 처리',
      });

      // 오류 발생해도 락 해제 시도
      releaseMultipleLocks(selectedRowKeys, 'ASSIGN');
    },
  });

  // 상태 변경 모달 열기 (락 획득 후)
  const showStatusModal = (record) => {
    setCurrentDashboard(record);

    // 락 획득 후 모달 오픈
    acquireLock(record.dashboard_id, 'STATUS', () => {
      openStatusModal(record);
    });
  };

  // 상세 정보 모달 열기
  const showDetailModal = async (id) => {
    try {
      const response = await getDashboardDetail(id);
      if (response && response.data && response.data.success) {
        const dashboardData = response.data.data;
        openDetailModal(dashboardData);
      } else {
        message.error('상세 정보를 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('상세 정보 조회 오류:', error);
      message.error('상세 정보를 불러오는데 실패했습니다');
    }
  };

  // 배차 모달 열기 (락 획득 후)
  const showAssignModal = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('배차할 항목을 선택해주세요');
      return;
    }

    // 다중 락 획득 후 모달 오픈
    acquireMultipleLocks(selectedRowKeys, 'ASSIGN', () => {
      openAssignModal();
    });
  };

  // 상태 변경 제출
  const handleStatusSubmit = () => {
    statusForm
      .validateFields()
      .then((values) => {
        if (!currentDashboard) return;

        statusMutation.mutate({
          id: currentDashboard.dashboard_id,
          data: {
            status: values.status,
            is_admin: false, // 일반 사용자 권한
          },
        });
      })
      .catch((err) => {
        console.error('Form validation error:', err);
      });
  };

  // 상세 정보 모달에서 상태 변경
  const handleStatusChangeInModal = async (status) => {
    if (!currentDashboard) return;

    try {
      // 락 획득
      const lockAcquired = await acquireLock(
        currentDashboard.dashboard_id,
        'STATUS'
      );

      if (lockAcquired) {
        // 상태 변경 요청
        const response = await updateStatus(currentDashboard.dashboard_id, {
          status,
          is_admin: false,
        });

        if (response.data && response.data.success) {
          message.success('상태가 변경되었습니다');
          closeDetailModal();
          refreshData();
        } else {
          message.error(response.data?.message || '상태 변경에 실패했습니다');
        }

        // 락 해제
        await releaseLock(currentDashboard.dashboard_id, 'STATUS');
      }
    } catch (error) {
      handleApiError(error, { context: '상태 변경' });

      // 락 해제 시도
      releaseLock(currentDashboard.dashboard_id, 'STATUS');
    }
  };

  // 배차 처리 제출
  const handleAssignSubmit = () => {
    assignForm
      .validateFields()
      .then((values) => {
        if (selectedRowKeys.length === 0) return;

        assignMutation.mutate({
          dashboard_ids: selectedRowKeys,
          driver_name: values.driver_name,
          driver_contact: values.driver_contact,
        });
      })
      .catch((err) => {
        console.error('Form validation error:', err);
      });
  };

  // 에러 발생 시 뒤로가기
  const handleErrorBack = () => {
    message.info('이전 화면으로 돌아갑니다');
    window.history.back();
  };

  // 이전 검색 조건 복원
  useEffect(() => {
    const user = getUserFromToken();
    if (user) {
      handleSearch({ department: user.user_department });
    }
  }, [handleSearch]);

  // 페이지네이션 설정
  const pagination = {
    current: searchParams?.page || 1,
    pageSize: searchParams?.size || 10,
    total: totalItems,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `총 ${total}개`,
  };

  // 테이블 변경 핸들러
  const handleTableChange = (pagination, filters, sorter) => {
    handlePaginationChange(pagination.current, pagination.pageSize);
  };

  // 필터 초기화 핸들러
  const handleReset = () => {
    handleSearch({
      status: undefined,
      department: undefined,
      warehouse: undefined,
      search_term: '',
    });
  };

  return (
    <Layout
      className="dashboard-layout"
      style={{ background: 'white', padding: '16px' }}
    >
      <Card
        className="dashboard-card"
        bordered={false}
        style={{
          width: '100%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderRadius: '8px',
          padding: '8px',
        }}
      >
        {/* 상단 날짜 선택 및 검색창 */}
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={14}>
            <Form layout="inline">
              <Form.Item label="기간 선택" style={{ marginBottom: 0 }}>
                <RangePicker
                  locale={locale}
                  format="YYYY-MM-DD"
                  onChange={handleDateRangeChange}
                  value={[
                    searchParams.start_date
                      ? dayjs(searchParams.start_date)
                      : null,
                    searchParams.end_date ? dayjs(searchParams.end_date) : null,
                  ]}
                  allowClear
                  style={{ width: '280px' }}
                />
                <span className="date-range-info">
                  ETA 범위: {dateRange.min} ~ {dateRange.max}
                </span>
              </Form.Item>
            </Form>
          </Col>
          <Col xs={24} md={10} style={{ textAlign: 'right' }}>
            <Input.Search
              placeholder="주문번호 검색"
              onSearch={(value) => handleSearch({ search_term: value })}
              style={{ width: 280 }}
              allowClear
              size="middle"
            />
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        {/* 필터링 및 액션 버튼 영역 */}
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={16}>
            <Space wrap size="middle">
              <Select
                placeholder="상태 필터"
                style={{ width: 120 }}
                onChange={(value) => handleSearch({ status: value })}
                allowClear
                options={[
                  { value: 'PENDING', label: '대기중' },
                  { value: 'ASSIGNED', label: '배차완료' },
                  { value: 'IN_TRANSIT', label: '이동중' },
                  { value: 'DELIVERED', label: '배송완료' },
                  { value: 'COMPLETE', label: '완료' },
                  { value: 'ISSUE', label: '문제발생' },
                  { value: 'CANCEL', label: '취소' },
                ]}
                value={searchParams.status || undefined}
              />
              <Select
                placeholder="부서 필터"
                style={{ width: 120 }}
                onChange={(value) => handleSearch({ department: value })}
                allowClear
                options={filterOptions.departments.map((dept) => ({
                  value: dept,
                  label: dept,
                }))}
                value={searchParams.department || undefined}
              />
              <Select
                placeholder="창고 필터"
                style={{ width: 120 }}
                onChange={(value) => handleSearch({ warehouse: value })}
                allowClear
                options={filterOptions.warehouses.map((wh) => ({
                  value: wh,
                  label: wh,
                }))}
                value={searchParams.warehouse || undefined}
              />
              <Button type="primary" onClick={handleReset}>
                필터 초기화
              </Button>
            </Space>
          </Col>
          <Col xs={24} lg={8} style={{ textAlign: 'right' }}>
            <Space size="middle">
              <Button
                type="primary"
                onClick={showAssignModal}
                disabled={!selectedRowKeys.length}
              >
                배차 처리
              </Button>
              <Button
                type="default"
                onClick={() => setCreateModalVisible(true)}
              >
                신규 등록
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        {/* 데이터 테이블 */}
        <div className="responsive-table">
          <DashboardTable
            data={data}
            loading={isLoading}
            selectedRowKeys={selectedRowKeys}
            onSelectChange={onSelectChange}
            pagination={pagination}
            onChange={handleTableChange}
            userRole="USER"
            onShowStatusModal={showStatusModal}
            onRowClick={showDetailModal}
          />
        </div>
      </Card>

      {/* 상태 변경 모달 */}
      <StatusChangeModal
        open={statusModalVisible}
        onOk={handleStatusSubmit}
        onCancel={closeStatusModal}
        form={statusForm}
        confirmLoading={statusMutation.isLoading}
        dashboard={currentDashboard}
        userRole="USER"
      />

      {/* 배차 처리 모달 */}
      <AssignDriverModal
        open={assignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={closeAssignModal}
        form={assignForm}
        confirmLoading={assignMutation.isLoading}
        selectedCount={selectedRowKeys.length}
      />

      {/* 상세 정보 모달 */}
      <DashboardDetailModal
        open={detailModalVisible}
        onCancel={closeDetailModal}
        dashboard={currentDashboard}
        onStatusChange={handleStatusChangeInModal}
        userRole="USER"
        form={detailForm}
      />

      {/* 락 충돌 모달 */}
      <LockConflictModal
        open={!!lockConflictInfo}
        lockInfo={lockConflictInfo}
        onCancel={cancelLock}
        onRetry={retryLock}
        confirmLoading={isLockLoading}
      />

      {/* 주문 추가 모달 */}
      <CreateDashboardModal
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          refreshData();
        }}
      />
    </Layout>
  );
};

DashboardPage.propTypes = {
  userRole: PropTypes.oneOf(['ADMIN', 'USER']),
};

export default DashboardPage;

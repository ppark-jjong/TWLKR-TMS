// src/pages/AdminPage.js
import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  DatePicker,
  Button,
  Row,
  Col,
  message,
  Popconfirm,
  Divider,
  Space,
  Typography,
  Table,
  Tabs,
  Input,
  Modal,
  Select,
  Radio,
  Tooltip,
  Layout,
  Spin,
} from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  UserAddOutlined,
  UserOutlined,
  LockOutlined,
  EditOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import locale from 'antd/es/date-picker/locale/ko_KR';
import dayjs from 'dayjs';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  downloadExcel,
  getDownloadDateRange,
  deleteDashboards,
  getDashboardDetail,
  updateStatus,
  assignDriver,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  fetchAdminData,
} from '../utils/api';
import { isAdmin } from '../utils/authHelpers';
import { formatDate } from '../utils/dateUtils';
import { handleApiError } from '../utils/errorHandlers';

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
import LoadingSpinner from '../components/LoadingSpinner';
import UserTable from '../components/UserTable';
import CreateDashboardModal from '../components/CreateDashboardModal';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { Content } = Layout;

const AdminPage = ({ activeTab = 'dashboard' }) => {
  const queryClient = useQueryClient();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 현재 활성화된 탭 상태
  const [currentTab, setCurrentTab] = useState(activeTab);

  // 선택된 행 상태 관리 추가
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

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
  } = useDashboardData('ADMIN');

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
    setCreateModalVisible,
    createModalVisible,
  } = useDashboardModals();

  // 상태 변경 뮤테이션
  const statusMutation = useMutation(({ id, data }) => updateStatus(id, data), {
    onSuccess: () => {
      message.success('상태가 변경되었습니다');
      closeStatusModal();
      queryClient.invalidateQueries(['admin-dashboards']);

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
      queryClient.invalidateQueries(['admin-dashboards']);

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

  // 삭제 뮤테이션
  const deleteMutation = useMutation((ids) => deleteDashboards(ids), {
    onSuccess: () => {
      message.success('선택한 항목이 삭제되었습니다');
      setSelectedRowKeys([]);
      queryClient.invalidateQueries(['admin-dashboards']);
    },
    onError: (error) => {
      handleApiError(error, {
        context: '삭제',
      });
    },
    onSettled: () => {
      setDeleteLoading(false);
    },
  });

  // 관리자 데이터 조회
  const {
    data: adminData,
    isLoading: adminDataLoading,
    error: adminDataError,
  } = useQuery(
    ['adminData', searchParams],
    () => fetchAdminData(searchParams),
    {
      enabled: isAdmin(),
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

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

  // 다운로드 처리 함수
  const handleDownload = async () => {
    setDownloadLoading(true);

    try {
      const response = await downloadExcel(searchParams);

      // Create blob URL and trigger download
      const blob = new Blob([response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `dashboard-export-${formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`
      );
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('파일이 다운로드되었습니다.');
    } catch (error) {
      handleApiError(error, '엑셀 다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloadLoading(false);
    }
  };

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
            is_admin: true, // 관리자 권한
          },
        });
      })
      .catch((error) => {
        message.error('폼 검증에 실패했습니다');
      });
  };

  // 상태 변경 처리
  const handleStatusChange = async (dashboardIds, newStatus) => {
    try {
      // 각 대시보드 ID에 대해 상태 변경 API 호출
      await Promise.all(
        dashboardIds.map((id) =>
          statusMutation.mutateAsync({
            id: id,
            data: {
              status: newStatus,
              is_admin: true,
            },
          })
        )
      );
      message.success('상태가 성공적으로 변경되었습니다.');
      closeStatusModal();
      queryClient.invalidateQueries(['admin-dashboards']);
    } catch (error) {
      message.error('상태 변경 중 오류가 발생했습니다.');
      console.error('상태 변경 오류:', error);
    }
  };

  // 상세 모달 내에서 상태 변경 처리
  const handleStatusChangeInModal = async (newStatus) => {
    if (!currentDashboard) return;

    try {
      await statusMutation.mutateAsync({
        id: currentDashboard.dashboard_id,
        data: {
          status: newStatus,
          is_admin: true,
        },
      });
      message.success('상태가 성공적으로 변경되었습니다.');
      queryClient.invalidateQueries(['admin-dashboards']);
    } catch (error) {
      message.error('상태 변경 중 오류가 발생했습니다.');
      console.error('상세 모달 상태 변경 오류:', error);
    }
  };

  // 배차 처리 제출
  const handleAssignSubmit = () => {
    assignForm
      .validateFields()
      .then((values) => {
        assignMutation.mutate({
          dashboard_ids: selectedRowKeys,
          driver_name: values.driver_name,
          driver_contact: values.driver_contact,
        });
      })
      .catch((error) => {
        message.error('폼 검증에 실패했습니다');
      });
  };

  // 삭제 처리 (관리자 전용 기능)
  const handleDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('삭제할 항목을 선택해주세요');
      return;
    }

    setDeleteLoading(true);

    // 다중 락 획득 시도
    try {
      // 모든 선택된 항목에 대해 락 획득
      await Promise.all(selectedRowKeys.map((id) => acquireLock(id, 'EDIT')));

      // 락 획득 성공 시 삭제 처리
      deleteMutation.mutate(selectedRowKeys);
    } catch (error) {
      setDeleteLoading(false);
      console.error('Lock acquisition error:', error);

      if (error.response?.data?.error_code === 'LOCK_CONFLICT') {
        // lockConflictInfo는 이제 useDashboardLock 훅에서 관리됨
        message.error('다른 사용자가 편집 중입니다. 나중에 다시 시도해주세요.');
        return;
      }

      message.error('락 획득 중 오류가 발생했습니다');
    }
  };

  // 관리자 권한 확인
  useEffect(() => {
    // 관리자 권한 검증 추가
    if (!isAdmin()) {
      message.error('관리자 권한이 필요합니다');
      window.location.href = '/dashboard';
      return;
    }
  }, []);

  if (!isAdmin()) {
    return (
      <Content className="site-layout-background main-content">
        <Card>
          <Title level={4}>접근 권한이 없습니다.</Title>
          <Text>관리자 권한이 필요한 페이지입니다.</Text>
        </Card>
      </Content>
    );
  }

  // 사용자 관리 탭이 아닌 경우 대시보드 탭 렌더링
  const renderDashboardTab = () => {
    return (
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
              <Popconfirm
                title="선택한 항목을 모두 삭제하시겠습니까?"
                onConfirm={handleDelete}
                okText="예"
                cancelText="아니오"
                disabled={!selectedRowKeys.length}
              >
                <Button
                  danger
                  disabled={!selectedRowKeys.length}
                  loading={deleteLoading}
                >
                  선택 삭제
                </Button>
              </Popconfirm>
              <Button
                type="default"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                loading={downloadLoading}
              >
                엑셀 다운로드
              </Button>
              <Button
                type="primary"
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
            userRole="ADMIN"
            onShowStatusModal={showStatusModal}
            onRowClick={showDetailModal}
          />
        </div>
      </Card>
    );
  };

  return (
    <Layout
      className="dashboard-layout"
      style={{ background: 'white', padding: '16px' }}
    >
      {renderDashboardTab()}

      {/* 상태 변경 모달 */}
      <StatusChangeModal
        open={statusModalVisible}
        onOk={handleStatusSubmit}
        onCancel={closeStatusModal}
        form={statusForm}
        confirmLoading={statusMutation.isLoading}
        dashboard={currentDashboard}
        userRole="ADMIN"
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
        form={detailForm}
        dashboard={currentDashboard}
        onStatusChange={handleStatusChangeInModal}
        userRole="ADMIN"
      />

      {/* 락 충돌 모달 */}
      <LockConflictModal
        open={!!lockConflictInfo}
        lockInfo={lockConflictInfo}
        onRetry={retryLock}
        onCancel={cancelLock}
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
        userRole="ADMIN"
      />
    </Layout>
  );
};

export default AdminPage;

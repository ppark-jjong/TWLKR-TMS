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
  TeamOutlined,
} from '@ant-design/icons';
import locale from 'antd/es/date-picker/locale/ko_KR';
import dayjs from 'dayjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '../utils/api';
import { isAdmin } from '../utils/authHelpers';

// 커스텀 훅 가져오기
import useDashboardData from '../hooks/useDashboardData';
import useDashboardLock from '../hooks/useDashboardLock';
import useDashboardModals from '../hooks/useDashboardModals';

// 공통 컴포넌트 가져오기
import DashboardTable from '../components/DashboardTable';
import DashboardSearch from '../components/DashboardSearch';
import StatusChangeModal from '../components/StatusChangeModal';
import AssignDriverModal from '../components/AssignDriverModal';
import DashboardDetailDrawer from '../components/DashboardDetailDrawer';
import LockConflictModal from '../components/LockConflictModal';
import LoadingSpinner from '../components/LoadingSpinner';
import UserTable from '../components/UserTable';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const AdminPage = ({ activeTab = 'dashboard' }) => {
  const queryClient = useQueryClient();
  const [downloadForm] = Form.useForm();
  const [dateRangeInfo, setDateRangeInfo] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(activeTab);

  // 커스텀 훅 사용
  const {
    data,
    meta,
    isLoading,
    searchParams,
    selectedRowKeys,
    handleSearch,
    handleReset,
    handleTableChange,
    onSelectChange,
    setSelectedRowKeys,
    refreshData,
  } = useDashboardData('ADMIN');

  const {
    lockConflictInfo,
    isLockLoading,
    acquireLock,
    releaseLock,
    acquireMultipleLocks,
    releaseMultipleLocks,
    cancelLock,
    retryLock,
    setLockConflictInfo,
  } = useDashboardLock();

  const {
    statusForm,
    assignForm,
    detailForm,
    statusModalVisible,
    assignModalVisible,
    detailVisible,
    currentDashboard,
    setCurrentDashboard,
    openStatusModal,
    closeStatusModal,
    openAssignModal,
    closeAssignModal,
    openDetailDrawer,
    closeDetailDrawer,
  } = useDashboardModals();

  // 상태 변경 뮤테이션
  const statusMutation = useMutation(({ id, data }) => updateStatus(id, data), {
    onSuccess: () => {
      message.success('상태가 변경되었습니다');
      closeStatusModal();
      queryClient.invalidateQueries('admin-dashboards');

      // 락 해제
      if (currentDashboard) {
        releaseLock(currentDashboard.dashboard_id, 'STATUS');
      }
    },
    onError: (error) => {
      message.error('상태 변경 중 오류가 발생했습니다');
      console.error('Status update error:', error);

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
      queryClient.invalidateQueries('admin-dashboards');

      // 락 해제
      releaseMultipleLocks(selectedRowKeys, 'ASSIGN');
    },
    onError: (error) => {
      message.error('배차 처리 중 오류가 발생했습니다');
      console.error('Assign error:', error);

      // 오류 발생해도 락 해제 시도
      releaseMultipleLocks(selectedRowKeys, 'ASSIGN');
    },
  });

  // 삭제 뮤테이션
  const deleteMutation = useMutation((ids) => deleteDashboards(ids), {
    onSuccess: () => {
      message.success('선택한 항목이 삭제되었습니다');
      setSelectedRowKeys([]);
      queryClient.invalidateQueries('admin-dashboards');
    },
    onError: (error) => {
      message.error('삭제 중 오류가 발생했습니다');
      console.error('Delete error:', error);
    },
    onSettled: () => {
      setDeleteLoading(false);
    },
  });

  // 날짜 범위 정보 조회
  const fetchDateRange = async () => {
    try {
      const response = await getDownloadDateRange();
      if (response.data.success) {
        setDateRangeInfo(response.data.data);

        // 초기 폼 값 설정
        const oldest = response.data.data.oldest_date;
        const latest = response.data.data.latest_date;

        downloadForm.setFieldsValue({
          date_range: [
            dayjs().subtract(7, 'day').isAfter(dayjs(oldest))
              ? dayjs().subtract(7, 'day')
              : dayjs(oldest),
            dayjs(latest),
          ],
        });
      }
    } catch (error) {
      console.error('Date range fetch error:', error);
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

  // 상세 정보 드로어 열기
  const showDetailDrawer = async (id) => {
    try {
      const detail = await getDashboardDetail(id);
      if (detail.data && detail.data.success) {
        const dashboardData = detail.data.data;
        openDetailDrawer(dashboardData);
      } else {
        message.error('상세 정보를 불러오는데 실패했습니다');
      }
    } catch (error) {
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
      .catch((errorInfo) => {
        console.error('Validation Failed:', errorInfo);
      });
  };

  // 배차 처리 제출
  const handleAssignSubmit = () => {
    assignForm
      .validateFields()
      .then((values) => {
        assignMutation.mutate({
          dashboard_ids: selectedRowKeys,
          driver_name: values.driver_name,
          driver_phone: values.driver_phone,
          driver_company: values.driver_company,
          is_admin: true, // 관리자 권한
        });
      })
      .catch((errorInfo) => {
        console.error('Validation Failed:', errorInfo);
      });
  };

  // 엑셀 다운로드
  const handleDownload = () => {
    downloadForm
      .validateFields()
      .then(async (values) => {
        setDownloadLoading(true);
        try {
          const params = {
            start_date: values.date_range[0].format('YYYY-MM-DD'),
            end_date: values.date_range[1].format('YYYY-MM-DD'),
          };

          const response = await downloadExcel(params);

          // Blob 생성 및 다운로드
          const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `배송_데이터_${params.start_date}_${params.end_date}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          message.success('엑셀 파일 다운로드가 완료되었습니다');
        } catch (error) {
          console.error('Download error:', error);
          message.error('다운로드 중 오류가 발생했습니다');
        } finally {
          setDownloadLoading(false);
        }
      })
      .catch((errorInfo) => {
        console.error('Validation Failed:', errorInfo);
      });
  };

  // 선택한 항목 삭제
  const handleDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('삭제할 항목을 선택해주세요');
      return;
    }

    // 다중 락 획득 후 삭제 실행
    setDeleteLoading(true);
    acquireMultipleLocks(selectedRowKeys, 'DELETE', () => {
      deleteMutation.mutate(selectedRowKeys);
    });
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchDateRange();
  }, []);

  // 탭 변경 처리
  const handleTabChange = (key) => {
    setCurrentTab(key);
  };

  // 대시보드 탭 렌더링
  const renderDashboardTab = () => (
    <div className="admin-dashboard-content">
      <Card title="대시보드 관리" bordered={false}>
        {/* 검색 폼 */}
        <DashboardSearch
          onSearch={handleSearch}
          onReset={handleReset}
          initialValues={searchParams}
          isAdmin={true}
        />

        {/* 테이블 및 작업 영역 */}
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              title="배송 목록"
              extra={
                <Space>
                  <Button
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={refreshData}
                  >
                    새로고침
                  </Button>
                  <Button
                    type="primary"
                    icon={<UserOutlined />}
                    onClick={showAssignModal}
                    disabled={selectedRowKeys.length === 0}
                  >
                    배차처리
                  </Button>
                </Space>
              }
            >
              {isLoading ? (
                <LoadingSpinner tip="데이터 로드 중..." />
              ) : (
                <DashboardTable
                  data={data}
                  isAdmin={true}
                  selectedRowKeys={selectedRowKeys}
                  onSelectChange={onSelectChange}
                  onTableChange={handleTableChange}
                  onStatusChange={showStatusModal}
                  onDetailView={showDetailDrawer}
                  pagination={{
                    current: meta.current_page,
                    pageSize: meta.page_size,
                    total: meta.total_count,
                    showSizeChanger: true,
                    showTotal: (total) => `총 ${total}개 항목`,
                  }}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* 다운로드 및 삭제 기능 */}
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="데이터 다운로드">
              <Form form={downloadForm} layout="vertical">
                <Form.Item
                  name="date_range"
                  label="날짜 범위"
                  rules={[
                    {
                      required: true,
                      message: '날짜 범위를 선택해주세요',
                    },
                  ]}
                >
                  <RangePicker
                    style={{ width: '100%' }}
                    locale={locale}
                    format="YYYY-MM-DD"
                    allowClear={false}
                    disabledDate={(current) => {
                      if (!dateRangeInfo) return false;
                      const oldest = dayjs(dateRangeInfo.oldest_date);
                      const latest = dayjs(dateRangeInfo.latest_date);
                      return (
                        current < oldest.startOf('day') ||
                        current > latest.endOf('day')
                      );
                    }}
                  />
                </Form.Item>

                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                  loading={downloadLoading}
                  style={{ width: '100%' }}
                >
                  엑셀 다운로드
                </Button>
              </Form>
              <div style={{ marginTop: 8, color: 'rgba(0, 0, 0, 0.45)' }}>
                * 다운로드는 최대 한 달 단위로 가능합니다.
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="데이터 삭제">
              <Popconfirm
                title="선택한 항목을 삭제하시겠습니까?"
                description={`총 ${selectedRowKeys.length}개 항목이 삭제됩니다.`}
                onConfirm={handleDelete}
                okText="삭제"
                cancelText="취소"
                icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
                disabled={selectedRowKeys.length === 0}
              >
                <Button
                  danger
                  type="primary"
                  icon={<DeleteOutlined />}
                  loading={deleteLoading}
                  disabled={selectedRowKeys.length === 0}
                  style={{ width: '100%' }}
                >
                  선택 항목 삭제
                </Button>
              </Popconfirm>
              <div style={{ marginTop: 8, color: 'rgba(0, 0, 0, 0.45)' }}>
                * 여기서 삭제된 데이터는 영구적으로 삭제되며 복구할 수 없습니다.
                주의하세요.
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );

  // 사용자 관리 탭 렌더링
  const renderUserTab = () => (
    <div className="admin-users-content">
      <Card title="사용자 관리" bordered={false}>
        <UserTable />
      </Card>
    </div>
  );

  return (
    <div className="admin-page">
      <Tabs
        activeKey={currentTab}
        onChange={handleTabChange}
        size="large"
        type="card"
        items={[
          {
            key: 'dashboard',
            label: (
              <span>
                <SettingOutlined />
                대시보드 관리
              </span>
            ),
            children: renderDashboardTab(),
          },
          {
            key: 'users',
            label: (
              <span>
                <TeamOutlined />
                사용자 관리
              </span>
            ),
            children: renderUserTab(),
          },
        ]}
      />

      {/* 상태 변경 모달 */}
      <StatusChangeModal
        visible={statusModalVisible}
        onOk={handleStatusSubmit}
        onCancel={closeStatusModal}
        form={statusForm}
        confirmLoading={statusMutation.isLoading}
        dashboard={currentDashboard}
        userRole="ADMIN"
      />

      {/* 배차 처리 모달 */}
      <AssignDriverModal
        visible={assignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={closeAssignModal}
        form={assignForm}
        confirmLoading={assignMutation.isLoading}
      />

      {/* 상세 정보 드로어 */}
      <DashboardDetailDrawer
        visible={detailVisible}
        onClose={closeDetailDrawer}
        form={detailForm}
        dashboard={currentDashboard}
      />

      {/* 락 충돌 모달 */}
      <LockConflictModal
        visible={!!lockConflictInfo}
        lockInfo={lockConflictInfo}
        onRetry={retryLock}
        onCancel={cancelLock}
        confirmLoading={isLockLoading}
      />
    </div>
  );
};

export default AdminPage;

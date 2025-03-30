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
} from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import locale from 'antd/es/date-picker/locale/ko_KR';
import dayjs from 'dayjs';
import { useMutation, useQueryClient } from 'react-query';
import {
  downloadExcel,
  getDownloadDateRange,
  deleteDashboards,
  getDashboardDetail,
  updateStatus,
  assignDriver,
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

const { RangePicker } = DatePicker;

const AdminPage = () => {
  const queryClient = useQueryClient();
  const [downloadForm] = Form.useForm();
  const [dateRangeInfo, setDateRangeInfo] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      .catch((error) => {
        message.error('폼 검증에 실패했습니다');
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
          driver_contact: values.driver_contact,
        });
      })
      .catch((error) => {
        message.error('폼 검증에 실패했습니다');
      });
  };

  // 엑셀 다운로드 처리
  const handleDownload = async () => {
    try {
      await downloadForm.validateFields();
      const values = downloadForm.getFieldsValue();

      if (!values.date_range) {
        message.error('날짜 범위를 선택해주세요');
        return;
      }

      // 날짜 범위 유효성 검사 (최대 3개월)
      const start = dayjs(values.date_range[0]);
      const end = dayjs(values.date_range[1]);
      const diff = end.diff(start, 'day');

      if (diff > 90) {
        message.error('최대 3개월 내의 데이터만 다운로드할 수 있습니다');
        return;
      }

      setDownloadLoading(true);

      try {
        const params = {
          start_date: start.format('YYYY-MM-DD'),
          end_date: end.format('YYYY-MM-DD'),
        };

        const response = await downloadExcel(params);

        // 파일 다운로드 처리
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute(
          'download',
          `대시보드_데이터_${start.format('YYYYMMDD')}_${end.format(
            'YYYYMMDD'
          )}.xlsx`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();

        message.success('엑셀 파일 다운로드가 완료되었습니다');
      } catch (error) {
        console.error('Download error:', error);
        message.error('다운로드 중 오류가 발생했습니다');
      } finally {
        setDownloadLoading(false);
      }
    } catch (error) {
      message.error('입력 값을 확인해주세요');
    }
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
        setLockConflictInfo(error.response.data.data);
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

    fetchDateRange();
  }, []);

  return (
    <div>
      <Card title="관리자 기능">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="엑셀 다운로드" bordered={false}>
              <Form form={downloadForm} layout="vertical">
                <Row gutter={16}>
                  <Col span={16}>
                    <Form.Item
                      name="date_range"
                      label="날짜 범위 (최대 3개월)"
                      rules={[
                        { required: true, message: '날짜 범위를 선택해주세요' },
                      ]}
                    >
                      <RangePicker
                        locale={locale}
                        style={{ width: '100%' }}
                        disabledDate={(current) => {
                          // 날짜 범위 제한
                          if (!dateRangeInfo || !current) return false;

                          const oldest = dayjs(dateRangeInfo.oldest_date);
                          const latest = dayjs(dateRangeInfo.latest_date);

                          return (
                            current.isBefore(oldest) || current.isAfter(latest)
                          );
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label=" " style={{ marginTop: 5 }}>
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleDownload}
                        loading={downloadLoading}
                        style={{ width: '100%' }}
                      >
                        엑셀 다운로드
                      </Button>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
              <div style={{ marginTop: 8, color: 'rgba(0, 0, 0, 0.45)' }}>
                * 최대 3개월 내의 데이터만 다운로드할 수 있습니다. 엑셀 파일에는
                선택한 날짜 범위 내의 모든 주문 정보가 포함됩니다.
              </div>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="데이터 관리" bordered={false}>
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Popconfirm
                    title="정말 삭제하시겠습니까?"
                    description="선택한 항목이 영구적으로 삭제됩니다."
                    icon={
                      <ExclamationCircleOutlined style={{ color: 'red' }} />
                    }
                    onConfirm={handleDelete}
                    okText="삭제"
                    cancelText="취소"
                    disabled={selectedRowKeys.length === 0}
                  >
                    <Button
                      type="primary"
                      danger
                      icon={<DeleteOutlined />}
                      loading={deleteLoading}
                      disabled={selectedRowKeys.length === 0}
                    >
                      선택 항목 삭제 ({selectedRowKeys.length}건)
                    </Button>
                  </Popconfirm>

                  <Button
                    type="primary"
                    onClick={showAssignModal}
                    disabled={selectedRowKeys.length === 0}
                  >
                    배차 처리 ({selectedRowKeys.length}건)
                  </Button>

                  <Button icon={<ReloadOutlined />} onClick={refreshData}>
                    새로고침
                  </Button>
                </Space>
                <span style={{ marginLeft: 8 }}>
                  {selectedRowKeys.length > 0
                    ? `${selectedRowKeys.length}건 선택됨`
                    : ''}
                </span>
              </div>

              {/* 검색 폼 */}
              <DashboardSearch
                onSearch={handleSearch}
                onReset={handleReset}
                userRole="ADMIN"
              />

              <Divider />

              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <DashboardTable
                  data={data}
                  loading={isLoading}
                  selectedRowKeys={selectedRowKeys}
                  onSelectChange={onSelectChange}
                  pagination={{
                    current: searchParams.page,
                    pageSize: searchParams.size,
                    total: meta?.total || 0,
                  }}
                  onChange={handleTableChange}
                  userRole="ADMIN"
                  onShowStatusModal={showStatusModal}
                  onShowDetailDrawer={showDetailDrawer}
                />
              )}
              <div style={{ marginTop: 8, color: 'rgba(0, 0, 0, 0.45)' }}>
                * 여기서 삭제된 데이터는 영구적으로 삭제되며 복구할 수 없습니다.
                주의하세요.
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

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

// src/pages/AdminPage.js
import React, { useState, useEffect } from "react";
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
} from "antd";
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
} from "@ant-design/icons";
import locale from "antd/es/date-picker/locale/ko_KR";
import dayjs from "dayjs";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
} from "../utils/api";
import { isAdmin } from "../utils/authHelpers";
import { formatDate } from "../utils/dateUtils";

// 커스텀 훅 가져오기
import useDashboardData from "../hooks/useDashboardData";
import useDashboardLock from "../hooks/useDashboardLock";
import useDashboardModals from "../hooks/useDashboardModals";

// 공통 컴포넌트 가져오기
import DashboardTable from "../components/DashboardTable";
import DashboardSearch from "../components/DashboardSearch";
import StatusChangeModal from "../components/StatusChangeModal";
import AssignDriverModal from "../components/AssignDriverModal";
import DashboardDetailModal from "../components/DashboardDetailModal";
import LockConflictModal from "../components/LockConflictModal";
import LoadingSpinner from "../components/LoadingSpinner";
import UserTable from "../components/UserTable";

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { Content } = Layout;

const AdminPage = () => {
  const queryClient = useQueryClient();
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
    dateParams, // 엑셀 다운로드에서 사용할 현재 날짜 설정
    searchTerm,
    statusFilter,
    departmentFilter,
    warehouseFilter,
  } = useDashboardData("ADMIN");

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
      message.success("상태가 변경되었습니다");
      closeStatusModal();
      queryClient.invalidateQueries(["admin-dashboards"]);

      // 락 해제
      if (currentDashboard) {
        releaseLock(currentDashboard.dashboard_id, "STATUS");
      }
    },
    onError: (error) => {
      message.error("상태 변경 중 오류가 발생했습니다");
      console.error("Status update error:", error);

      // 오류 발생해도 락 해제 시도
      if (currentDashboard) {
        releaseLock(currentDashboard.dashboard_id, "STATUS");
      }
    },
  });

  // 배차 처리 뮤테이션
  const assignMutation = useMutation((data) => assignDriver(data), {
    onSuccess: () => {
      message.success("배차가 완료되었습니다");
      closeAssignModal();
      setSelectedRowKeys([]);
      queryClient.invalidateQueries("admin-dashboards");

      // 락 해제
      releaseMultipleLocks(selectedRowKeys, "ASSIGN");
    },
    onError: (error) => {
      message.error("배차 처리 중 오류가 발생했습니다");
      console.error("Assign error:", error);

      // 오류 발생해도 락 해제 시도
      releaseMultipleLocks(selectedRowKeys, "ASSIGN");
    },
  });

  // 삭제 뮤테이션
  const deleteMutation = useMutation((ids) => deleteDashboards(ids), {
    onSuccess: () => {
      message.success("선택한 항목이 삭제되었습니다");
      setSelectedRowKeys([]);
      queryClient.invalidateQueries("admin-dashboards");
    },
    onError: (error) => {
      message.error("삭제 중 오류가 발생했습니다");
      console.error("Delete error:", error);
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
    ["adminData", searchParams],
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
    total: data?.totalElements || 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `총 ${total}개`,
  };

  // 엑셀 다운로드 처리
  const handleDownload = async () => {
    if (!dateParams.start_date || !dateParams.end_date) {
      message.warning("날짜 범위를 선택해주세요.");
      return;
    }

    // 날짜 차이 계산 (90일 제한)
    const startDate = new Date(dateParams.start_date);
    const endDate = new Date(dateParams.end_date);
    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (diffDays > 90) {
      message.warning("최대 90일 기간 내 데이터만 다운로드 가능합니다.");
      return;
    }

    try {
      setDownloadLoading(true);
      await downloadExcel({
        start_date: dateParams.start_date,
        end_date: dateParams.end_date,
        status: statusFilter,
        department: departmentFilter,
        warehouse: warehouseFilter,
        search_term: searchTerm,
      });
      message.success("엑셀 파일 다운로드가 성공적으로 완료되었습니다.");
    } catch (error) {
      console.error("엑셀 다운로드 오류:", error);
      message.error("엑셀 파일 다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloadLoading(false);
    }
  };

  // 상태 변경 모달 열기 (락 획득 후)
  const showStatusModal = (record) => {
    setCurrentDashboard(record);

    // 락 획득 후 모달 오픈
    acquireLock(record.dashboard_id, "STATUS", () => {
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
        message.error("상세 정보를 불러오는데 실패했습니다");
      }
    } catch (error) {
      console.error("상세 정보 조회 오류:", error);
      message.error("상세 정보를 불러오는데 실패했습니다");
    }
  };

  // 배차 모달 열기 (락 획득 후)
  const showAssignModal = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("배차할 항목을 선택해주세요");
      return;
    }

    // 다중 락 획득 후 모달 오픈
    acquireMultipleLocks(selectedRowKeys, "ASSIGN", () => {
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
        message.error("폼 검증에 실패했습니다");
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
      message.success("상태가 성공적으로 변경되었습니다.");
      closeStatusModal();
      queryClient.invalidateQueries(["admin-dashboards"]);
    } catch (error) {
      message.error("상태 변경 중 오류가 발생했습니다.");
      console.error("상태 변경 오류:", error);
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
      message.success("상태가 성공적으로 변경되었습니다.");
      queryClient.invalidateQueries(["admin-dashboards"]);
    } catch (error) {
      message.error("상태 변경 중 오류가 발생했습니다.");
      console.error("상세 모달 상태 변경 오류:", error);
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
        message.error("폼 검증에 실패했습니다");
      });
  };

  // 삭제 처리 (관리자 전용 기능)
  const handleDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("삭제할 항목을 선택해주세요");
      return;
    }

    setDeleteLoading(true);

    // 다중 락 획득 시도
    try {
      // 모든 선택된 항목에 대해 락 획득
      await Promise.all(selectedRowKeys.map((id) => acquireLock(id, "EDIT")));

      // 락 획득 성공 시 삭제 처리
      deleteMutation.mutate(selectedRowKeys);
    } catch (error) {
      setDeleteLoading(false);
      console.error("Lock acquisition error:", error);

      if (error.response?.data?.error_code === "LOCK_CONFLICT") {
        setLockConflictInfo(error.response.data.data);
        return;
      }

      message.error("락 획득 중 오류가 발생했습니다");
    }
  };

  // 관리자 권한 확인
  useEffect(() => {
    // 관리자 권한 검증 추가
    if (!isAdmin()) {
      message.error("관리자 권한이 필요합니다");
      window.location.href = "/dashboard";
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

  return (
    <Layout
      className="dashboard-layout"
      style={{ background: "white", padding: "16px" }}
    >
      <Card
        className="dashboard-card"
        bordered={false}
        style={{
          width: "100%",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          borderRadius: "8px",
          padding: "8px",
        }}
      >
        {/* 상단 날짜 선택 및 검색창 */}
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Form layout="inline">
              <Form.Item label="기간 선택" style={{ marginBottom: 0 }}>
                <RangePicker
                  locale={locale}
                  format="YYYY-MM-DD"
                  onChange={(dates, dateStrings) => {
                    if (dates) {
                      handleSearch({
                        start_date: dateStrings[0],
                        end_date: dateStrings[1],
                      });
                    }
                  }}
                  allowClear
                  style={{ width: "280px" }}
                />
              </Form.Item>
            </Form>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: "right" }}>
            <Input.Search
              placeholder="주문번호, 고객명 검색"
              onSearch={(value) => handleSearch({ search_term: value })}
              style={{ width: 280 }}
              allowClear
              size="middle"
            />
          </Col>
        </Row>

        <Divider style={{ margin: "16px 0" }} />

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
                  { value: "PENDING", label: "대기중" },
                  { value: "ASSIGNED", label: "배차완료" },
                  { value: "IN_TRANSIT", label: "이동중" },
                  { value: "DELIVERED", label: "배송완료" },
                  { value: "COMPLETE", label: "완료" },
                  { value: "ISSUE", label: "문제발생" },
                  { value: "CANCEL", label: "취소" },
                ]}
              />
              <Select
                placeholder="부서 필터"
                style={{ width: 120 }}
                onChange={(value) => handleSearch({ department: value })}
                allowClear
                options={[
                  { value: "물류부", label: "물류부" },
                  { value: "영업부", label: "영업부" },
                  { value: "관리부", label: "관리부" },
                ]}
              />
              <Select
                placeholder="창고 필터"
                style={{ width: 120 }}
                onChange={(value) => handleSearch({ warehouse: value })}
                allowClear
                options={[
                  { value: "서울창고", label: "서울창고" },
                  { value: "부산창고", label: "부산창고" },
                  { value: "대구창고", label: "대구창고" },
                ]}
              />
              <Button type="primary" onClick={handleReset}>
                필터 초기화
              </Button>
            </Space>
          </Col>
          <Col xs={24} lg={8} style={{ textAlign: "right" }}>
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
            </Space>
          </Col>
        </Row>

        <Divider style={{ margin: "16px 0" }} />

        {/* 데이터 테이블 */}
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
        selectedCount={selectedRowKeys.length}
      />

      {/* 상세 정보 모달 */}
      <DashboardDetailModal
        visible={detailModalVisible}
        onClose={closeDetailModal}
        form={detailForm}
        dashboard={currentDashboard}
        onStatusChange={handleStatusChangeInModal}
        userRole="ADMIN"
      />

      {/* 락 충돌 모달 */}
      <LockConflictModal
        visible={!!lockConflictInfo}
        lockInfo={lockConflictInfo}
        onRetry={retryLock}
        onCancel={cancelLock}
        confirmLoading={isLockLoading}
      />
    </Layout>
  );
};

export default AdminPage;

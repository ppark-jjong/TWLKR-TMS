// src/pages/DashboardPage.js
import React, { useEffect } from "react";
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
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateStatus,
  assignDriver,
  getDashboardDetail,
  safeApiCall,
} from "../utils/api";
import { getUserFromToken } from "../utils/authHelpers";
import { handleApiError, safeAsync, goBack } from "../utils/errorHandlers";
import { DashboardItemType, UserType } from "../types";
import PropTypes from "prop-types";
import locale from "antd/es/date-picker/locale/ko_KR";

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
import CreateDashboardModal from "../components/CreateDashboardModal";
import LoadingSpinner from "../components/LoadingSpinner";

const { RangePicker } = DatePicker;

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const [createModalVisible, setCreateModalVisible] = React.useState(false);

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
    dateParams,
    searchTerm,
    statusFilter,
    departmentFilter,
    warehouseFilter,
  } = useDashboardData("USER");

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
      queryClient.invalidateQueries("dashboards");

      // 락 해제
      if (currentDashboard) {
        releaseLock(currentDashboard.dashboard_id, "STATUS");
      }
    },
    onError: (error) => {
      handleApiError(error, {
        context: "상태 변경",
        onComplete: () => {
          // 오류 발생해도 락 해제 시도
          if (currentDashboard) {
            releaseLock(currentDashboard.dashboard_id, "STATUS");
          }
        },
      });
    },
  });

  // 배차 처리 뮤테이션
  const assignMutation = useMutation((data) => assignDriver(data), {
    onSuccess: () => {
      message.success("배차가 완료되었습니다");
      closeAssignModal();
      setSelectedRowKeys([]);
      queryClient.invalidateQueries("dashboards");

      // 락 해제
      releaseMultipleLocks(selectedRowKeys, "ASSIGN");
    },
    onError: (error) => {
      handleApiError(error, {
        context: "배차 처리",
        onComplete: () => {
          // 오류 발생해도 락 해제 시도
          releaseMultipleLocks(selectedRowKeys, "ASSIGN");
        },
      });
    },
  });

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
            is_admin: false, // 일반 사용자 권한
          },
        });
      })
      .catch((error) => {
        message.error("폼 검증에 실패했습니다");
      });
  };

  // 상세 모달 내에서 상태 변경
  const handleStatusChangeInModal = (status) => {
    if (!currentDashboard) return;

    // 락 획득 필요
    acquireLock(currentDashboard.dashboard_id, "STATUS", () => {
      statusMutation.mutate({
        id: currentDashboard.dashboard_id,
        data: {
          status: status,
          is_admin: false, // 일반 사용자 권한
        },
      });
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
        message.error("폼 검증에 실패했습니다");
      });
  };

  // 에러 발생 시 뒤로가기
  const handleErrorBack = () => {
    message.info("이전 화면으로 돌아갑니다");
    goBack();
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
    pageSize: searchParams?.size || 15,
    total: meta?.total || 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `총 ${total}개`,
  };

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
                disabled={selectedRowKeys.length === 0}
              >
                배차 처리
              </Button>
              <Button
                type="primary"
                onClick={() => setCreateModalVisible(true)}
              >
                주문 추가
              </Button>
              <Button icon={<ReloadOutlined />} onClick={refreshData}>
                새로고침
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
          userRole="USER"
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
        userRole="USER"
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
        dashboard={currentDashboard}
        onStatusChange={handleStatusChangeInModal}
        userRole="USER"
        form={detailForm}
      />

      {/* 락 충돌 모달 */}
      <LockConflictModal
        visible={!!lockConflictInfo}
        lockInfo={lockConflictInfo}
        onCancel={cancelLock}
        onRetry={retryLock}
        confirmLoading={isLockLoading}
      />

      {/* 주문 추가 모달 */}
      <CreateDashboardModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          refreshData();
        }}
        userRole="USER"
      />

      {/* 락 획득 로딩 */}
      {isLockLoading && <LoadingSpinner tip="락 획득 중..." />}
    </Layout>
  );
};

DashboardPage.propTypes = {
  // 필요한 경우 추가
};

export default DashboardPage;

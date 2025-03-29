// src/pages/AdminPage.js 수정 (전체)
import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  DatePicker,
  Button,
  Row,
  Col,
  message,
  Table,
  Space,
  Popconfirm,
  Tag,
  Divider,
  Drawer,
} from "antd";
import {
  DownloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";
import locale from "antd/es/date-picker/locale/ko_KR";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "react-query";
import {
  downloadExcel,
  getDownloadDateRange,
  fetchDashboards,
  deleteDashboards,
  acquireLock,
  getDashboardDetail,
  updateStatus,
  assignDriver,
  releaseLock,
} from "../utils/api";
import LoadingSpinner from "../components/LoadingSpinner";
import LockConflictModal from "../components/LockConflictModal";
import CommonModal from "../components/CommonModal";
import { isAdmin, getUserFromToken } from "../utils/authHelpers";

const { RangePicker } = DatePicker;

const AdminPage = () => {
  const queryClient = useQueryClient();
  const [downloadForm] = Form.useForm();
  const [detailForm] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchParams, setSearchParams] = useState({
    page: 1,
    size: 10,
  });
  const [dateRangeInfo, setDateRangeInfo] = useState(null);
  const [lockConflictInfo, setLockConflictInfo] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [lockType, setLockType] = useState("");
  const [dashboardIdForLock, setDashboardIdForLock] = useState(null);
  const [actionAfterLock, setActionAfterLock] = useState(null);

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
            dayjs().subtract(7, "day").isAfter(dayjs(oldest))
              ? dayjs().subtract(7, "day")
              : dayjs(oldest),
            dayjs(latest),
          ],
        });
      }
    } catch (error) {
      console.error("Date range fetch error:", error);
    }
  };

  // 대시보드 목록 조회
  const { data, isLoading, refetch } = useQuery(
    ["admin-dashboards", searchParams],
    () => fetchDashboards(searchParams),
    {
      keepPreviousData: true,
      onError: (error) => {
        message.error("데이터 로딩 중 오류가 발생했습니다");
        console.error("Dashboard fetch error:", error);
      },
    }
  );

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

  // 상태 변경 뮤테이션
  const statusMutation = useMutation(({ id, data }) => updateStatus(id, data), {
    onSuccess: () => {
      message.success("상태가 변경되었습니다");
      setStatusModalVisible(false);
      statusForm.resetFields();
      queryClient.invalidateQueries("admin-dashboards");

      // 락 해제
      if (currentDashboard) {
        handleReleaseLock(currentDashboard.dashboard_id, "STATUS");
      }
    },
    onError: (error) => {
      message.error("상태 변경 중 오류가 발생했습니다");
      console.error("Status update error:", error);
    },
  });

  // 배차 처리 뮤테이션
  const assignMutation = useMutation((data) => assignDriver(data), {
    onSuccess: () => {
      message.success("배차가 완료되었습니다");
      setAssignModalVisible(false);
      assignForm.resetFields();
      setSelectedRowKeys([]);
      queryClient.invalidateQueries("admin-dashboards");

      // 락 해제 (다중 배차의 경우)
      selectedRowKeys.forEach((id) => {
        handleReleaseLock(id, "ASSIGN");
      });
    },
    onError: (error) => {
      message.error("배차 처리 중 오류가 발생했습니다");
      console.error("Assign error:", error);
    },
  });

  // 관리자 권한 확인
  useEffect(() => {
    if (!isAdmin()) {
      message.error("관리자 권한이 필요합니다");
      window.location.href = "/dashboard";
      return;
    }

    fetchDateRange();
  }, []);

  // 엑셀 다운로드 처리
  const handleDownload = async () => {
    try {
      await downloadForm.validateFields();
      const values = downloadForm.getFieldsValue();

      if (!values.date_range) {
        message.error("날짜 범위를 선택해주세요");
        return;
      }

      // 날짜 범위 유효성 검사 (최대 3개월)
      const start = dayjs(values.date_range[0]);
      const end = dayjs(values.date_range[1]);
      const diff = end.diff(start, "day");

      if (diff > 90) {
        message.error("최대 3개월 내의 데이터만 다운로드할 수 있습니다");
        return;
      }

      setDownloadLoading(true);

      try {
        const params = {
          start_date: start.format("YYYY-MM-DD"),
          end_date: end.format("YYYY-MM-DD"),
        };

        const response = await downloadExcel(params);

        // 파일 다운로드 처리
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `대시보드_데이터_${start.format("YYYYMMDD")}_${end.format(
            "YYYYMMDD"
          )}.xlsx`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();

        message.success("엑셀 파일 다운로드가 완료되었습니다");
      } catch (error) {
        console.error("Download error:", error);
        message.error("다운로드 중 오류가 발생했습니다");
      } finally {
        setDownloadLoading(false);
      }
    } catch (error) {
      message.error("입력 값을 확인해주세요");
    }
  };

  // 삭제 처리
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

  // 락 취소
  const handleCancelLock = () => {
    setLockConflictInfo(null);
    setDashboardIdForLock(null);
    setLockType("");
    setActionAfterLock(null);
  };

  // 락 재시도
  const handleRetryLock = async () => {
    setLockConflictInfo(null);

    if (dashboardIdForLock && lockType && actionAfterLock) {
      handleAcquireLock(dashboardIdForLock, lockType, actionAfterLock);
    }
  };

  // 락 획득
  const handleAcquireLock = async (dashboardId, type, action) => {
    try {
      setDashboardIdForLock(dashboardId);
      setLockType(type);
      setActionAfterLock(action);

      const response = await acquireLock(dashboardId, type);

      if (response.data.success) {
        if (action) action();
      } else {
        // 실패 시 이미 에러 객체가 있을 경우 락 충돌 처리
        if (response.data.error_code === "LOCK_CONFLICT") {
          setLockConflictInfo(response.data.data);
        } else {
          message.error(response.data.message || "락 획득에 실패했습니다");
        }
      }
    } catch (error) {
      console.error("Lock acquisition error:", error);

      if (error.response?.data?.error_code === "LOCK_CONFLICT") {
        setLockConflictInfo(error.response.data.data);
        return;
      }

      message.error("락 획득 중 오류가 발생했습니다");
    }
  };

  // 락 해제
  const handleReleaseLock = async (dashboardId, type) => {
    try {
      await releaseLock(dashboardId, type);
      // 락이 해제되었다는 알림은 굳이 표시하지 않음
    } catch (error) {
      console.error("Lock release error:", error);
      // 락 해제 실패는 조용히 처리 (이미 해제된 경우도 있으므로)
    }
  };

  // 선택 행 변경
  const onSelectChange = (selectedKeys) => {
    setSelectedRowKeys(selectedKeys);
  };

  // 테이블 변경 (페이징)
  const handleTableChange = (pagination) => {
    setSearchParams({
      ...searchParams,
      page: pagination.current,
      size: pagination.pageSize,
    });
  };

  // 상세 정보 모달 오픈
  const showDetailDrawer = async (id) => {
    try {
      const detail = await getDashboardDetail(id);

      if (detail.data && detail.data.success) {
        const dashboardData = detail.data.data;
        setCurrentDashboard(dashboardData);

        detailForm.setFieldsValue({
          ...dashboardData,
          eta: dashboardData.eta ? dayjs(dashboardData.eta) : null,
          create_time: dashboardData.create_time
            ? dayjs(dashboardData.create_time)
            : null,
          depart_time: dashboardData.depart_time
            ? dayjs(dashboardData.depart_time)
            : null,
          complete_time: dashboardData.complete_time
            ? dayjs(dashboardData.complete_time)
            : null,
        });

        setDetailVisible(true);
      } else {
        message.error("상세 정보를 불러오는데 실패했습니다");
      }
    } catch (error) {
      message.error("상세 정보를 불러오는데 실패했습니다");
    }
  };

  // 상태 변경 모달 오픈
  const showStatusModal = (record) => {
    setCurrentDashboard(record);
    statusForm.setFieldsValue({
      status: record.status,
    });

    // 락 획득 후 모달 오픈
    handleAcquireLock(record.dashboard_id, "STATUS", () => {
      setStatusModalVisible(true);
    });
  };

  // 배차 모달 오픈
  const showAssignModal = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("배차할 항목을 선택해주세요");
      return;
    }

    // 다중 락 획득 시도 - 모든 선택 항목에 대해 동시에
    Promise.all(selectedRowKeys.map((id) => acquireLock(id, "ASSIGN")))
      .then(() => {
        setAssignModalVisible(true);
      })
      .catch((error) => {
        console.error("Multiple lock acquisition error:", error);

        if (error.response?.data?.error_code === "LOCK_CONFLICT") {
          setLockConflictInfo(error.response.data.data);
          return;
        }

        message.error("락 획득 중 오류가 발생했습니다");
      });
  };

  // 상태 변경 제출
  const handleStatusSubmit = () => {
    statusForm.validateFields().then((values) => {
      if (!currentDashboard) return;

      statusMutation.mutate({
        id: currentDashboard.dashboard_id,
        data: {
          status: values.status,
          is_admin: true, // 관리자는 항상 true
        },
      });
    });
  };

  // 배차 처리 제출
  const handleAssignSubmit = () => {
    assignForm.validateFields().then((values) => {
      assignMutation.mutate({
        dashboard_ids: selectedRowKeys,
        driver_name: values.driver_name,
        driver_contact: values.driver_contact,
      });
    });
  };

  // 스테이터스 태그 색상 매핑
  const getStatusColor = (status) => {
    const colors = {
      WAITING: "blue",
      IN_PROGRESS: "orange",
      COMPLETE: "green",
      ISSUE: "red",
      CANCEL: "gray",
    };
    return colors[status] || "default";
  };

  // 스테이터스 한글 변환 매핑
  const getStatusText = (status) => {
    const texts = {
      WAITING: "대기",
      IN_PROGRESS: "진행",
      COMPLETE: "완료",
      ISSUE: "이슈",
      CANCEL: "취소",
    };
    return texts[status] || status;
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: "주문번호",
      dataIndex: "order_no",
      key: "order_no",
    },
    {
      title: "고객",
      dataIndex: "customer",
      key: "customer",
    },
    {
      title: "유형",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag color={type === "DELIVERY" ? "blue" : "purple"}>
          {type === "DELIVERY" ? "배송" : "회수"}
        </Tag>
      ),
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: "부서",
      dataIndex: "department",
      key: "department",
    },
    {
      title: "창고",
      dataIndex: "warehouse",
      key: "warehouse",
    },
    {
      title: "ETA",
      dataIndex: "eta",
      key: "eta",
      render: (eta) => (eta ? dayjs(eta).format("YYYY-MM-DD HH:mm") : "-"),
    },
    {
      title: "생성일",
      dataIndex: "create_time",
      key: "create_time",
      render: (create_time) =>
        create_time ? dayjs(create_time).format("YYYY-MM-DD") : "-",
    },
    {
      title: "액션",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => showStatusModal(record)}
          >
            상태변경
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => showDetailDrawer(record.dashboard_id)}
          >
            상세
          </Button>
        </Space>
      ),
    },
  ];

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
                        { required: true, message: "날짜 범위를 선택해주세요" },
                      ]}
                    >
                      <RangePicker
                        locale={locale}
                        style={{ width: "100%" }}
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
                        style={{ width: "100%" }}
                      >
                        엑셀 다운로드
                      </Button>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
              <div style={{ marginTop: 8, color: "rgba(0, 0, 0, 0.45)" }}>
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
                      <ExclamationCircleOutlined style={{ color: "red" }} />
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
                </Space>
                <span style={{ marginLeft: 8 }}>
                  {selectedRowKeys.length > 0
                    ? `${selectedRowKeys.length}건 선택됨`
                    : ""}
                </span>
              </div>

              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <Table
                  rowSelection={{
                    selectedRowKeys,
                    onChange: onSelectChange,
                  }}
                  columns={columns}
                  dataSource={data?.data?.data || []}
                  rowKey="dashboard_id"
                  pagination={{
                    current: searchParams.page,
                    pageSize: searchParams.size,
                    total: data?.data?.meta?.total || 0,
                  }}
                  onChange={handleTableChange}
                  size="middle"
                />
              )}
              <div style={{ marginTop: 8, color: "rgba(0, 0, 0, 0.45)" }}>
                * 여기서 삭제된 데이터는 영구적으로 삭제되며 복구할 수 없습니다.
                주의하세요.
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 락 충돌 모달 */}
      <LockConflictModal
        visible={!!lockConflictInfo}
        lockInfo={lockConflictInfo}
        onRetry={handleRetryLock}
        onCancel={handleCancelLock}
        confirmLoading={deleteLoading}
      />

      {/* 상태 변경 모달 */}
      <CommonModal
        visible={statusModalVisible}
        title="상태 변경"
        onOk={handleStatusSubmit}
        onCancel={() => {
          setStatusModalVisible(false);
          handleReleaseLock(currentDashboard?.dashboard_id, "STATUS");
        }}
        confirmLoading={statusMutation.isLoading}
        content={
          <Form form={statusForm} layout="vertical">
            <Form.Item
              name="status"
              label="상태"
              rules={[{ required: true, message: "상태를 선택해주세요" }]}
            >
              <Select placeholder="상태 선택">
                {currentDashboard?.status === "WAITING" && (
                  <>
                    <Option value="IN_PROGRESS">진행</Option>
                    <Option value="CANCEL">취소</Option>
                  </>
                )}
                {currentDashboard?.status === "IN_PROGRESS" && (
                  <>
                    <Option value="COMPLETE">완료</Option>
                    <Option value="ISSUE">이슈</Option>
                    <Option value="CANCEL">취소</Option>
                  </>
                )}
                {/* 관리자는 모든 상태 변경 가능 */}
                {(currentDashboard?.status === "COMPLETE" ||
                  currentDashboard?.status === "ISSUE" ||
                  currentDashboard?.status === "CANCEL") && (
                  <>
                    <Option value="WAITING">대기</Option>
                    <Option value="IN_PROGRESS">진행</Option>
                    <Option value="COMPLETE">완료</Option>
                    <Option value="ISSUE">이슈</Option>
                    <Option value="CANCEL">취소</Option>
                  </>
                )}
              </Select>
            </Form.Item>
          </Form>
        }
      />

      {/* 배차 처리 모달 */}
      <CommonModal
        visible={assignModalVisible}
        title="배차 처리"
        onOk={handleAssignSubmit}
        onCancel={() => {
          setAssignModalVisible(false);
          // 다중 락 해제
          selectedRowKeys.forEach((id) => {
            handleReleaseLock(id, "ASSIGN");
          });
        }}
        confirmLoading={assignMutation.isLoading}
        content={
          <Form form={assignForm} layout="vertical">
            <Form.Item
              name="driver_name"
              label="기사명"
              rules={[{ required: true, message: "기사명을 입력해주세요" }]}
            >
              <Input placeholder="기사명 입력" />
            </Form.Item>
            <Form.Item
              name="driver_contact"
              label="연락처"
              rules={[
                { required: true, message: "연락처를 입력해주세요" },
                {
                  pattern: /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/,
                  message: "올바른 연락처 형식이 아닙니다",
                },
              ]}
            >
              <Input placeholder="연락처 입력 (예: 010-1234-5678)" />
            </Form.Item>
          </Form>
        }
      />

      {/* 상세 정보 드로어 */}
      <Drawer
        title="상세 정보"
        width={600}
        onClose={() => setDetailVisible(false)}
        open={detailVisible}
      >
        {currentDashboard && (
          <Form form={detailForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="주문번호" name="order_no">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="유형" name="type">
                  <Select disabled>
                    <Option value="DELIVERY">배송</Option>
                    <Option value="RETURN">회수</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="상태" name="status">
                  <Select disabled>
                    <Option value="WAITING">대기</Option>
                    <Option value="IN_PROGRESS">진행</Option>
                    <Option value="COMPLETE">완료</Option>
                    <Option value="ISSUE">이슈</Option>
                    <Option value="CANCEL">취소</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="부서" name="department">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="창고" name="warehouse">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="SLA" name="sla">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="ETA" name="eta">
                  <DatePicker showTime disabled style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="생성시간" name="create_time">
                  <DatePicker showTime disabled style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="출발시간" name="depart_time">
                  <DatePicker showTime disabled style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="완료시간" name="complete_time">
                  <DatePicker showTime disabled style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="우편번호" name="postal_code">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item label="지역" name="region">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="주소" name="address">
              <Input.TextArea disabled rows={2} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="고객명" name="customer">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="연락처" name="contact">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="기사명" name="driver_name">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="기사 연락처" name="driver_contact">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="메모" name="remark">
              <Input.TextArea disabled rows={4} />
            </Form.Item>
          </Form>
        )}
      </Drawer>
    </div>
  );
};

export default AdminPage;

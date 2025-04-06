// src/pages/DashboardPage.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Space,
  Card,
  Row,
  Col,
  Layout,
  Typography,
  Form,
  Collapse,
  Input,
  Select,
  message,
  Spin,
  Table,
} from "antd";
import {
  SearchOutlined,
  ClearOutlined,
  PlusOutlined,
  CarOutlined,
  TagOutlined,
  SyncOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { DatePicker } from "antd";
import moment from "moment";
import axios from "axios";
import { useQuery } from "react-query";
import { useNavigate, useLocation } from "react-router-dom";

// 공통 훅 가져오기
import useDashboardBase from "../hooks/useDashboardBase";

// 공통 컴포넌트 가져오기
import StatusChangeModal from "../components/StatusChangeModal";
import AssignDriverModal from "../components/AssignDriverModal";
import DashboardDetailModal from "../components/DashboardDetailModal";
import LockConflictModal from "../components/LockConflictModal";
import CreateDashboardModal from "../components/CreateDashboardModal";
import LoadingSpinner from "../components/LoadingSpinner";
import DashboardBase from "../components/DashboardBase";
import DashboardTable from "../components/DashboardTable";

const { RangePicker } = DatePicker;
const { Panel } = Collapse;
const { Title, Text } = Typography;
const { Option } = Select;

// 상태 옵션 상수 정의
const STATUS_OPTIONS = [
  { value: "NEW", label: "신규" },
  { value: "ASSIGNED", label: "배차완료" },
  { value: "IN_PROGRESS", label: "진행중" },
  { value: "COMPLETE", label: "완료" },
  { value: "CANCELLED", label: "취소" },
];

// 상태별 태그 컴포넌트
const StatusTag = ({ status }) => {
  const statusMap = {
    PENDING: { color: "blue", icon: <ClockCircleOutlined />, text: "대기 중" },
    IN_PROGRESS: {
      color: "orange",
      icon: <SyncOutlined spin />,
      text: "처리 중",
    },
    COMPLETED: {
      color: "green",
      icon: <CheckCircleOutlined />,
      text: "완료됨",
    },
    DELAYED: { color: "red", icon: <WarningOutlined />, text: "지연됨" },
  };

  const statusInfo = statusMap[status] || {
    color: "default",
    icon: null,
    text: status,
  };

  return (
    <Tag color={statusInfo.color} icon={statusInfo.icon}>
      {statusInfo.text}
    </Tag>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // URL 쿼리 파라미터 파싱
  const queryParams = new URLSearchParams(location.search);
  const initialStartDate = queryParams.get("startDate")
    ? moment(queryParams.get("startDate"))
    : moment().subtract(7, "days");
  const initialEndDate = queryParams.get("endDate")
    ? moment(queryParams.get("endDate"))
    : moment();

  // 상태 관리
  const [dateRange, setDateRange] = useState([
    initialStartDate,
    initialEndDate,
  ]);
  const [searchText, setSearchText] = useState(queryParams.get("search") || "");
  const [filteredData, setFilteredData] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    status: "ALL",
    location: "ALL",
  });
  const [tableParams, setTableParams] = useState({
    pagination: {
      current: Number(queryParams.get("page")) || 1,
      pageSize: Number(queryParams.get("pageSize")) || 10,
    },
    sorter: {
      field: queryParams.get("sortField") || "createdAt",
      order: queryParams.get("sortOrder") || "descend",
    },
  });

  // 대시보드 기본 훅 사용은 필요한 기능만 가져옵니다
  const {
    data: dashboardData,
    selectedRowKeys,
    onSelectChange,
    setCurrentDashboard,
    showDetailModal,
    currentDashboard,
    closeDetailModal,
    detailModalVisible,
    createModalVisible,
    setCreateModalVisible,
    closeCreateModal,
    showStatusModal,
    closeStatusModal,
    statusModalVisible,
    closeAssignModal,
    showAssignModal,
    assignModalVisible,
    assignForm,
    statusForm,
    detailForm,
    handlePaginationChange,
    loadDashboardList,
    handleStatusSubmit,
    handleAssignSubmit,
    lockConflictInfo,
    isLockLoading,
    cancelLock,
    retryLock,
    summaryCount = { total: 0, in_progress: 0, complete: 0 },
  } = useDashboardBase("USER");

  // 대시보드 데이터 가져오기
  const fetchDashboardData = useCallback(async () => {
    if (!dateRange[0] || !dateRange[1]) return [];

    const startDate = dateRange[0].format("YYYY-MM-DD");
    const endDate = dateRange[1].format("YYYY-MM-DD");

    try {
      const response = await axios.get(`/api/dashboard`, {
        params: {
          startDate,
          endDate,
          search: searchText,
          page: tableParams.pagination.current,
          pageSize: tableParams.pagination.pageSize,
          sortField: tableParams.sorter.field,
          sortOrder: tableParams.sorter.order,
        },
      });

      return {
        items: response.data.items,
        total: response.data.total,
        stats: response.data.stats || {
          pending: 0,
          inProgress: 0,
          completed: 0,
          delayed: 0,
        },
      };
    } catch (error) {
      console.error("API 요청 중 오류 발생:", error);
      throw error;
    }
  }, [dateRange, searchText, tableParams]);

  // React Query를 사용한 데이터 페칭
  const { data, isLoading, error, refetch } = useQuery(
    ["dashboardData", dateRange, searchText, tableParams],
    fetchDashboardData,
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        setFilteredData(data.items);
      },
      onError: () => {
        message.error("데이터를 불러오는 중 오류가 발생했습니다.");
      },
    }
  );

  // URL 쿼리 파라미터 업데이트
  useEffect(() => {
    const params = new URLSearchParams();

    if (dateRange[0])
      params.set("startDate", dateRange[0].format("YYYY-MM-DD"));
    if (dateRange[1]) params.set("endDate", dateRange[1].format("YYYY-MM-DD"));
    if (searchText) params.set("search", searchText);
    params.set("page", tableParams.pagination.current.toString());
    params.set("pageSize", tableParams.pagination.pageSize.toString());
    params.set("sortField", tableParams.sorter.field);
    params.set("sortOrder", tableParams.sorter.order);

    navigate(
      {
        pathname: location.pathname,
        search: params.toString(),
      },
      { replace: true }
    );
  }, [dateRange, searchText, tableParams, navigate, location.pathname]);

  // 필터링된 데이터 업데이트
  useEffect(() => {
    if (!data || !data.items) return;

    let filtered = [...data.items];

    // 상태 필터링
    if (filterOptions.status !== "ALL") {
      filtered = filtered.filter(
        (item) => item.status === filterOptions.status
      );
    }

    // 위치 필터링
    if (filterOptions.location !== "ALL") {
      filtered = filtered.filter(
        (item) => item.location === filterOptions.location
      );
    }

    setFilteredData(filtered);
  }, [data, filterOptions]);

  // 날짜 범위 변경 핸들러
  const onDateRangeChange = (dates) => {
    setDateRange(dates || [moment().subtract(7, "days"), moment()]);
    // 페이지 리셋
    setTableParams({
      ...tableParams,
      pagination: {
        ...tableParams.pagination,
        current: 1,
      },
    });
  };

  // 검색어 변경 핸들러
  const handleSearchChange = (value) => {
    setSearchText(value);
    // 페이지 리셋
    setTableParams({
      ...tableParams,
      pagination: {
        ...tableParams.pagination,
        current: 1,
      },
    });
  };

  // 필터 변경 핸들러
  const handleFilterChange = (type, value) => {
    setFilterOptions({
      ...filterOptions,
      [type]: value,
    });
  };

  // 테이블 변경 핸들러
  const handleTableChange = (pagination, filters, sorter) => {
    setTableParams({
      pagination: {
        current: pagination.current,
        pageSize: pagination.pageSize,
      },
      sorter: {
        field: sorter.field || "createdAt",
        order: sorter.order || "descend",
      },
    });
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      sorter: true,
      sortDirections: ["descend", "ascend"],
    },
    {
      title: "이름",
      dataIndex: "name",
      key: "name",
      sorter: true,
      sortDirections: ["descend", "ascend"],
      render: (text, record) => (
        <a onClick={() => navigate(`/detail/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: "위치",
      dataIndex: "location",
      key: "location",
      filters: data?.items
        ? [...new Set(data.items.map((item) => item.location))].map((loc) => ({
            text: loc,
            value: loc,
          }))
        : [],
      onFilter: (value, record) => record.location === value,
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusTag status={status} />,
      filters: [
        { text: "대기 중", value: "PENDING" },
        { text: "처리 중", value: "IN_PROGRESS" },
        { text: "완료됨", value: "COMPLETED" },
        { text: "지연됨", value: "DELAYED" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "ETA",
      dataIndex: "eta",
      key: "eta",
      render: (text) => (text ? moment(text).format("YYYY-MM-DD HH:mm") : "-"),
      sorter: true,
      sortDirections: ["descend", "ascend"],
    },
    {
      title: "생성일",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text) => moment(text).format("YYYY-MM-DD HH:mm"),
      sorter: true,
      sortDirections: ["descend", "ascend"],
    },
    {
      title: "액션",
      key: "action",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => navigate(`/detail/${record.id}`)}
          >
            상세보기
          </Button>
        </Space>
      ),
    },
  ];

  // 로딩 중 표시
  if (isLoading && !data) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p style={{ marginTop: "20px" }}>데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  // 에러 표시
  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Typography.Text type="danger">
          데이터를 불러오는 중 오류가 발생했습니다.
          <br />
          {error.message}
        </Typography.Text>
        <br />
        <Button type="primary" onClick={refetch} style={{ marginTop: "20px" }}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <Layout.Content style={{ padding: "24px" }}>
      <Card style={{ marginBottom: "24px" }}>
        <Row gutter={24}>
          <Col span={8}>
            <Card style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  margin: "8px 0",
                }}
              >
                {summaryCount.total || 0}
              </div>
              <div style={{ fontSize: "14px", color: "rgba(0, 0, 0, 0.45)" }}>
                전체
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  margin: "8px 0",
                }}
              >
                {summaryCount.in_progress || 0}
              </div>
              <div style={{ fontSize: "14px", color: "rgba(0, 0, 0, 0.45)" }}>
                진행중
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  margin: "8px 0",
                }}
              >
                {summaryCount.complete || 0}
              </div>
              <div style={{ fontSize: "14px", color: "rgba(0, 0, 0, 0.45)" }}>
                완료
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card
        style={{ marginBottom: "24px" }}
        title={
          <div style={{ display: "flex", alignItems: "center" }}>
            <SearchOutlined style={{ marginRight: "8px" }} />
            <span style={{ fontWeight: "600" }}>검색 옵션</span>
          </div>
        }
      >
        <Form layout="vertical" onFinish={handleSearchChange}>
          <Collapse ghost defaultActiveKey={["1"]} expandIconPosition="end">
            <Panel
              header={
                <span style={{ fontWeight: "600", fontSize: "15px" }}>
                  기본 검색
                </span>
              }
              key="1"
            >
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item name="order_no" label="주문번호">
                    <Input
                      placeholder="주문번호 입력"
                      allowClear
                      style={{ borderRadius: "6px" }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item name="status" label="상태">
                    <Select
                      placeholder="상태 선택"
                      allowClear
                      options={STATUS_OPTIONS}
                      style={{ width: "100%", borderRadius: "6px" }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item name="type" label="유형">
                    <Select
                      placeholder="유형 선택"
                      allowClear
                      options={[
                        { value: "DELIVERY", label: "배송" },
                        { value: "RETURN", label: "회수" },
                      ]}
                      style={{ width: "100%", borderRadius: "6px" }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item name="department" label="부서">
                    <Input
                      placeholder="부서명 입력"
                      allowClear
                      style={{ borderRadius: "6px" }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Panel>
            <Panel
              header={
                <span style={{ fontWeight: "600", fontSize: "15px" }}>
                  고급 검색
                </span>
              }
              key="2"
            >
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item name="driver_name" label="배송기사">
                    <Input
                      placeholder="기사명 입력"
                      allowClear
                      style={{ borderRadius: "6px" }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item name="warehouse" label="창고">
                    <Input
                      placeholder="창고명 입력"
                      allowClear
                      style={{ borderRadius: "6px" }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item name="region" label="지역">
                    <Input
                      placeholder="지역명 입력"
                      allowClear
                      style={{ borderRadius: "6px" }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item label="날짜 범위">
                    <RangePicker
                      value={dateRange}
                      onChange={onDateRangeChange}
                      style={{ width: "100%" }}
                      format="YYYY-MM-DD"
                      allowClear={false}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Panel>
          </Collapse>

          <Row justify="end" style={{ marginTop: "16px" }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                style={{
                  borderRadius: "6px",
                  height: "38px",
                  fontWeight: "500",
                }}
              >
                검색
              </Button>
            </Space>
          </Row>
        </Form>
      </Card>

      <Card
        style={{ marginBottom: "24px" }}
        title={
          <Row justify="space-between" align="middle">
            <Col>
              <Typography.Title level={5} style={{ margin: 0 }}>
                주문 목록
              </Typography.Title>
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                  style={{
                    borderRadius: "6px",
                    height: "38px",
                    fontWeight: "500",
                  }}
                >
                  새 주문 등록
                </Button>
                {selectedRowKeys.length > 0 && (
                  <>
                    <Button
                      type="default"
                      icon={<CarOutlined />}
                      onClick={showAssignModal}
                      style={{
                        borderRadius: "6px",
                        height: "38px",
                        fontWeight: "500",
                      }}
                    >
                      배차하기
                    </Button>
                    <Button
                      type="default"
                      icon={<TagOutlined />}
                      onClick={showStatusModal}
                      style={{
                        borderRadius: "6px",
                        height: "38px",
                        fontWeight: "500",
                      }}
                    >
                      상태변경
                    </Button>
                  </>
                )}
              </Space>
            </Col>
          </Row>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading}
          selectedRowKeys={selectedRowKeys}
          onSelectChange={onSelectChange}
          pagination={{
            ...tableParams.pagination,
            total: data?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `총 ${total}개 항목`,
          }}
          onChange={handleTableChange}
          scroll={{ x: "max-content" }}
        />
      </Card>

      {/* 모달 컴포넌트들 */}
      <StatusChangeModal
        open={statusModalVisible}
        onOk={handleStatusSubmit}
        onCancel={closeStatusModal}
        form={statusForm}
        currentRecord={currentDashboard}
        isAdmin={false}
        confirmLoading={isLoading}
      />

      <AssignDriverModal
        open={assignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={closeAssignModal}
        form={assignForm}
        confirmLoading={isLoading}
        selectedCount={selectedRowKeys.length}
      />

      <DashboardDetailModal
        open={detailModalVisible}
        onCancel={closeDetailModal}
        form={detailForm}
        record={currentDashboard}
        onStatusChange={handleStatusSubmit}
        userRole="USER"
      />

      <CreateDashboardModal
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        userRole="USER"
      />

      <LockConflictModal
        lockInfo={lockConflictInfo}
        onCancel={cancelLock}
        onRetry={retryLock}
        open={isLockLoading && lockConflictInfo}
      />

      {/* 마지막 업데이트 시간 표시 */}
      <div style={{ textAlign: "right", marginTop: "8px" }}>
        <Text type="secondary">
          <SyncOutlined /> 마지막 업데이트:{" "}
          {moment().format("YYYY-MM-DD HH:mm:ss")}
          {isLoading && <span> (새로고침 중...)</span>}
        </Text>
      </div>
    </Layout.Content>
  );
};

export default DashboardPage;

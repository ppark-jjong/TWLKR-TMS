import React from "react";
import {
  Card,
  Button,
  Space,
  Divider,
  Layout,
  Typography,
  Row,
  Col,
  Badge,
} from "antd";
import {
  ReloadOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import PropTypes from "prop-types";
import dayjs from "dayjs";

// 내부 컴포넌트 임포트
import DashboardTable from "./DashboardTable";
import DashboardSearch from "./DashboardSearch";

const { Content } = Layout;
const { Title, Text } = Typography;

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
  handlePaginationChange,
}) => {
  // 오늘 ETA 기준 상태별 건수 계산
  const getStatusCounts = () => {
    if (!data || !Array.isArray(data))
      return { total: 0, inProgress: 0, complete: 0 };

    const today = dayjs().format("YYYY-MM-DD");

    // 오늘 ETA인 데이터 필터링
    const todayItems = data.filter((item) => {
      const itemDate = item.eta ? dayjs(item.eta).format("YYYY-MM-DD") : null;
      return itemDate === today;
    });

    // 총 건수
    const total = todayItems.length;

    // 진행 중 건수 (IN_PROGRESS)
    const inProgress = todayItems.filter(
      (item) => item.status === "IN_PROGRESS"
    ).length;

    // 완료 건수 (COMPLETE)
    const complete = todayItems.filter(
      (item) => item.status === "COMPLETE"
    ).length;

    return { total, inProgress, complete };
  };

  const statusCounts = getStatusCounts();

  // 현재 시간 포맷팅
  const currentTime = dayjs().format("YYYY-MM-DD HH:mm:ss");

  return (
    <Content>
      {/* 요약 정보 카드 */}
      <Row gutter={[16, 16]} className="dashboard-summary">
        <Col xs={24} sm={24} md={8} lg={8}>
          <Card className="dashboard-card summary-card">
            <div className="summary-content">
              <div
                className="summary-icon"
                style={{ backgroundColor: "#e6f7ff" }}
              >
                <BarChartOutlined style={{ color: "#1890ff" }} />
              </div>
              <div className="summary-data">
                <Text type="secondary">오늘 ETA 총 건수</Text>
                <Title level={3}>{statusCounts.total || 0}건</Title>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="dashboard-card summary-card">
            <div className="summary-content">
              <div
                className="summary-icon"
                style={{ backgroundColor: "#fff7e6" }}
              >
                <ClockCircleOutlined style={{ color: "#fa8c16" }} />
              </div>
              <div className="summary-data">
                <Text type="secondary">진행 중</Text>
                <Title level={3}>{statusCounts.inProgress || 0}건</Title>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="dashboard-card summary-card">
            <div className="summary-content">
              <div
                className="summary-icon"
                style={{ backgroundColor: "#f6ffed" }}
              >
                <Badge
                  status="success"
                  text={<span style={{ fontSize: "18px" }}>✓</span>}
                  style={{ color: "#52c41a" }}
                />
              </div>
              <div className="summary-data">
                <Text type="secondary">완료</Text>
                <Title level={3}>{statusCounts.complete || 0}건</Title>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 메인 대시보드 카드 */}
      <Card
        className="dashboard-main-card"
        title={
          <div className="dashboard-card-title">
            <Title level={4}>
              {title ||
                (userRole === "ADMIN" ? "관리자 대시보드" : "배송 대시보드")}
            </Title>
            <Text type="secondary" className="dashboard-update-time">
              <ClockCircleOutlined /> 마지막 업데이트: {currentTime}
            </Text>
          </div>
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

        <Divider style={{ margin: "16px 0" }} />

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

/**
 * 시각화 페이지 컴포넌트 (관리자 전용)
 */
import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  DatePicker,
  Button,
  Space,
  Select,
  Statistic,
  Empty,
  message,
  Spin,
} from "antd";
import {
  ReloadOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import dayjs from "dayjs";
import MainLayout from "../components/layout/MainLayout";
import { PageTitle, PageLoading, ErrorResult } from "../components/common";
import { VisualizationService } from "../services";

const { RangePicker } = DatePicker;
const { Option } = Select;

// 차트 색상
const COLORS = ["#1890ff", "#faad14", "#52c41a", "#f5222d", "#bfbfbf"];

// 상태별 색상 매핑
const STATUS_COLORS = {
  WAITING: "#1890ff",
  IN_PROGRESS: "#faad14",
  COMPLETE: "#52c41a",
  ISSUE: "#f5222d",
  CANCEL: "#bfbfbf",
};

// 상태별 라벨
const STATUS_LABELS = {
  WAITING: "대기",
  IN_PROGRESS: "진행",
  COMPLETE: "완료",
  ISSUE: "이슈",
  CANCEL: "취소",
};

// 창고별 색상 매핑
const WAREHOUSE_COLORS = {
  SEOUL: "#1890ff",
  BUSAN: "#faad14",
  GWANGJU: "#52c41a",
  DAEJEON: "#f5222d",
};

// 창고별 라벨
const WAREHOUSE_LABELS = {
  SEOUL: "서울",
  BUSAN: "부산",
  GWANGJU: "광주",
  DAEJEON: "대전",
};

const VisualizationPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vizData, setVizData] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, "day").startOf("day"),
    dayjs().endOf("day"),
  ]);
  const [visualizationType, setVisualizationType] =
    useState("department_based");

  // 데이터 불러오기
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        date_from: dateRange[0].format("YYYY-MM-DD"),
        date_to: dateRange[1].format("YYYY-MM-DD"),
        visualization_type:
          visualizationType === "department_based" ? "department" : "time",
      };

      const response = await VisualizationService.getStats(params);

      if (response.success) {
        setVizData(response);
      } else {
        setError(response.message || "데이터 조회 실패");
        message.error(response.message || "데이터 조회에 실패했습니다.");
        setVizData(null);
      }
    } catch (error) {
      console.error("시각화 데이터 조회 오류:", error);
      setError("데이터를 불러오는 중 오류가 발생했습니다");
      message.error("데이터를 불러오는 중 오류가 발생했습니다.");
      setVizData(null);
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchData();
  }, [dateRange, visualizationType]);

  // 날짜 변경 처리
  const handleDateChange = (dates) => {
    if (!dates || dates.length !== 2) {
      return;
    }

    setDateRange(dates);
  };

  // 시각화 타입 변경 처리
  const handleTypeChange = (value) => {
    setVisualizationType(value);
  };

  // 데이터 새로고침
  const handleRefresh = () => {
    fetchData();
  };

  // 에러 발생 시 재시도
  const handleRetry = () => {
    fetchData();
  };

  // 상태 분포 데이터 변환
  const getStatusDistributionData = () => {
    if (
      !vizData ||
      !vizData.departmentStats ||
      vizData.departmentStats.length === 0
    ) {
      return [];
    }

    const statusTotals = {
      WAITING: 0,
      IN_PROGRESS: 0,
      COMPLETE: 0,
      ISSUE: 0,
      CANCEL: 0,
    };

    vizData.departmentStats.forEach((deptStat) => {
      Object.keys(statusTotals).forEach((status) => {
        statusTotals[status] += deptStat.statusCounts[status] || 0;
      });
    });

    return Object.entries(statusTotals)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || "#1890ff",
      }));
  };

  // 부서별 분포 데이터 변환
  const getDepartmentDistributionData = () => {
    if (!vizData || !vizData.departmentStats) {
      return [];
    }

    return vizData.departmentStats.map((item) => ({
      name: item.department,
      value: item.totalCount,
      color: "#1890ff",
    }));
  };

  // 시간대별 주문 데이터 변환
  const getTimeStatsData = () => {
    if (!vizData || !vizData.timeStats || vizData.timeStats.length === 0) {
      return [];
    }

    return vizData.timeStats.map((item) => ({
      timeRange: item.timeRange,
      총무: item.총무 || 0,
      회계: item.회계 || 0,
      인사: item.인사 || 0,
      영업: item.영업 || 0,
      개발: item.개발 || 0,
    }));
  };

  // 부서별 상태 바 차트 데이터 변환
  const getDepartmentStatusBarData = () => {
    if (!vizData || !vizData.departmentStats) {
      return [];
    }

    return vizData.departmentStats.map((item) => ({
      name: item.department,
      ...item.statusCounts,
    }));
  };

  // 페이지 제목 우측 버튼
  const pageExtra = (
    <Space>
      <Select
        value={visualizationType}
        onChange={handleTypeChange}
        style={{ width: 180 }}
      >
        <Option value="department_based">부서별 통계</Option>
        <Option value="time_based">시간대별 통계</Option>
      </Select>
      <RangePicker
        value={dateRange}
        onChange={handleDateChange}
        allowClear={false}
      />
      <Button
        type="primary"
        icon={<ReloadOutlined />}
        onClick={handleRefresh}
        loading={loading}
      >
        새로고침
      </Button>
    </Space>
  );

  if (error) {
    return (
      <MainLayout>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "16px",
          }}
        >
          {pageExtra}
        </div>
        <ErrorResult
          status="error"
          title="데이터 로드 오류"
          subTitle={error}
          onRetry={handleRetry}
        />
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "16px",
          }}
        >
          {pageExtra}
        </div>
        <PageLoading tip="시각화 데이터를 불러오는 중..." />
      </MainLayout>
    );
  }

  const statusDistribution = getStatusDistributionData();
  const departmentDistribution = getDepartmentDistributionData();
  const timeStats = getTimeStatsData();
  const departmentStatusBarData = getDepartmentStatusBarData();

  const totalOrders = statusDistribution.reduce(
    (sum, item) => sum + item.value,
    0
  );
  const completedOrders =
    statusDistribution.find((item) => item.name === "완료")?.value || 0;
  const issueOrders =
    statusDistribution.find((item) => item.name === "이슈")?.value || 0;
  const completionRate =
    totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const issueRate =
    totalOrders > 0 ? Math.round((issueOrders / totalOrders) * 100) : 0;

  return (
    <MainLayout>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "16px",
        }}
      >
        {pageExtra}
      </div>

      {/* 요약 통계 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="총 주문 수"
              value={totalOrders}
              suffix="건"
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="완료율"
              value={completionRate}
              suffix="%"
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="이슈율"
              value={issueRate}
              suffix="%"
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* 그래프 영역 */}
      {loading && (
        <div style={{ textAlign: "center", padding: "50px 0" }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} />
        </div>
      )}
      {!loading && !vizData && (
        <Empty description="데이터를 불러올 수 없습니다." />
      )}
      {!loading && vizData && (
        <Row gutter={16}>
          {/* 시간대별 통계 (time_based 선택 시) */}
          {visualizationType === "time_based" && (
            <Col xs={24} style={{ marginBottom: 16 }}>
              <Card
                title={
                  <Space>
                    <LineChartOutlined />
                    <span>시간대별 접수량</span>
                  </Space>
                }
                bodyStyle={{ height: 350 }}
              >
                {timeStats.length === 0 ? (
                  <Empty description="데이터가 없습니다" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={timeStats}
                      margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeRange" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="총무"
                        name="총무"
                        stroke="#1890ff"
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="회계"
                        name="회계"
                        stroke="#52c41a"
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="인사"
                        name="인사"
                        stroke="#faad14"
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="영업"
                        name="영업"
                        stroke="#f5222d"
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="개발"
                        name="개발"
                        stroke="#bfbfbf"
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>
          )}

          {/* 부서별 통계 (department_based 선택 시) */}
          {visualizationType === "department_based" && (
            <>
              {/* 상태별 분포 */}
              <Col xs={24} md={12} lg={8} style={{ marginBottom: 16 }}>
                <Card
                  title={
                    <Space>
                      <PieChartOutlined />
                      <span>상태별 분포</span>
                    </Space>
                  }
                  bodyStyle={{ height: 350 }}
                >
                  {statusDistribution.reduce(
                    (sum, item) => sum + item.value,
                    0
                  ) === 0 ? (
                    <Empty description="데이터가 없습니다" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </Col>

              {/* 부서별 상태 현황 */}
              <Col xs={24} md={12} lg={16} style={{ marginBottom: 16 }}>
                <Card
                  title={
                    <Space>
                      <BarChartOutlined />
                      <span>부서별 상태 현황</span>
                    </Space>
                  }
                  bodyStyle={{ height: 350 }}
                >
                  {departmentStatusBarData.length === 0 ? (
                    <Empty description="데이터가 없습니다" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={departmentStatusBarData}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="WAITING"
                          name={STATUS_LABELS.WAITING}
                          stackId="a"
                          fill={STATUS_COLORS.WAITING}
                          barSize={40}
                        />
                        <Bar
                          dataKey="IN_PROGRESS"
                          name={STATUS_LABELS.IN_PROGRESS}
                          stackId="a"
                          fill={STATUS_COLORS.IN_PROGRESS}
                          barSize={40}
                        />
                        <Bar
                          dataKey="COMPLETE"
                          name={STATUS_LABELS.COMPLETE}
                          stackId="a"
                          fill={STATUS_COLORS.COMPLETE}
                          barSize={40}
                        />
                        <Bar
                          dataKey="ISSUE"
                          name={STATUS_LABELS.ISSUE}
                          stackId="a"
                          fill={STATUS_COLORS.ISSUE}
                          barSize={40}
                        />
                        <Bar
                          dataKey="CANCEL"
                          name={STATUS_LABELS.CANCEL}
                          stackId="a"
                          fill={STATUS_COLORS.CANCEL}
                          barSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </Col>
            </>
          )}
        </Row>
      )}
    </MainLayout>
  );
};

export default VisualizationPage;

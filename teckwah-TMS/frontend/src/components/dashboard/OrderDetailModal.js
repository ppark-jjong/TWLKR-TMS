/**
 * 주문 상세 모달 컴포넌트 - 개선 버전
 */
import React, { useState, useEffect } from "react";
import {
  Descriptions,
  Button,
  Space,
  Typography,
  Divider,
  Form,
  Select,
  Input,
  DatePicker,
  Row,
  Col,
  message,
  Tabs,
  Tag,
  Badge,
  Tooltip,
  Card,
  Alert,
  Spin,
  Avatar,
  Timeline,
} from "antd";
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  UserOutlined,
  InfoCircleOutlined,
  CarOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  UserSwitchOutlined,
  HistoryOutlined,
  PhoneOutlined,
  ShopOutlined,
  SyncOutlined,
  LockOutlined,
  UnlockOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { StatusTag, BaseModal } from "../common";
import { DashboardService } from "../../services";
import { useAuth } from "../../contexts/AuthContext";
import {
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  DEPARTMENT_OPTIONS,
  WAREHOUSE_OPTIONS,
  STATUS_TRANSITIONS,
} from "../../constants";
import { useLock } from "../../hooks";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

/**
 * 주문 상세 정보 모달 - 개선 버전
 * @param {boolean} visible - 모달 표시 여부
 * @param {number} orderId - 주문 ID
 * @param {Function} onCancel - 닫기 콜백
 * @param {Function} onSuccess - 성공 콜백
 */
const OrderDetailModal = ({ visible, orderId, onCancel, onSuccess }) => {
  const { currentUser } = useAuth();
  const [form] = Form.useForm();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("1");
  const [isLockAlertVisible, setIsLockAlertVisible] = useState(false);

  // 락 관련 커스텀 훅 사용
  const { acquireLock, releaseLock, isLocked } = useLock(
    DashboardService,
    "주문"
  );

  /**
   * 주문 상태 텍스트 색상 맵핑
   */
  const statusColorMap = {
    WAITING: "#faad14", // 대기: 노란색
    IN_PROGRESS: "#1890ff", // 진행: 파란색
    COMPLETE: "#52c41a", // 완료: 초록색
    ISSUE: "#ff4d4f", // 이슈: 빨간색
    CANCEL: "#d9d9d9", // 취소: 회색
  };

  /**
   * 주문 조회 (camelCase 사용)
   */
  const fetchOrder = async () => {
    if (!orderId) return;

    setLoading(true);

    try {
      const response = await DashboardService.getOrder(orderId);

      if (response.success) {
        setOrder(response.data);

        // 폼 필드 초기값 설정 (camelCase 사용)
        form.setFieldsValue({
          orderNo: response.data.orderNo,
          type: response.data.type,
          status: response.data.status,
          department: response.data.department,
          warehouse: response.data.warehouse,
          sla: response.data.sla,
          eta: response.data.eta ? dayjs(response.data.eta) : null,
          postalCode: response.data.postalCode,
          address: response.data.address,
          customer: response.data.customer,
          contact: response.data.contact,
          driverName: response.data.driverName,
          driverContact: response.data.driverContact,
          remark: response.data.remark,
        });

        // 락 상태 확인
        if (response.data.lockedInfo && !response.data.lockedInfo.editable) {
          setIsLockAlertVisible(true);
        } else {
          setIsLockAlertVisible(false);
        }
      } else {
        message.error(response.message || "주문 조회 실패");
      }
    } catch (error) {
      console.error("주문 조회 중 오류 발생:", error);
      message.error("주문 조회 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 주문 ID 변경 시 데이터 조회
   */
  useEffect(() => {
    if (visible && orderId) {
      fetchOrder();
    }

    // 모달 닫힐 때 락 해제
    return () => {
      if (isLocked && orderId) {
        releaseLock(orderId);
      }
    };
  }, [visible, orderId]);

  /**
   * 주문 수정 모드 토글
   */
  const toggleEdit = async () => {
    if (editMode) {
      // 수정 모드 종료
      setEditMode(false);

      // 락 해제
      if (orderId) {
        await releaseLock(orderId);
      }

      // 형태 초기화
      form.setFieldsValue({
        orderNo: order.orderNo,
        type: order.type,
        status: order.status,
        department: order.department,
        warehouse: order.warehouse,
        sla: order.sla,
        eta: order.eta ? dayjs(order.eta) : null,
        postalCode: order.postalCode,
        address: order.address,
        customer: order.customer,
        contact: order.contact,
        driverName: order.driverName,
        driverContact: order.driverContact,
        remark: order.remark,
      });
    } else {
      // 수정 모드 진입 (락 획득)
      const locked = await acquireLock(orderId);
      if (locked) {
        setEditMode(true);
        setActiveTab("2"); // 수정 탭으로 이동
        setIsLockAlertVisible(false);
      } else {
        // 락 획득 실패 시 알림
        message.warning("현재 다른 사용자가 이 주문을 편집 중입니다");
        fetchOrder(); // 최신 상태 다시 로드
      }
    }
  };

  /**
   * 주문 상태 변경이 가능한지 확인
   */
  const canChangeStatus = (currentStatus, newStatus) => {
    const role = currentUser?.userRole || "USER";
    return (
      STATUS_TRANSITIONS[role]?.[currentStatus]?.includes(newStatus) || false
    );
  };

  /**
   * 주문 상태 변경
   */
  const handleStatusChange = async (status) => {
    if (!orderId) return;

    try {
      setSubmitting(true);

      // 락 획득 확인
      const locked = await acquireLock(orderId);
      if (!locked) {
        message.warning("현재 다른 사용자가 이 주문을 편집 중입니다");
        return;
      }

      const response = await DashboardService.updateOrderStatus(
        orderId,
        status
      );

      if (response.success) {
        message.success(
          `주문 상태가 '${
            STATUS_OPTIONS.find((opt) => opt.value === status)?.label || status
          }'(으)로 변경되었습니다`
        );
        setOrder(response.data);

        // 성공 콜백 호출
        if (onSuccess) {
          onSuccess();
        }
      } else {
        message.error(response.message || "상태 변경 실패");
      }

      // 락 해제
      await releaseLock(orderId);
    } catch (error) {
      console.error("상태 변경 중 오류 발생:", error);
      message.error("상태 변경 중 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 주문 정보 수정 제출
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // 날짜 필드 변환 및 camelCase 사용 확인
      const updateData = {
        ...values,
        eta: values.eta?.toISOString(),
      };

      const response = await DashboardService.updateOrder(orderId, updateData);

      if (response.success) {
        message.success("주문 정보가 성공적으로 수정되었습니다");
        setOrder(response.data);
        setEditMode(false);
        setActiveTab("1"); // 상세 정보 탭으로 이동
        await releaseLock(orderId);

        if (onSuccess) {
          onSuccess();
        }
      } else {
        message.error(response.message || "주문 수정 실패");
      }
    } catch (error) {
      console.error("주문 수정 중 오류 발생:", error);
      message.error("주문 수정 중 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 모달 닫기 처리
   */
  const handleClose = async () => {
    // 수정 모드면 락 해제
    if (editMode && orderId) {
      await releaseLock(orderId);
    }

    // 편집 모드 해제
    setEditMode(false);
    setActiveTab("1");

    // 취소 콜백 호출
    if (onCancel) {
      onCancel();
    }
  };

  /**
   * 현재 상태에 따른 액션 버튼 렌더링
   */
  const renderStatusActions = () => {
    if (!order) return null;

    // 현재 상태 액션 버튼 배열
    const actions = [];

    // 사용자 권한에 따른 허용 상태 변경
    const allowedStatuses =
      STATUS_TRANSITIONS[currentUser?.userRole || "USER"][order.status] || [];

    // 허용된 상태 변경 버튼 추가
    allowedStatuses.forEach((status) => {
      const statusInfo = STATUS_OPTIONS.find((opt) => opt.value === status);
      if (statusInfo) {
        // 버튼 타입 설정 (완료=primary, 이슈=danger, 취소=default, 그외=primary)
        const buttonType =
          status === "COMPLETE"
            ? "primary"
            : status === "ISSUE"
            ? "danger"
            : status === "CANCEL"
            ? "default"
            : "primary";

        actions.push(
          <Tooltip key={status} title={`${order.status}에서 ${status}로 변경`}>
            <Button
              type={buttonType}
              onClick={() => handleStatusChange(status)}
              loading={submitting}
              icon={statusInfo.icon}
              style={{ margin: "0 4px" }}
            >
              {statusInfo.label}
            </Button>
          </Tooltip>
        );
      }
    });

    return (
      <div style={{ textAlign: "center", margin: "16px 0" }}>
        {actions.length > 0 ? (
          <>
            <Text strong style={{ marginRight: "8px" }}>
              상태 변경:
            </Text>
            <Space>{actions}</Space>
          </>
        ) : (
          <Text type="secondary">
            현재 사용자 권한으로 변경 가능한 상태가 없습니다
          </Text>
        )}
      </div>
    );
  };

  /**
   * 상세 정보 탭 콘텐츠 렌더링
   */
  const renderDetailsTabContent = () => {
    if (!order) return <Spin tip="데이터 로딩 중..." />;

    return (
      <>
        {/* 주문 메타 정보 */}
        <Card className="info-card" bordered={false}>
          <Row gutter={[16, 0]} style={{ marginBottom: "16px" }}>
            <Col xs={24} md={12}>
              <div className="order-info-header">
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {order.orderNo}
                  </Title>
                  <Space style={{ marginTop: "4px" }}>
                    <StatusTag status={order.type} type="orderType" />
                    <Divider type="vertical" />
                    <Text type="secondary">{order.department}</Text>
                    <Divider type="vertical" />
                    <Text type="secondary">{order.warehouse}</Text>
                  </Space>
                </div>
              </div>
            </Col>
            <Col xs={24} md={12} style={{ textAlign: "right" }}>
              <div className="status-badge">
                <StatusTag status={order.status} showIcon size="large" />
                {order.status === "WAITING" && (
                  <Badge
                    status="processing"
                    text="대기 중"
                    style={{ marginLeft: "8px" }}
                  />
                )}
                {order.status === "IN_PROGRESS" && (
                  <Badge
                    status="processing"
                    color="blue"
                    text="진행 중"
                    style={{ marginLeft: "8px" }}
                  />
                )}
              </div>
            </Col>
          </Row>
        </Card>

        <div className="info-section">
          <Title level={5}>
            <ShopOutlined /> 기본 정보
          </Title>
          <Card bordered={false} className="details-card">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <Text type="secondary">SLA</Text>
                  <Text strong>{order.sla}</Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <Text type="secondary">ETA</Text>
                  <Text strong>
                    {dayjs(order.eta).format("YYYY-MM-DD HH:mm")}
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <Text type="secondary">생성 시간</Text>
                  <Text>
                    {dayjs(order.createTime).format("YYYY-MM-DD HH:mm")}
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <Text type="secondary">출발 시간</Text>
                  <Text>
                    {order.departTime
                      ? dayjs(order.departTime).format("YYYY-MM-DD HH:mm")
                      : "-"}
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <Text type="secondary">완료 시간</Text>
                  <Text>
                    {order.completeTime
                      ? dayjs(order.completeTime).format("YYYY-MM-DD HH:mm")
                      : "-"}
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <Text type="secondary">마지막 수정</Text>
                  <Text>
                    {order.updateAt
                      ? dayjs(order.updateAt).format("YYYY-MM-DD HH:mm")
                      : "-"}
                  </Text>
                </div>
              </Col>
            </Row>
          </Card>
        </div>

        <div className="info-section">
          <Title level={5}>
            <UserOutlined /> 고객 정보
          </Title>
          <Card bordered={false} className="details-card">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <Text type="secondary">고객명</Text>
                  <Text strong>{order.customer}</Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <Text type="secondary">연락처</Text>
                  <Text>{order.contact || "-"}</Text>
                </div>
              </Col>
              <Col xs={24}>
                <div className="detail-item">
                  <Text type="secondary">주소</Text>
                  <Paragraph>
                    <Text>[{order.postalCode}]</Text>
                    <br />
                    <Text strong>{order.address}</Text>
                  </Paragraph>
                </div>
              </Col>
            </Row>
          </Card>
        </div>

        <div className="info-section">
          <Title level={5}>
            <CarOutlined /> 배송 정보
          </Title>
          <Card bordered={false} className="details-card">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <Text type="secondary">기사 이름</Text>
                  <Text strong>{order.driverName || "-"}</Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <Text type="secondary">기사 연락처</Text>
                  <Text>{order.driverContact || "-"}</Text>
                </div>
              </Col>
              <Col xs={24}>
                <div className="detail-item">
                  <Text type="secondary">비고</Text>
                  <Paragraph>{order.remark || "-"}</Paragraph>
                </div>
              </Col>
            </Row>
          </Card>
        </div>

        <div className="info-section">
          <Title level={5}>
            <HistoryOutlined /> 관리 정보
          </Title>
          <Card bordered={false} className="details-card">
            <Timeline>
              <Timeline.Item color="green">
                주문 생성: {dayjs(order.createTime).format("YYYY-MM-DD HH:mm")}
              </Timeline.Item>
              {order.departTime && (
                <Timeline.Item color="blue">
                  출발 시간:{" "}
                  {dayjs(order.departTime).format("YYYY-MM-DD HH:mm")}
                </Timeline.Item>
              )}
              {order.completeTime && (
                <Timeline.Item color="red">
                  완료 시간:{" "}
                  {dayjs(order.completeTime).format("YYYY-MM-DD HH:mm")}
                </Timeline.Item>
              )}
              {order.updateAt && (
                <Timeline.Item>
                  최근 수정: {dayjs(order.updateAt).format("YYYY-MM-DD HH:mm")}{" "}
                  (by {order.updatedBy || "알 수 없음"})
                </Timeline.Item>
              )}
            </Timeline>
          </Card>
        </div>
      </>
    );
  };

  /**
   * 수정 폼 탭 콘텐츠 렌더링
   */
  const renderEditTabContent = () => {
    if (!order) return <Spin tip="데이터 로딩 중..." />;

    return (
      <Form form={form} layout="vertical">
        <div className="edit-section">
          <Title level={5}>
            <InfoCircleOutlined /> 주문 기본 정보
          </Title>
          <Card bordered={false} className="edit-card">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="주문번호"
                  name="orderNo"
                  rules={[{ required: true, message: "주문번호를 입력하세요" }]}
                >
                  <Input readOnly disabled />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="주문유형"
                  name="type"
                  rules={[{ required: true, message: "주문유형을 선택하세요" }]}
                >
                  <Select disabled={!editMode}>
                    {TYPE_OPTIONS.map((option) => (
                      <Option key={option.value} value={option.value}>
                        <Space>
                          {option.icon &&
                            React.cloneElement(option.icon, {
                              style: { color: option.color },
                            })}
                          {option.label}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="부서"
                  name="department"
                  rules={[{ required: true, message: "부서를 선택하세요" }]}
                >
                  <Select disabled={!editMode}>
                    {DEPARTMENT_OPTIONS.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="창고"
                  name="warehouse"
                  rules={[{ required: true, message: "창고를 선택하세요" }]}
                >
                  <Select disabled={!editMode}>
                    {WAREHOUSE_OPTIONS.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="SLA"
                  name="sla"
                  rules={[{ required: true, message: "SLA를 입력하세요" }]}
                >
                  <Input disabled={!editMode} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="상태" name="status">
                  <Select disabled>
                    {STATUS_OPTIONS.map((option) => (
                      <Option key={option.value} value={option.value}>
                        <Space>
                          {option.icon &&
                            React.cloneElement(option.icon, {
                              style: { color: option.color },
                            })}
                          {option.label}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="ETA"
                  name="eta"
                  rules={[{ required: true, message: "ETA를 선택하세요" }]}
                >
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    style={{ width: "100%" }}
                    disabled={!editMode}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </div>

        <div className="edit-section">
          <Title level={5}>
            <EnvironmentOutlined /> 고객 및 배송 정보
          </Title>
          <Card bordered={false} className="edit-card">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="우편번호"
                  name="postalCode"
                  rules={[{ required: true, message: "우편번호를 입력하세요" }]}
                >
                  <Input maxLength={5} disabled={!editMode} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="고객명"
                  name="customer"
                  rules={[{ required: true, message: "고객명을 입력하세요" }]}
                >
                  <Input disabled={!editMode} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="주소"
              name="address"
              rules={[{ required: true, message: "주소를 입력하세요" }]}
            >
              <Input disabled={!editMode} />
            </Form.Item>

            <Form.Item label="연락처" name="contact">
              <Input disabled={!editMode} />
            </Form.Item>
          </Card>
        </div>

        <div className="edit-section">
          <Title level={5}>
            <CarOutlined /> 배차 정보
          </Title>
          <Card bordered={false} className="edit-card">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="기사 이름" name="driverName">
                  <Input disabled={!editMode} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="기사 연락처" name="driverContact">
                  <Input disabled={!editMode} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="비고" name="remark">
              <TextArea rows={4} disabled={!editMode} />
            </Form.Item>
          </Card>
        </div>
      </Form>
    );
  };

  /**
   * 상태 이력 및 통계 탭 콘텐츠 렌더링
   */
  const renderHistoryTabContent = () => {
    if (!order) return <Spin tip="데이터 로딩 중..." />;

    // 가상의 상태 이력 데이터 (실제로는 API에서 받아와야 함)
    const statusHistory = [
      {
        status: "WAITING",
        timestamp: order.createTime,
        user: order.createdBy || "시스템",
      },
    ];

    if (order.departTime) {
      statusHistory.push({
        status: "IN_PROGRESS",
        timestamp: order.departTime,
        user: order.updatedBy || "시스템",
      });
    }

    if (order.completeTime) {
      statusHistory.push({
        status: "COMPLETE",
        timestamp: order.completeTime,
        user: order.updatedBy || "시스템",
      });
    }

    return (
      <>
        <div className="history-section">
          <Title level={5}>
            <HistoryOutlined /> 상태 변경 이력
          </Title>
          <Card bordered={false} className="history-card">
            <Timeline mode="left">
              {statusHistory.map((history, index) => {
                const statusInfo = STATUS_OPTIONS.find(
                  (opt) => opt.value === history.status
                );
                return (
                  <Timeline.Item
                    key={index}
                    color={statusColorMap[history.status] || "#1890ff"}
                    label={dayjs(history.timestamp).format("YYYY-MM-DD HH:mm")}
                  >
                    <Space>
                      {statusInfo?.icon}
                      <Text strong>{statusInfo?.label || history.status}</Text>
                      <Text type="secondary">by {history.user}</Text>
                    </Space>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </Card>
        </div>

        <div className="history-section">
          <Title level={5}>
            <InfoCircleOutlined /> 배송 타임라인
          </Title>
          <Card bordered={false} className="history-card">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card className="mini-card">
                  <Statistic
                    title="접수 후 경과 시간"
                    value={
                      dayjs().diff(dayjs(order.createTime), "hour") + "시간"
                    }
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: "#1890ff" }}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="mini-card">
                  <Statistic
                    title="출발 경과 시간"
                    value={
                      order.departTime
                        ? dayjs().diff(dayjs(order.departTime), "hour") + "시간"
                        : "출발 전"
                    }
                    prefix={<CarOutlined />}
                    valueStyle={{ color: "#52c41a" }}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="mini-card">
                  <Statistic
                    title="완료 여부"
                    value={order.completeTime ? "완료됨" : "진행 중"}
                    prefix={
                      order.completeTime ? (
                        <CheckCircleOutlined />
                      ) : (
                        <SyncOutlined spin />
                      )
                    }
                    valueStyle={{
                      color: order.completeTime ? "#52c41a" : "#1890ff",
                    }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </div>
      </>
    );
  };

  // 모달 푸터 버튼
  const renderModalFooter = () => {
    const buttons = [
      <Button key="close" onClick={handleClose}>
        닫기
      </Button>,
    ];

    if (editMode) {
      buttons.push(
        <Button key="cancel-edit" onClick={toggleEdit} icon={<CloseOutlined />}>
          편집 취소
        </Button>
      );

      buttons.push(
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSubmit}
          loading={submitting}
        >
          저장
        </Button>
      );
    } else if (!isLockAlertVisible) {
      buttons.push(
        <Button
          key="edit"
          type="primary"
          icon={<EditOutlined />}
          onClick={toggleEdit}
        >
          정보 수정
        </Button>
      );
    }

    return buttons;
  };

  return (
    <BaseModal
      title={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Space>
            <span>주문 상세정보</span>
            {order && <Tag color="#108ee9">{order.orderNo}</Tag>}
          </Space>
          {isLockAlertVisible && (
            <Tag icon={<LockOutlined />} color="warning">
              {order?.lockedInfo?.lockedBy || "다른 사용자"}가 편집 중
            </Tag>
          )}
          {editMode && (
            <Tag icon={<UnlockOutlined />} color="success">
              편집 모드
            </Tag>
          )}
        </div>
      }
      visible={visible}
      onCancel={handleClose}
      width={800}
      footer={renderModalFooter()}
      loading={loading}
      destroyOnClose
      maskClosable={false}
      bodyStyle={{ padding: "12px 24px" }}
    >
      {/* 락 알림 */}
      {isLockAlertVisible && (
        <Alert
          message="현재 다른 사용자가 이 주문을 편집 중입니다"
          description={`${
            order?.lockedInfo?.lockedBy || "다른 사용자"
          }가 현재 이 주문을 편집 중입니다. 잠시 후에 다시 시도해주세요.`}
          type="warning"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: "16px" }}
        />
      )}

      {/* 탭 콘텐츠 */}
      {!loading && order && (
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <InfoCircleOutlined /> 상세 정보
              </span>
            }
            key="1"
          >
            {renderDetailsTabContent()}
          </TabPane>
          <TabPane
            tab={
              <span>
                <EditOutlined /> {editMode ? "정보 수정" : "정보"}
              </span>
            }
            key="2"
            disabled={isLockAlertVisible && !editMode}
          >
            {renderEditTabContent()}
          </TabPane>
          <TabPane
            tab={
              <span>
                <HistoryOutlined /> 이력
              </span>
            }
            key="3"
          >
            {renderHistoryTabContent()}
          </TabPane>
        </Tabs>
      )}

      {/* 상태 변경 액션 */}
      {!loading &&
        order &&
        activeTab === "1" &&
        !editMode &&
        renderStatusActions()}

      {/* 스타일 정의 */}
      <style jsx="true">{`
        .info-card,
        .edit-card,
        .history-card,
        .details-card {
          margin-bottom: 16px;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .info-section,
        .edit-section,
        .history-section {
          margin-bottom: 24px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          margin-bottom: 8px;
        }

        .detail-item .ant-typography-secondary {
          margin-bottom: 4px;
          font-size: 13px;
        }

        .order-info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-badge {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .mini-card {
          text-align: center;
          height: 100%;
        }

        @media (max-width: 768px) {
          .status-badge {
            margin-top: 12px;
            justify-content: flex-start;
          }
        }
      `}</style>
    </BaseModal>
  );
};

export default OrderDetailModal;

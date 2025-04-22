/**
 * 주문 생성 모달 컴포넌트 - 개선 버전
 */
import React, { useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Button,
  message,
  Card,
  Divider,
  Typography,
  Tooltip,
  Steps,
  Space,
} from "antd";
import {
  InfoCircleOutlined,
  SaveOutlined,
  CloseOutlined,
  CarOutlined,
  ShopOutlined,
  UserOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { DashboardService } from "../../services";
import dayjs from "dayjs";
import {
  STATUS_OPTIONS,
  DEPARTMENT_OPTIONS,
  WAREHOUSE_OPTIONS,
  TYPE_OPTIONS,
} from "../../constants";

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { Step } = Steps;

const OrderCreateModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 폼 초기화
  const resetForm = () => {
    form.resetFields();
    setCurrentStep(0);
  };

  // 우편번호 자동 처리
  const formatPostalCode = (e) => {
    let value = e.target.value;

    // 숫자만 추출
    value = value.replace(/[^0-9]/g, "");

    // 4자리인 경우 앞에 '0' 추가
    if (value.length === 4) {
      value = "0" + value;
    }

    form.setFieldsValue({ postalCode: value });
  };

  // 주문 생성 제출
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 우편번호 처리 - 4자리인 경우 앞에 '0' 추가
      let postalCode = values.postalCode;
      if (postalCode && postalCode.length === 4) {
        postalCode = "0" + postalCode;
        values.postalCode = postalCode;
      }

      // 날짜 데이터 ISO 문자열로 변환
      const orderData = {
        ...values,
        eta: values.eta.toISOString(),
      };

      const response = await DashboardService.createOrder(orderData);

      if (response.success) {
        message.success("주문이 성공적으로 생성되었습니다");
        resetForm();

        if (onSuccess) {
          onSuccess();
        }

        onCancel();
      } else {
        message.error(response.message || "주문 생성에 실패했습니다");
      }
    } catch (error) {
      console.error("주문 생성 오류:", error);

      if (error.errorFields) {
        // 필드 에러가 있는 경우 첫 번째 에러가 있는 단계로 이동
        const firstErrorField = error.errorFields[0]?.name[0];

        if (
          ["orderNo", "type", "department", "warehouse", "sla", "eta"].includes(
            firstErrorField
          )
        ) {
          setCurrentStep(0);
        } else if (
          ["postalCode", "address", "customer", "contact"].includes(
            firstErrorField
          )
        ) {
          setCurrentStep(1);
        } else {
          setCurrentStep(2);
        }
      }

      message.error("입력 정보를 확인해주세요");
    } finally {
      setLoading(false);
    }
  };

  // 취소 처리
  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  // 다음 단계로 이동
  const nextStep = async () => {
    try {
      // 현재 단계 필드 유효성 검사
      if (currentStep === 0) {
        await form.validateFields([
          "orderNo",
          "type",
          "department",
          "warehouse",
          "sla",
          "eta",
        ]);
      } else if (currentStep === 1) {
        await form.validateFields([
          "postalCode",
          "address",
          "customer",
          "contact",
        ]);
      }

      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error("유효성 검사 오류:", error);
      message.error("필수 입력 정보를 확인해주세요");
    }
  };

  // 이전 단계로 이동
  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // 단계별 콘텐츠 렌더링
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card
            title={
              <Title level={5}>
                <ShopOutlined /> 주문 기본 정보
              </Title>
            }
            bordered={false}
            className="form-card"
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="주문번호"
                  name="orderNo"
                  rules={[{ required: true, message: "주문번호를 입력하세요" }]}
                  tooltip="고유한 주문번호를 입력하세요"
                >
                  <Input
                    placeholder="주문번호 입력"
                    prefix={<InfoCircleOutlined />}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="주문유형"
                  name="type"
                  rules={[{ required: true, message: "주문유형을 선택하세요" }]}
                >
                  <Select placeholder="유형 선택">
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
                  <Select placeholder="부서 선택">
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
                  <Select placeholder="창고 선택">
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
                  tooltip="처리 기준 시간(예: 당일, 익일)"
                >
                  <Input placeholder="SLA 입력" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="ETA (예상 도착 시간)"
              name="eta"
              rules={[{ required: true, message: "ETA를 선택하세요" }]}
              tooltip="배송 예정 일시"
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                style={{ width: "100%" }}
                placeholder="ETA 선택"
                disabledDate={(current) =>
                  current && current < dayjs().startOf("day")
                }
              />
            </Form.Item>
          </Card>
        );

      case 1:
        return (
          <Card
            title={
              <Title level={5}>
                <EnvironmentOutlined /> 고객 및 배송 정보
              </Title>
            }
            bordered={false}
            className="form-card"
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="우편번호"
                  name="postalCode"
                  rules={[
                    { required: true, message: "우편번호를 입력하세요" },
                    {
                      pattern: /^[0-9]{5}$/,
                      message: "5자리 숫자로 입력하세요",
                    },
                  ]}
                  tooltip={{
                    title:
                      "5자리 우편번호를 입력하세요. 4자리 입력 시 앞에 0이 자동으로 추가됩니다.",
                    icon: <QuestionCircleOutlined />,
                  }}
                >
                  <Input
                    placeholder="우편번호 입력 (5자리)"
                    maxLength={5}
                    onChange={formatPostalCode}
                    prefix={<EnvironmentOutlined />}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="고객명"
                  name="customer"
                  rules={[{ required: true, message: "고객명을 입력하세요" }]}
                >
                  <Input placeholder="고객명 입력" prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="주소"
              name="address"
              rules={[{ required: true, message: "주소를 입력하세요" }]}
            >
              <Input placeholder="주소 입력" prefix={<EnvironmentOutlined />} />
            </Form.Item>

            <Form.Item
              label="연락처"
              name="contact"
              rules={[
                {
                  pattern: /^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/,
                  message:
                    "올바른 연락처 형식으로 입력하세요 (예: 010-1234-5678)",
                  validateTrigger: "onBlur",
                },
              ]}
              tooltip="예: 010-1234-5678"
            >
              <Input placeholder="연락처 입력" prefix={<PhoneOutlined />} />
            </Form.Item>
          </Card>
        );

      case 2:
        return (
          <Card
            title={
              <Title level={5}>
                <CarOutlined /> 배차 및 부가 정보
              </Title>
            }
            bordered={false}
            className="form-card"
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="기사 이름" name="driverName">
                  <Input
                    placeholder="기사 이름 입력"
                    prefix={<UserOutlined />}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="기사 연락처"
                  name="driverContact"
                  rules={[
                    {
                      pattern: /^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/,
                      message: "올바른 연락처 형식으로 입력하세요",
                      validateTrigger: "onBlur",
                    },
                  ]}
                >
                  <Input
                    placeholder="기사 연락처 입력"
                    prefix={<PhoneOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="비고" name="remark">
              <TextArea
                rows={4}
                placeholder="배송 관련 특이사항이나 참고 내용을 입력하세요"
              />
            </Form.Item>

            <Divider />

            <div className="order-summary">
              <Title level={5}>주문 정보 요약</Title>
              <Text>작성한 주문 정보를 확인 후 완료 버튼을 클릭하세요.</Text>
              <ul>
                <li>
                  <Text strong>주문번호:</Text> {form.getFieldValue("orderNo")}
                </li>
                <li>
                  <Text strong>주문유형:</Text>{" "}
                  {TYPE_OPTIONS.find(
                    (opt) => opt.value === form.getFieldValue("type")
                  )?.label || "-"}
                </li>
                <li>
                  <Text strong>부서:</Text>{" "}
                  {DEPARTMENT_OPTIONS.find(
                    (opt) => opt.value === form.getFieldValue("department")
                  )?.label || "-"}
                </li>
                <li>
                  <Text strong>고객명:</Text> {form.getFieldValue("customer")}
                </li>
                <li>
                  <Text strong>ETA:</Text>{" "}
                  {form.getFieldValue("eta")?.format("YYYY-MM-DD HH:mm") || "-"}
                </li>
              </ul>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  // 모달 푸터 버튼
  const renderFooterButtons = () => {
    const buttons = [];

    // 취소 버튼
    buttons.push(
      <Button key="cancel" onClick={handleCancel} icon={<CloseOutlined />}>
        취소
      </Button>
    );

    // 이전 단계 버튼
    if (currentStep > 0) {
      buttons.push(
        <Button key="prev" onClick={prevStep}>
          이전
        </Button>
      );
    }

    // 다음 단계 또는 완료 버튼
    if (currentStep < 2) {
      buttons.push(
        <Button key="next" type="primary" onClick={nextStep}>
          다음
        </Button>
      );
    } else {
      buttons.push(
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={loading}
          icon={<SaveOutlined />}
        >
          완료
        </Button>
      );
    }

    return buttons;
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ marginRight: "10px" }}>새 주문 등록</span>
          <Text type="secondary" style={{ fontSize: "14px" }}>
            ({currentStep + 1}/3){" "}
            {currentStep === 0
              ? "기본 정보"
              : currentStep === 1
              ? "고객 및 배송 정보"
              : "배차 및 추가 정보"}
          </Text>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      width={800}
      destroyOnClose
      footer={renderFooterButtons()}
      bodyStyle={{ padding: "12px 24px" }}
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: "DELIVERY",
          department: "CS",
          warehouse: "SEOUL",
          sla: "당일",
          eta: dayjs().add(1, "day"),
        }}
        style={{ marginTop: "24px" }}
      >
        <Steps
          current={currentStep}
          onChange={setCurrentStep}
          style={{ marginBottom: "24px" }}
          items={[
            {
              title: "기본 정보",
              description: "주문 기본 사항",
              icon: <ShopOutlined />,
            },
            {
              title: "배송 정보",
              description: "고객 및 주소",
              icon: <EnvironmentOutlined />,
            },
            {
              title: "추가 정보",
              description: "배차 및 비고",
              icon: <CarOutlined />,
            },
          ]}
        />

        {renderStepContent()}
      </Form>

      <style jsx="true">{`
        .form-card {
          margin-bottom: 20px;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }
        .order-summary {
          background-color: #fafafa;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #f0f0f0;
        }
        .order-summary ul {
          margin-top: 16px;
          padding-left: 20px;
        }
        .order-summary li {
          margin-bottom: 8px;
        }
      `}</style>
    </Modal>
  );
};

export default OrderCreateModal;

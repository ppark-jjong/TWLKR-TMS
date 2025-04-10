// src/components/CreateDashboardModal.js - 개선된 버전

import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Row,
  Col,
  Typography,
  Card,
  Divider,
} from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import locale from "antd/es/date-picker/locale/ko_KR";
import { createDashboard } from "../utils/api";
import { formatPhoneNumber } from "../utils/commonUtils";
import { getUserFromToken } from "../utils/authHelpers";
import {
  ShopOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  MailOutlined,
  ClockCircleOutlined,
  UnorderedListOutlined,
  HomeOutlined,
  FileTextOutlined,
  NumberOutlined,
  TagOutlined,
} from "@ant-design/icons";

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const CreateDashboardModal = ({
  open,
  onCancel,
  onSuccess,
  userRole = "USER",
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [userDepartment, setUserDepartment] = useState(null);

  // 스타일 정의
  const styles = {
    formItem: {
      marginBottom: 16,
    },
    input: {
      borderRadius: "6px",
      height: "40px",
    },
    select: {
      width: "100%",
      borderRadius: "6px",
    },
    datePicker: {
      width: "100%",
      borderRadius: "6px",
    },
    textArea: {
      borderRadius: "6px",
      marginBottom: 0,
    },
    card: {
      marginBottom: 24,
      borderRadius: "8px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    },
    cardTitle: {
      fontSize: "16px",
      fontWeight: "600",
      margin: 0,
    },
    section: {
      marginBottom: 24,
    },
    label: {
      fontWeight: "500",
      fontSize: "14px",
    },
    modalTitle: {
      fontSize: "18px",
      fontWeight: "600",
    },
  };

  // 사용자 부서 정보 가져오기
  useEffect(() => {
    const user = getUserFromToken();
    if (user) {
      setUserDepartment(user.user_department);

      // 폼 초기값 설정
      form.setFieldsValue({
        department: user.user_department,
      });
    }
  }, [form, open]); // open 의존성 추가로 모달이 열릴 때마다 초기화

  // 생성 뮤테이션
  const createMutation = useMutation((data) => createDashboard(data), {
    onSuccess: () => {
      message.success("대시보드가 생성되었습니다");
      queryClient.invalidateQueries("dashboards");
      form.resetFields();
      onCancel();
    },
    onError: (error) => {
      console.error("Create dashboard error:", error);
      message.error("대시보드 생성 중 오류가 발생했습니다");
    },
    onSettled: () => {
      setConfirmLoading(false);
    },
  });

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        setConfirmLoading(true);

        // 날짜 포맷 변환
        const formattedValues = {
          ...values,
          eta: values.eta
            ? values.eta.format("YYYY-MM-DDTHH:mm:ss")
            : undefined,
          contact: values.contact
            ? formatPhoneNumber(values.contact)
            : undefined,
        };

        createMutation.mutate(formattedValues);
      })
      .catch((errorInfo) => {
        console.log("Validate Failed:", errorInfo);
      });
  };

  return (
    <Modal
      title={<div style={styles.modalTitle}>새 주문 등록</div>}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      width={1200}
      destroyOnClose
      okText="등록하기"
      cancelText="취소"
      bodyStyle={{ padding: "24px", maxHeight: "80vh", overflowY: "auto" }}
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        size="large"
        labelCol={{ style: styles.label }}
      >
        <Card
          title={
            <Title level={5} style={styles.cardTitle}>
              기본 정보
            </Title>
          }
          style={styles.card}
          bodyStyle={{ padding: "20px" }}
        >
          <Row gutter={24}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="order_no"
                label="주문번호"
                rules={[{ required: true, message: "주문번호를 입력해주세요" }]}
                style={styles.formItem}
              >
                <Input
                  maxLength={15}
                  placeholder="주문번호 입력"
                  style={styles.input}
                  prefix={<NumberOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="type"
                label="유형"
                rules={[{ required: true, message: "유형을 선택해주세요" }]}
                style={styles.formItem}
              >
                <Select
                  placeholder="유형 선택"
                  style={styles.select}
                  dropdownStyle={{ padding: "8px 0" }}
                >
                  <Option value="DELIVERY">배송</Option>
                  <Option value="RETURN">회수</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="customer"
                label="고객명"
                rules={[{ required: true, message: "고객명을 입력해주세요" }]}
                style={styles.formItem}
              >
                <Input
                  maxLength={150}
                  placeholder="고객명 입력"
                  style={styles.input}
                  prefix={<UserOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="department"
                label="부서"
                rules={[{ required: true, message: "부서를 선택해주세요" }]}
                style={styles.formItem}
              >
                <Select
                  placeholder="부서 선택"
                  style={styles.select}
                  dropdownStyle={{ padding: "8px 0" }}
                >
                  <Option value="CS">CS</Option>
                  <Option value="HES">HES</Option>
                  <Option value="LENOVO">LENOVO</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="warehouse"
                label="창고"
                rules={[{ required: true, message: "창고를 선택해주세요" }]}
                style={styles.formItem}
              >
                <Select
                  placeholder="창고 선택"
                  style={styles.select}
                  dropdownStyle={{ padding: "8px 0" }}
                  prefix={<HomeOutlined style={{ color: "#bfbfbf" }} />}
                >
                  <Option value="SEOUL">서울</Option>
                  <Option value="BUSAN">부산</Option>
                  <Option value="GWANGJU">광주</Option>
                  <Option value="DAEJEON">대전</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="sla"
                label="SLA"
                rules={[{ required: true, message: "SLA를 입력해주세요" }]}
                style={styles.formItem}
              >
                <Input
                  maxLength={10}
                  placeholder="SLA 입력"
                  style={styles.input}
                  prefix={<TagOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          title={
            <Title level={5} style={styles.cardTitle}>
              배송 정보
            </Title>
          }
          style={styles.card}
          bodyStyle={{ padding: "20px" }}
        >
          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="eta"
                label="예상 도착 시간"
                rules={[
                  { required: true, message: "예상 도착 시간을 선택해주세요" },
                ]}
                style={styles.formItem}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  locale={locale}
                  style={styles.datePicker}
                  disabledDate={(current) => {
                    return current && current < dayjs().startOf("day");
                  }}
                  suffixIcon={
                    <ClockCircleOutlined style={{ color: "#bfbfbf" }} />
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="contact"
                label="연락처"
                rules={[
                  {
                    pattern: /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/,
                    message: "올바른 연락처 형식이 아닙니다",
                  },
                ]}
                style={styles.formItem}
              >
                <Input
                  maxLength={20}
                  placeholder="연락처 입력 (예: 010-1234-5678)"
                  style={styles.input}
                  prefix={<PhoneOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={6}>
              <Form.Item
                name="postal_code"
                label="우편번호"
                rules={[
                  { required: true, message: "우편번호를 입력해주세요" },
                  { len: 5, message: "우편번호는 5자리여야 합니다" },
                  {
                    pattern: /^\d{5}$/,
                    message: "우편번호는 숫자 5자리여야 합니다",
                  },
                ]}
                style={styles.formItem}
              >
                <Input
                  maxLength={5}
                  placeholder="우편번호 (예: 12345)"
                  style={styles.input}
                  prefix={<MailOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={18}>
              <Form.Item
                name="address"
                label="주소"
                rules={[{ required: true, message: "주소를 입력해주세요" }]}
                style={styles.formItem}
              >
                <Input
                  placeholder="주소 입력"
                  style={styles.input}
                  prefix={<EnvironmentOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                name="address_detail"
                label="상세 주소"
                style={styles.formItem}
              >
                <Input
                  placeholder="상세 주소 입력 (선택사항)"
                  style={styles.input}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          title={
            <Title level={5} style={styles.cardTitle}>
              추가 정보
            </Title>
          }
          style={styles.card}
          bodyStyle={{ padding: "20px" }}
        >
          <Row gutter={24}>
            <Col span={24}>
              <Form.Item name="remark" label="메모" style={styles.formItem}>
                <TextArea
                  rows={4}
                  maxLength={1000}
                  placeholder="메모 입력 (선택사항)"
                  style={styles.textArea}
                  prefix={<FileTextOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </Modal>
  );
};

export default CreateDashboardModal;

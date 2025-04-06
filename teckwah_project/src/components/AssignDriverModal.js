// src/components/AssignDriverModal.js
import React from "react";
import {
  Form,
  Input,
  Row,
  Col,
  Badge,
  Typography,
  Alert,
  Divider,
  Select,
} from "antd";
import BaseModal from "./BaseModal";
import { UserOutlined, PhoneOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;
const { Option } = Select;

/**
 * 배차 처리 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.open - 모달 표시 여부
 * @param {Function} props.onOk - 확인 핸들러
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {Object} props.form - Form 인스턴스
 * @param {boolean} props.confirmLoading - 확인 버튼 로딩 상태
 * @param {number} props.selectedCount - 선택된 주문 개수
 */
const AssignDriverModal = ({
  open,
  onOk,
  onCancel,
  form,
  confirmLoading = false,
  selectedCount = 0,
}) => {
  // 기사 선택 옵션 (예시, 실제로는 API에서 가져오거나 props로 받을 수 있음)
  const driverOptions = [
    { name: "김배송", contact: "010-1234-5678" },
    { name: "이운송", contact: "010-2345-6789" },
    { name: "박택배", contact: "010-3456-7890" },
  ];

  // 기사 선택 핸들러
  const handleDriverSelect = (value) => {
    const selectedDriver = driverOptions.find((d) => d.name === value);
    if (selectedDriver) {
      form.setFieldsValue({
        driver_contact: selectedDriver.contact,
      });
    }
  };

  // 스타일 정의
  const styles = {
    formItem: {
      marginBottom: 20,
    },
    input: {
      borderRadius: "6px",
      height: "40px",
    },
    label: {
      fontWeight: "500",
      fontSize: "14px",
    },
    alert: {
      marginBottom: 24,
      borderRadius: "6px",
    },
    section: {
      marginBottom: 24,
    },
    title: {
      fontSize: "16px",
      fontWeight: "600",
      marginBottom: "16px",
    },
  };

  return (
    <BaseModal
      title={
        <div style={{ fontSize: "18px", fontWeight: "600" }}>배차 처리</div>
      }
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      width={800}
      centered
      okText="배차하기"
      cancelText="취소"
    >
      {selectedCount > 0 && (
        <Alert
          message={<Text strong>선택된 주문: {selectedCount}건</Text>}
          description="선택한 모든 주문에 동일한 배송기사 정보가 할당됩니다. 할당 후에 개별적으로 수정할 수 있습니다."
          type="info"
          showIcon
          style={styles.alert}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        size="large"
        labelCol={{ style: styles.label }}
      >
        <div style={styles.section}>
          <Title level={5} style={styles.title}>
            기존 기사 선택
          </Title>
          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                label="등록된 기사 목록"
                name="registered_driver"
                style={styles.formItem}
              >
                <Select
                  placeholder="기사를 선택하세요"
                  style={styles.input}
                  onChange={handleDriverSelect}
                  allowClear
                >
                  {driverOptions.map((driver) => (
                    <Option key={driver.name} value={driver.name}>
                      {driver.name} ({driver.contact})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>

        <Divider>또는 신규 기사 정보 입력</Divider>

        <div style={styles.section}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="driver_name"
                label="기사명"
                rules={[{ required: true, message: "기사명을 입력해주세요" }]}
                style={styles.formItem}
              >
                <Input
                  placeholder="기사명 입력"
                  style={styles.input}
                  prefix={<UserOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
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
                style={styles.formItem}
              >
                <Input
                  placeholder="연락처 입력 (예: 010-1234-5678)"
                  style={styles.input}
                  prefix={<PhoneOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>
      </Form>
    </BaseModal>
  );
};

export default AssignDriverModal;

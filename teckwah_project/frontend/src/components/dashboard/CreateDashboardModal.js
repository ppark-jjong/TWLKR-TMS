// frontend/src/components/dashboard/CreateDashboardModal.js
import React from "react";
import { Modal, Form, Input, Select, DatePicker, Row, Col } from "antd";
import { formatPhoneNumber } from "../../utils/Formatter";
import DashboardService from "../../services/DashboardService";
import {
  TYPE_TYPES,
  TYPE_TEXTS,
  WAREHOUSE_TYPES,
  WAREHOUSE_TEXTS,
  FONT_STYLES,
} from "../../utils/Constants";
import message, { MessageKeys, MessageTemplates } from "../../utils/message";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

const CreateDashboardModal = ({
  visible,
  onCancel,
  onSuccess,
  userDepartment,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  // 연락처 포맷팅 처리
  const handlePhoneChange = (field) => (e) => {
    const value = e.target.value.trim().replace(/[^\d]/g, "");
    const formattedNumber = formatPhoneNumber(value);
    form.setFieldsValue({ [field]: formattedNumber });
  };

  const handleSubmit = async () => {
    const key = MessageKeys.DASHBOARD.CREATE;
    try {
      const values = await form.validateFields();
      setLoading(true);
      message.loading("대시보드 생성 중...", key);

      // 우편번호 5자리 검증
      if (!/^\d{5}$/.test(values.postal_code)) {
        message.error(MessageTemplates.DASHBOARD.VALIDATION.POSTAL_CODE, key);
        return;
      }

      // 연락처 형식 검증
      if (values.contact && !/^\d{2,3}-\d{3,4}-\d{4}$/.test(values.contact)) {
        message.error(MessageTemplates.DASHBOARD.VALIDATION.PHONE_FORMAT, key);
        return;
      }

      const dashboardData = {
        ...values,
        department: userDepartment,
        eta: values.eta.toISOString(),
      };

      await DashboardService.createDashboard(dashboardData);
      message.loadingToSuccess(MessageTemplates.DASHBOARD.CREATE_SUCCESS, key);
      form.resetFields();
      onSuccess();
    } catch (error) {
      message.loadingToError(MessageTemplates.DASHBOARD.CREATE_FAIL, key);
    } finally {
      setLoading(false);
    }
  };

  // ETA 선택 제한 (현재 시간 이후만 선택 가능)
  const disabledDate = (current) => {
    return current && current < dayjs().startOf("day");
  };

  const disabledTime = (current) => {
    const now = dayjs();
    if (current && current.isSame(now, "day")) {
      return {
        disabledHours: () => Array.from({ length: now.hour() }, (_, i) => i),
        disabledMinutes: (hour) =>
          hour === now.hour()
            ? Array.from({ length: now.minute() }, (_, i) => i)
            : [],
      };
    }
    return {};
  };

  return (
    <Modal
      title={<span style={FONT_STYLES.TITLE.LARGE}>대시보드 생성</span>}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={1000}
      maskClosable={true}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          eta: dayjs().add(1, "hour"),
        }}
      >
        <Row gutter={24}>
          <Col span={12}>
            {/* 기본 정보 */}
            <Form.Item
              name="type"
              label={<span style={FONT_STYLES.LABEL}>종류</span>}
              rules={[{ required: true, message: "종류를 선택해주세요" }]}
            >
              <Select style={FONT_STYLES.BODY.MEDIUM}>
                {Object.entries(TYPE_TYPES).map(([key, value]) => (
                  <Option key={key} value={value}>
                    {TYPE_TEXTS[key]}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="order_no"
              label={<span style={FONT_STYLES.LABEL}>주문번호</span>}
              rules={[
                { required: true, message: "주문번호를 입력해주세요" },
                { pattern: /^\d+$/, message: "숫자만 입력 가능합니다" },
              ]}
            >
              <Input maxLength={20} style={FONT_STYLES.BODY.MEDIUM} />
            </Form.Item>

            <Form.Item
              name="warehouse"
              label={<span style={FONT_STYLES.LABEL}>출발허브</span>}
              rules={[{ required: true, message: "출발허브를 선택해주세요" }]}
            >
              <Select style={FONT_STYLES.BODY.MEDIUM}>
                {Object.entries(WAREHOUSE_TYPES).map(([key, value]) => (
                  <Option key={key} value={value}>
                    {WAREHOUSE_TEXTS[key]}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="sla"
              label={<span style={FONT_STYLES.LABEL}>SLA</span>}
              rules={[
                { required: true, message: "SLA를 입력해주세요" },
                { max: 10, message: "SLA는 10자를 초과할 수 없습니다" },
                {
                  whitespace: true,
                  message: "공백만으로는 입력할 수 없습니다",
                },
              ]}
            >
              <Input
                placeholder="SLA를 입력하세요"
                maxLength={10}
                style={FONT_STYLES.BODY.MEDIUM}
              />
            </Form.Item>

            <Form.Item
              name="eta"
              label={<span style={FONT_STYLES.LABEL}>ETA</span>}
              rules={[{ required: true, message: "ETA를 선택해주세요" }]}
            >
              <DatePicker
                showTime={{ format: "HH:mm" }}
                format="YYYY-MM-DD HH:mm"
                disabledDate={disabledDate}
                disabledTime={disabledTime}
                style={{ width: "100%", ...FONT_STYLES.BODY.MEDIUM }}
                size="large"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            {/* 배송 정보 */}
            <Form.Item
              name="postal_code"
              label={<span style={FONT_STYLES.LABEL}>우편번호</span>}
              rules={[
                { required: true, message: "우편번호를 입력해주세요" },
                { pattern: /^\d{5}$/, message: "5자리 숫자로 입력해주세요" },
              ]}
            >
              <Input
                maxLength={5}
                placeholder="12345"
                style={FONT_STYLES.BODY.MEDIUM}
              />
            </Form.Item>

            <Form.Item
              name="address"
              label={<span style={FONT_STYLES.LABEL}>도착 주소</span>}
              rules={[
                { required: true, message: "주소를 입력해주세요" },
                {
                  whitespace: true,
                  message: "공백만으로는 입력할 수 없습니다",
                },
              ]}
            >
              <TextArea
                rows={3}
                maxLength={200}
                showCount
                style={{ ...FONT_STYLES.BODY.MEDIUM, resize: "none" }}
                placeholder="상세 주소를 입력하세요"
              />
            </Form.Item>

            <Form.Item
              name="customer"
              label={<span style={FONT_STYLES.LABEL}>수령인</span>}
              rules={[
                { required: true, message: "수령인을 입력해주세요" },
                {
                  whitespace: true,
                  message: "공백만으로는 입력할 수 없습니다",
                },
              ]}
            >
              <Input
                maxLength={50}
                showCount
                style={FONT_STYLES.BODY.MEDIUM}
                placeholder="수령인 이름을 입력하세요"
              />
            </Form.Item>

            <Form.Item
              name="contact"
              label={<span style={FONT_STYLES.LABEL}>연락처</span>}
              rules={[
                { required: true, message: "연락처를 입력해주세요" },
                {
                  pattern: /^\d{2,3}-\d{3,4}-\d{4}$/,
                  message: "올바른 연락처 형식으로 입력해주세요",
                },
              ]}
            >
              <Input
                onChange={handlePhoneChange("contact")}
                placeholder="010-1234-5678"
                maxLength={13}
                style={FONT_STYLES.BODY.MEDIUM}
              />
            </Form.Item>

            <Form.Item
              name="remark"
              label={<span style={FONT_STYLES.LABEL}>메모</span>}
            >
              <TextArea
                rows={3}
                maxLength={500}
                showCount
                style={{ ...FONT_STYLES.BODY.MEDIUM, resize: "none" }}
                placeholder="추가 메모사항이 있다면 입력해주세요"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default CreateDashboardModal;

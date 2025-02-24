// frontend/src/components/dashboard/CreateDashboardModal.js
import React, { useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col } from 'antd';
import {
  TYPE_TYPES,
  TYPE_TEXTS,
  WAREHOUSE_TYPES,
  WAREHOUSE_TEXTS,
  FONT_STYLES,
} from '../../utils/Constants';
import { formatPhoneNumber } from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';
import { validateDashboardForm } from '../../utils/validator';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const CreateDashboardModal = ({
  visible,
  onCancel,
  onSuccess,
  userDepartment,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // 연락처 포맷팅 처리
  const handlePhoneChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setFieldsValue({ contact: formattedNumber });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 추가 유효성 검증
      const errors = validateDashboardForm(values);
      if (Object.keys(errors).length > 0) {
        form.setFields(
          Object.entries(errors).map(([name, error]) => ({
            name,
            errors: error ? [error] : [],
          }))
        );
        return;
      }

      setSubmitting(true);

      await DashboardService.createDashboard({
        ...values,
        department: userDepartment,
      });

      form.resetFields();
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={<span style={FONT_STYLES.TITLE.LARGE}>대시보드 생성</span>}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      width={1000}
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ eta: dayjs().add(1, 'hour') }}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="type"
              label={<span style={FONT_STYLES.LABEL}>종류</span>}
              rules={[{ required: true, message: '종류를 선택해주세요' }]}
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
                { required: true, message: '주문번호를 입력해주세요' },
                { pattern: /^\d+$/, message: '숫자만 입력 가능합니다' },
              ]}
            >
              <Input maxLength={20} style={FONT_STYLES.BODY.MEDIUM} />
            </Form.Item>

            <Form.Item
              name="warehouse"
              label={<span style={FONT_STYLES.LABEL}>출발허브</span>}
              rules={[{ required: true, message: '출발허브를 선택해주세요' }]}
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
              rules={[{ required: true, message: 'SLA를 입력해주세요' }]}
            >
              <Input maxLength={10} style={FONT_STYLES.BODY.MEDIUM} />
            </Form.Item>

            <Form.Item
              name="eta"
              label={<span style={FONT_STYLES.LABEL}>ETA</span>}
              rules={[{ required: true, message: 'ETA를 선택해주세요' }]}
            >
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%', ...FONT_STYLES.BODY.MEDIUM }}
                size="large"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="postal_code"
              label={<span style={FONT_STYLES.LABEL}>우편번호</span>}
              rules={[{ required: true, message: '우편번호를 입력해주세요' }]}
            >
              <Input maxLength={5} style={FONT_STYLES.BODY.MEDIUM} />
            </Form.Item>

            <Form.Item
              name="address"
              label={<span style={FONT_STYLES.LABEL}>도착 주소</span>}
              rules={[{ required: true, message: '주소를 입력해주세요' }]}
            >
              <TextArea
                rows={3}
                maxLength={200}
                showCount
                style={{ ...FONT_STYLES.BODY.MEDIUM, resize: 'none' }}
              />
            </Form.Item>

            <Form.Item
              name="customer"
              label={<span style={FONT_STYLES.LABEL}>수령인</span>}
              rules={[{ required: true, message: '수령인을 입력해주세요' }]}
            >
              <Input maxLength={50} style={FONT_STYLES.BODY.MEDIUM} />
            </Form.Item>

            <Form.Item
              name="contact"
              label={<span style={FONT_STYLES.LABEL}>연락처</span>}
            >
              <Input
                onChange={handlePhoneChange}
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
                maxLength={2000}
                showCount
                style={{ ...FONT_STYLES.BODY.MEDIUM, resize: 'none' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default CreateDashboardModal;

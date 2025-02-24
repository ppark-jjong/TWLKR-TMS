// frontend/src/components/dashboard/AssignDriverModal.js
import React, { useState } from 'react';
import { Modal, Form, Input, Typography, Space } from 'antd';
import { formatPhoneNumber } from '../../utils/Formatter';
import { FONT_STYLES } from '../../utils/Constants';
import DashboardService from '../../services/DashboardService';
import { validateAssignmentForm } from '../../utils/validator';

const { Text } = Typography;

const AssignDriverModal = ({ visible, onCancel, onSuccess, selectedRows }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // 연락처 포맷팅 처리
  const handlePhoneChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setFieldsValue({ driver_contact: formattedNumber });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 추가 유효성 검증
      const errors = validateAssignmentForm(values);
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

      await DashboardService.assignDriver({
        dashboard_ids: selectedRows.map((row) => row.dashboard_id),
        driver_name: values.driver_name,
        driver_contact: values.driver_contact,
      });

      form.resetFields();
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space direction="vertical" size={4}>
          <Text strong style={FONT_STYLES.TITLE.MEDIUM}>
            배차 정보 입력
          </Text>
          <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
            선택된 주문: {selectedRows.length}건
          </Text>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      maskClosable={false}
      width={600}
    >
      <div
        style={{
          marginBottom: 16,
          padding: '12px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}
      >
        <Text
          strong
          style={{
            ...FONT_STYLES.BODY.MEDIUM,
            display: 'block',
            marginBottom: '8px',
          }}
        >
          선택된 주문번호:
        </Text>
        <div
          style={{
            maxHeight: '100px',
            overflowY: 'auto',
            ...FONT_STYLES.BODY.MEDIUM,
          }}
        >
          {selectedRows.map((row) => row.order_no).join(', ')}
        </div>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="driver_name"
          label={<span style={FONT_STYLES.LABEL}>배송 담당</span>}
          rules={[
            { required: true, message: '배송 담당자를 입력해주세요' },
            { whitespace: true, message: '공백만으로는 입력할 수 없습니다' },
            { max: 50, message: '50자를 초과할 수 없습니다' },
          ]}
        >
          <Input
            placeholder="배송 담당자 이름"
            maxLength={50}
            style={FONT_STYLES.BODY.MEDIUM}
          />
        </Form.Item>

        <Form.Item
          name="driver_contact"
          label={<span style={FONT_STYLES.LABEL}>배송 담당 연락처</span>}
          rules={[{ required: true, message: '연락처를 입력해주세요' }]}
        >
          <Input
            onChange={handlePhoneChange}
            placeholder="010-1234-5678"
            maxLength={13}
            style={FONT_STYLES.BODY.MEDIUM}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignDriverModal;

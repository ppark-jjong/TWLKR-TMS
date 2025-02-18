// frontend/src/components/dashboard/AssignDriverModal.js
import React from 'react';
import { Modal, Form, Input, Typography, Space } from 'antd';
import { formatPhoneNumber } from '../../utils/Formatter';
import { STATUS_TYPES, FONT_STYLES } from '../../utils/Constants';
import message, { MessageKeys, MessageTemplates } from '../../utils/message';
import DashboardService from '../../services/DashboardService';

const { Text } = Typography;

const AssignDriverModal = ({ visible, onCancel, onSuccess, selectedRows }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = React.useState(false);

  // 연락처 포맷팅 처리
  const handlePhoneChange = (e) => {
    let value = e.target.value.trim().replace(/[^\d]/g, '');
    const formattedNumber = formatPhoneNumber(value);
    form.setFieldsValue({ driver_contact: formattedNumber });
  };

  const handleSubmit = async () => {
    const key = MessageKeys.DASHBOARD.ASSIGN;
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      message.loading('배차 처리 중...', key);

      // 대기 상태가 아닌 항목 검증
      const nonWaitingItems = selectedRows.filter(row => row.status !== STATUS_TYPES.WAITING);
      
      if (nonWaitingItems.length > 0) {
        const orderNos = nonWaitingItems.map(row => 
          `${row.order_no} (${row.status === STATUS_TYPES.IN_PROGRESS ? '진행' : 
          row.status === STATUS_TYPES.COMPLETE ? '완료' : '이슈'})`
        ).join('\n');
        
        message.error(MessageTemplates.DASHBOARD.VALIDATION.WAITING_STATUS(orderNos), key);
        return;
      }

      // 연락처 형식 검증
      if (!/^\d{2,3}-\d{3,4}-\d{4}$/.test(values.driver_contact)) {
        message.error(MessageTemplates.DASHBOARD.VALIDATION.PHONE_FORMAT, key);
        return;
      }

      await DashboardService.assignDriver({
        dashboard_ids: selectedRows.map(row => row.dashboard_id),
        driver_name: values.driver_name,
        driver_contact: values.driver_contact
      });

      message.loadingToSuccess(MessageTemplates.DASHBOARD.ASSIGN_SUCCESS, key);
      form.resetFields();
      onSuccess();
    } catch (error) {
      message.loadingToError(MessageTemplates.DASHBOARD.ASSIGN_FAIL, key);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space direction="vertical" size={4}>
          <Text strong style={FONT_STYLES.TITLE.MEDIUM}>배차 정보 입력</Text>
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
      <div style={{ 
        marginBottom: 16, 
        padding: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
      }}>
        <Text strong style={{ ...FONT_STYLES.BODY.MEDIUM, display: 'block', marginBottom: '8px' }}>
          선택된 주문번호:
        </Text>
        <div style={{ 
          maxHeight: '100px', 
          overflowY: 'auto',
          ...FONT_STYLES.BODY.MEDIUM
        }}>
          {selectedRows.map(row => row.order_no).join(', ')}
        </div>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="driver_name"
          label={<span style={FONT_STYLES.LABEL}>배송 담당</span>}
          rules={[
            { required: true, message: '배송 담당자를 입력해주세요' },
            { whitespace: true, message: '공백만으로는 입력할 수 없습니다' }
          ]}
        >
          <Input 
            placeholder="배송 담당자를 입력하세요"
            maxLength={50}
            showCount
            style={FONT_STYLES.BODY.MEDIUM}
          />
        </Form.Item>

        <Form.Item
          name="driver_contact"
          label={<span style={FONT_STYLES.LABEL}>배송 담당 연락처</span>}
          rules={[
            { required: true, message: '배송 담당 연락처를 입력해주세요' },
            { pattern: /^\d{2,3}-\d{3,4}-\d{4}$/, message: '올바른 연락처 형식으로 입력해주세요' }
          ]}
        >
          <Input
            onChange={handlePhoneChange}
            placeholder="01012345678"
            maxLength={13}
            style={FONT_STYLES.BODY.MEDIUM}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignDriverModal;
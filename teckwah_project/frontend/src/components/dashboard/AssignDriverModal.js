// frontend/src/components/dashboard/AssignDriverModal.js
import React from 'react';
import { Modal, Form, Input, message, Typography, Space } from 'antd';
import { formatPhoneNumber } from '../../utils/Formatter';
import { STATUS_TYPES } from '../../utils/Constants';
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
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // 대기 상태가 아닌 항목 검증
      const nonWaitingItems = selectedRows.filter(row => row.status !== STATUS_TYPES.WAITING);
      
      if (nonWaitingItems.length > 0) {
        const orderNos = nonWaitingItems.map(row => 
          `${row.order_no} (${row.status === STATUS_TYPES.IN_PROGRESS ? '진행' : 
          row.status === STATUS_TYPES.COMPLETE ? '완료' : '이슈'})`
        ).join('\n');
        
        message.error({
          content: `다음 주문은 대기 상태가 아니어서 배차할 수 없습니다:\n${orderNos}`,
          duration: 5
        });
        return;
      }

      // 연락처 형식 검증
      if (!/^\d{2,3}-\d{3,4}-\d{4}$/.test(values.driver_contact)) {
        message.error('올바른 연락처 형식이 아닙니다');
        return;
      }

      await DashboardService.assignDriver({
        dashboard_ids: selectedRows.map(row => row.dashboard_id),
        driver_name: values.driver_name,
        driver_contact: values.driver_contact
      });

      message.success('배차가 완료되었습니다');
      form.resetFields();
      onSuccess();
    } catch (error) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('배차 처리 중 오류가 발생했습니다');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space direction="vertical" size={4}>
          <Text strong style={{ fontSize: '16px' }}>배차 정보 입력</Text>
          <Text type="secondary" style={{ fontSize: '14px' }}>
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
        <Text strong style={{ display: 'block', marginBottom: '8px' }}>
          선택된 주문번호:
        </Text>
        <div style={{ 
          maxHeight: '100px', 
          overflowY: 'auto',
          fontSize: '14px',
          lineHeight: '1.5',
          fontFamily: 'monospace'
        }}>
          {selectedRows.map(row => row.order_no).join(', ')}
        </div>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="driver_name"
          label="기사 이름"
          rules={[
            { required: true, message: '기사 이름을 입력해주세요' },
            { whitespace: true, message: '공백만으로는 입력할 수 없습니다' }
          ]}
        >
          <Input 
            placeholder="기사 이름을 입력하세요"
            maxLength={50}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="driver_contact"
          label="기사 연락처"
          rules={[
            { required: true, message: '기사 연락처를 입력해주세요' },
            { pattern: /^\d{2,3}-\d{3,4}-\d{4}$/, message: '올바른 연락처 형식으로 입력해주세요' }
          ]}
          extra="예시: 010-1234-5678"
        >
          <Input
            onChange={handlePhoneChange}
            placeholder="01012345678"
            maxLength={13}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignDriverModal;
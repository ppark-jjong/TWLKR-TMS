// frontend/src/components/dashboard/AssignDriverModal.js
import React from 'react';
import { Modal, Form, Input, message } from 'antd';
import { formatPhoneNumber } from '../../utils/Formatter';
import { STATUS_TYPES } from '../../utils/Constants';
import DashboardService from '../../services/DashboardService';

/**
 * 배차 모달 컴포넌트
 * @param {Object} props
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {Function} props.onSuccess - 성공 핸들러
 * @param {Array<import('../../types').Dashboard>} props.selectedRows - 선택된 대시보드 목록
 */
const AssignDriverModal = ({ visible, onCancel, onSuccess, selectedRows }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = React.useState(false);

  // 전화번호 포맷팅
  const handlePhoneChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setFieldsValue({ driver_contact: formattedNumber });
  };

  // 배차 처리
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const hasNonWaiting = selectedRows.some(row => row.status !== STATUS_TYPES.WAITING);
      if (hasNonWaiting) {
        throw new Error('대기 상태인 항목만 배차할 수 있습니다');
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
      if (!error.isAxiosError) {
        message.error(error.message || '배차 처리 중 오류가 발생했습니다');
        return;
      }
      message.error('배차 처리 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="배차 정보 입력"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      maskClosable={false}
    >
      <div style={{ marginBottom: 16 }}>
        <strong>선택된 주문번호:</strong>
        <div style={{ marginTop: 8 }}>
          {selectedRows.map(row => row.order_no).join(', ')}
        </div>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="driver_name"
          label="기사 이름"
          rules={[{ required: true, message: '기사 이름을 입력해주세요' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="driver_contact"
          label="기사 연락처"
          rules={[
            { required: true, message: '기사 연락처를 입력해주세요' },
            { pattern: /^\d{2,3}-\d{3,4}-\d{4}$/, message: '올바른 연락처 형식으로 입력해주세요' }
          ]}
        >
          <Input
            onChange={handlePhoneChange}
            placeholder="010-1234-5678"
            maxLength={13}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignDriverModal;
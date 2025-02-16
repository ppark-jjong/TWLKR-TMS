// frontend/src/components/dashboard/CreateDashboardModal.js
import React from 'react';
import { Modal, Form, Input, Select, DatePicker, message } from 'antd';
import { formatPhoneNumber } from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';
import { 
  STATUS_TYPES, 
  WAREHOUSES, 
  SLA_TYPES,
  TYPE_TEXTS,
  WAREHOUSE_TEXTS,
  SLA_TEXTS
} from '../../utils/Constants';

const { Option } = Select;

const CreateDashboardModal = ({ visible, onCancel, onSuccess, userDepartment }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  // 연락처 포맷팅 처리
  const handlePhoneChange = (e) => {
    let value = e.target.value;
    
    // 공백 제거
    value = value.trim();
    
    // 숫자만 추출
    value = value.replace(/[^\d]/g, '');
    
    // 하이픈 포함된 형식으로 변환
    const formattedNumber = formatPhoneNumber(value);
    
    // 폼 값 업데이트
    form.setFieldsValue({ contact: formattedNumber });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 우편번호 5자리 검증
      if (!/^\d{5}$/.test(values.postal_code)) {
        message.error('우편번호는 5자리 숫자여야 합니다');
        return;
      }

      // 연락처 형식 검증
      if (!/^\d{2,3}-\d{3,4}-\d{4}$/.test(values.contact)) {
        message.error('올바른 전화번호 형식이 아닙니다');
        return;
      }

      const dashboardData = {
        ...values,
        department: userDepartment,
        eta: values.eta.toISOString()
      };

      await DashboardService.createDashboard(dashboardData);
      message.success('대시보드가 생성되었습니다');
      form.resetFields();
      onSuccess();
    } catch (error) {
      if (error.isAxiosError) {
        message.error(error.response?.data?.detail || '대시보드 생성 중 오류가 발생했습니다');
      } else {
        message.error('대시보드 생성 중 오류가 발생했습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="대시보드 생성"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          name="type"
          label="종류"
          rules={[{ required: true, message: '종류를 선택해주세요' }]}
        >
          <Select>
            {Object.entries(TYPE_TEXTS).map(([key, value]) => (
              <Option key={key} value={key}>{value}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="order_no"
          label="order_no"
          rules={[{ required: true, message: 'order_no를 입력해주세요' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="warehouse"
          label="출발허브"
          rules={[{ required: true, message: '출발허브를 선택해주세요' }]}
        >
          <Select>
            {Object.entries(WAREHOUSE_TEXTS).map(([key, value]) => (
              <Option key={key} value={key}>{value}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="sla"
          label="SLA"
          rules={[{ required: true, message: 'SLA를 선택해주세요' }]}
        >
          <Select>
            {Object.entries(SLA_TEXTS).map(([key, value]) => (
              <Option key={key} value={key}>{value}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="eta"
          label="ETA"
          rules={[{ required: true, message: 'ETA를 선택해주세요' }]}
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="postal_code"
          label="우편번호"
          rules={[
            { required: true, message: '우편번호를 입력해주세요' },
            { pattern: /^\d{5}$/, message: '5자리 숫자로 입력해주세요' }
          ]}
        >
          <Input 
            maxLength={5}
            onChange={(e) => {
              const value = e.target.value.trim().replace(/[^\d]/g, '');
              form.setFieldsValue({ postal_code: value });
            }}
          />
        </Form.Item>

        <Form.Item
          name="address"
          label="도착주소"
          rules={[{ required: true, message: '주소를 입력해주세요' }]}
        >
          <Input.TextArea 
            rows={2}
            onChange={(e) => {
              const value = e.target.value.trim();
              form.setFieldsValue({ address: value });
            }}
          />
        </Form.Item>

        <Form.Item
          name="customer"
          label="수령인"
          rules={[{ required: true, message: '수령인을 입력해주세요' }]}
        >
          <Input 
            onChange={(e) => {
              const value = e.target.value.trim();
              form.setFieldsValue({ customer: value });
            }}
          />
        </Form.Item>

        <Form.Item
          name="contact"
          label="연락처"
          rules={[
            { required: true, message: '연락처를 입력해주세요' },
            { pattern: /^\d{2,3}-\d{3,4}-\d{4}$/, message: '올바른 연락처 형식으로 입력해주세요 (예: 010-1234-5678)' }
          ]}
        >
          <Input 
            placeholder="01012345678"
            onChange={handlePhoneChange}
            maxLength={13}
          />
        </Form.Item>

        <Form.Item
          name="remark"
          label="메모"
        >
          <Input.TextArea 
            rows={3}
            onChange={(e) => {
              const value = e.target.value.trim();
              form.setFieldsValue({ remark: value });
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateDashboardModal;
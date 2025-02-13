// frontend/src/components/dashboard/CreateDashboardModal.js
import React from 'react';
import { Modal, Form, Input, Select, DatePicker, message } from 'antd';
import { formatPhoneNumber } from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';
import { 
  STATUS_TYPES, 
  WAREHOUSES, 
  SLA_TYPES 
} from '../../utils/Constants';

const { Option } = Select;

const CreateDashboardModal = ({ visible, onCancel, onSuccess, userDepartment }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  // 전화번호 포맷팅 처리
  const handlePhoneChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
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
      // 전화번호 형식 검증
      if (!/^\d{2,3}-\d{3,4}-\d{4}$/.test(values.contact)) {
        message.error('올바른 전화번호 형식이 아닙니다');
        return;
      }
      // ETA 시간 포맷 변환
      const formattedValues = {
        ...values,
        eta: values.eta.toISOString(),
        department: userDepartment
      };

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
        message.error(error.response.data.detail || '대시보드 생성 중 오류가 발생했습니다');
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
            <Option value="DELIVERY">배송</Option>
            <Option value="RETURN">회수</Option>
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
            <Option value="SEOUL">서울</Option>
            <Option value="BUSAN">부산</Option>
            <Option value="GWANGJU">광주</Option>
            <Option value="DAEJEON">대전</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="sla"
          label="SLA"
          rules={[{ required: true, message: 'SLA를 선택해주세요' }]}
        >
          <Select>
            <Option value="XHR">XHR</Option>
            <Option value="POX">POX</Option>
            <Option value="EMC">EMC</Option>
            <Option value="WEWORK">WEWORK</Option>
            <Option value="LENOVO">LENOVO</Option>
            <Option value="ETC">기타</Option>
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
          <Input maxLength={5} />
        </Form.Item>

        <Form.Item
          name="address"
          label="도착주소"
          rules={[{ required: true, message: '주소를 입력해주세요' }]}
        >
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item
          name="customer"
          label="수령인"
          rules={[{ required: true, message: '수령인을 입력해주세요' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="contact"
          label="연락처"
          rules={[
            { required: true, message: '연락처를 입력해주세요' },
            { pattern: /^\d{2,3}-\d{3,4}-\d{4}$/, message: '올바른 연락처 형식으로 입력해주세요 (예: 010-1234-5678)' }
          ]}
        >
          <Input placeholder="010-1234-5678" />
        </Form.Item>

        <Form.Item
          name="remark"
          label="메모"
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateDashboardModal;
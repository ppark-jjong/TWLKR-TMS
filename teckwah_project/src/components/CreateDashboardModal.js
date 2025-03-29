// src/components/CreateDashboardModal.js
import React, { useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, message } from 'antd';
import { useMutation, useQueryClient } from 'react-query';
import dayjs from 'dayjs';
import locale from 'antd/es/date-picker/locale/ko_KR';
import { createDashboard } from '../utils/api';
import { formatPhoneNumber } from '../utils/commonUtils';

const { Option } = Select;
const { TextArea } = Input;

const CreateDashboardModal = ({ visible, onCancel }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [confirmLoading, setConfirmLoading] = useState(false);

  // 생성 뮤테이션
  const createMutation = useMutation(
    (data) => createDashboard(data),
    {
      onSuccess: () => {
        message.success('대시보드가 생성되었습니다');
        queryClient.invalidateQueries('dashboards');
        form.resetFields();
        onCancel();
      },
      onError: (error) => {
        console.error('Create dashboard error:', error);
        message.error('대시보드 생성 중 오류가 발생했습니다');
      },
      onSettled: () => {
        setConfirmLoading(false);
      }
    }
  );

  const handleOk = () => {
    form.validateFields().then(values => {
      setConfirmLoading(true);
      
      // 날짜 포맷 변환
      const formattedValues = {
        ...values,
        eta: values.eta ? values.eta.format('YYYY-MM-DDTHH:mm:ss') : undefined,
        contact: values.contact ? formatPhoneNumber(values.contact) : undefined,
      };
      
      createMutation.mutate(formattedValues);
    }).catch(errorInfo => {
      console.log('Validate Failed:', errorInfo);
    });
  };

  return (
    <Modal
      title="새 대시보드 생성"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      width={800}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="order_no"
          label="주문번호"
          rules={[{ required: true, message: '주문번호를 입력해주세요' }]}
        >
          <Input maxLength={15} placeholder="주문번호 입력" />
        </Form.Item>
        
        <Form.Item
          name="type"
          label="유형"
          rules={[{ required: true, message: '유형을 선택해주세요' }]}
        >
          <Select placeholder="유형 선택">
            <Option value="DELIVERY">배송</Option>
            <Option value="RETURN">회수</Option>
          </Select>
        </Form.Item>
        
        <Form.Item
          name="warehouse"
          label="창고"
          rules={[{ required: true, message: '창고를 선택해주세요' }]}
        >
          <Select placeholder="창고 선택">
            <Option value="SEOUL">서울</Option>
            <Option value="BUSAN">부산</Option>
            <Option value="GWANGJU">광주</Option>
            <Option value="DAEJEON">대전</Option>
          </Select>
        </Form.Item>
        
        <Form.Item
          name="sla"
          label="SLA"
          rules={[{ required: true, message: 'SLA를 입력해주세요' }]}
        >
          <Input maxLength={10} placeholder="SLA 입력" />
        </Form.Item>
        
        <Form.Item
          name="eta"
          label="예상 도착 시간"
          rules={[{ required: true, message: '예상 도착 시간을 선택해주세요' }]}
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            locale={locale}
            style={{ width: '100%' }}
            disabledDate={(current) => {
              return current && current < dayjs().startOf('day');
            }}
          />
        </Form.Item>
        
        <Form.Item
          name="postal_code"
          label="우편번호"
          rules={[
            { required: true, message: '우편번호를 입력해주세요' },
            { len: 5, message: '우편번호는 5자리여야 합니다' },
            { pattern: /^\d{5}$/, message: '우편번호는 숫자 5자리여야 합니다' }
          ]}
        >
          <Input maxLength={5} placeholder="우편번호 입력 (예: 12345)" />
        </Form.Item>
        
        <Form.Item
          name="address"
          label="주소"
          rules={[{ required: true, message: '주소를 입력해주세요' }]}
        >
          <TextArea rows={2} maxLength={500} placeholder="주소 입력" />
        </Form.Item>
        
        <Form.Item
          name="customer"
          label="고객명"
          rules={[{ required: true, message: '고객명을 입력해주세요' }]}
        >
          <Input maxLength={150} placeholder="고객명 입력" />
        </Form.Item>
        
        <Form.Item
          name="contact"
          label="연락처"
          rules={[
            { pattern: /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/, message: '올바른 연락처 형식이 아닙니다' }
          ]}
        >
          <Input maxLength={20} placeholder="연락처 입력 (예: 010-1234-5678)" />
        </Form.Item>
        
        <Form.Item
          name="remark"
          label="메모"
        >
          <TextArea rows={4} maxLength={1000} placeholder="메모 입력 (선택사항)" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateDashboardModal;
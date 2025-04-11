import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Typography } from 'antd';

const { Text } = Typography;

/**
 * 배차 처리 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Function} props.onSubmit - 폼 제출 콜백
 * @param {Object} props.orderData - 주문 데이터 (단일 또는 다중)
 * @param {boolean} props.isMultiple - 다중 배차 여부
 * @param {boolean} props.loading - 로딩 상태
 */
const AssignDriverModal = ({ 
  visible, 
  onClose, 
  onSubmit, 
  orderData,
  isMultiple = false,
  loading
}) => {
  const [form] = Form.useForm();
  
  // 모달이 열릴 때 기존 배차 정보 설정
  useEffect(() => {
    if (visible && orderData && !isMultiple) {
      form.setFieldsValue({
        driver_name: orderData.driver_name || '',
        driver_contact: orderData.driver_contact || ''
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [form, orderData, visible, isMultiple]);
  
  // 폼 제출 핸들러
  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
        onSubmit(values);
      })
      .catch(error => {
        console.error('Validation failed:', error);
      });
  };
  
  return (
    <Modal
      title={isMultiple ? "다중 배차 처리" : "배차 처리"}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      destroyOnClose
    >
      {isMultiple && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>선택된 주문: {orderData?.length || 0}건</Text>
          <Text type="warning" style={{ display: 'block', marginTop: 8 }}>
            선택한 모든 주문에 동일한 배차 정보가 적용됩니다.
          </Text>
        </div>
      )}
      
      <Form 
        form={form}
        layout="vertical"
        preserve={false}
      >
        <Form.Item
          name="driver_name"
          label="기사 이름"
          rules={[{ required: true, message: '기사 이름을 입력해주세요' }]}
        >
          <Input placeholder="기사 이름" maxLength={50} />
        </Form.Item>
        
        <Form.Item
          name="driver_contact"
          label="기사 연락처"
          rules={[
            { required: false },
            { 
              pattern: /^[0-9-]+$/, 
              message: '올바른 연락처 형식을 입력해주세요'
            }
          ]}
        >
          <Input placeholder="기사 연락처 (예: 010-1234-5678)" maxLength={20} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignDriverModal;

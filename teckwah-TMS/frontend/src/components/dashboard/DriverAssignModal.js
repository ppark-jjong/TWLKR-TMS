/**
 * 기사 배정 모달 컴포넌트
 */
import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { DashboardService } from '../../services';

const DriverAssignModal = ({ visible, onCancel, orderIds, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  // 폼 제출 처리
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (!orderIds || orderIds.length === 0) {
        message.error('배정할 주문을 선택해주세요');
        return;
      }
      
      setLoading(true);
      
      const response = await DashboardService.assignDriver(
        orderIds,
        values.driverName,
        values.driverContact
      );
      
      if (response.success) {
        message.success(response.message || '기사 배정이 완료되었습니다');
        form.resetFields();
        
        if (onSuccess) {
          onSuccess();
        }
        
        onCancel();
      } else {
        message.error(response.message || '기사 배정 실패');
      }
    } catch (error) {
      console.error('기사 배정 오류:', error);
      message.error('기사 배정 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal
      title="기사 배정"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          취소
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={loading}
          onClick={handleSubmit}
        >
          배정하기
        </Button>
      ]}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <strong>선택된 주문 수:</strong> {orderIds?.length || 0}개
      </div>
      
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          label="기사 이름"
          name="driverName"
          rules={[{ required: true, message: '기사 이름을 입력하세요' }]}
        >
          <Input placeholder="기사 이름 입력" />
        </Form.Item>
        
        <Form.Item
          label="기사 연락처"
          name="driverContact"
        >
          <Input placeholder="기사 연락처 입력" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DriverAssignModal;

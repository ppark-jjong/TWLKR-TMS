// src/components/AssignDriverModal.js
import React from 'react';
import { Modal, Form, Input } from 'antd';

/**
 * 배차 처리 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onOk - 확인 핸들러
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {Object} props.form - Form 인스턴스
 * @param {boolean} props.confirmLoading - 확인 버튼 로딩 상태
 */
const AssignDriverModal = ({
  visible,
  onOk,
  onCancel,
  form,
  confirmLoading = false,
}) => {
  return (
    <Modal
      title="배차 처리"
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="driver_name"
          label="기사명"
          rules={[{ required: true, message: '기사명을 입력해주세요' }]}
        >
          <Input placeholder="기사명 입력" />
        </Form.Item>
        <Form.Item
          name="driver_contact"
          label="연락처"
          rules={[
            { required: true, message: '연락처를 입력해주세요' },
            {
              pattern: /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/,
              message: '올바른 연락처 형식이 아닙니다',
            },
          ]}
        >
          <Input placeholder="연락처 입력 (예: 010-1234-5678)" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignDriverModal;

// src/components/StatusChangeModal.js
import React, { useMemo } from 'react';
import { Modal, Form, Select } from 'antd';
import {
  getAvailableStatusTransitions,
  getStatusText,
} from '../utils/permissionUtils';

const { Option } = Select;

/**
 * 상태 변경 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onOk - 확인 핸들러
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {Object} props.form - Form 인스턴스
 * @param {Object} props.dashboard - 현재 대시보드 데이터
 * @param {string} props.userRole - 사용자 권한
 * @param {boolean} props.confirmLoading - 확인 버튼 로딩 상태
 */
const StatusChangeModal = ({
  visible,
  onOk,
  onCancel,
  form,
  dashboard,
  userRole = 'USER',
  confirmLoading = false,
}) => {
  // 현재 상태에 따라 선택 가능한 상태 옵션 계산
  const statusOptions = useMemo(() => {
    if (!dashboard) return [];

    const availableStatuses = getAvailableStatusTransitions(
      dashboard.status,
      userRole
    );

    return availableStatuses.map((status) => (
      <Option key={status} value={status}>
        {getStatusText(status)}
      </Option>
    ));
  }, [dashboard, userRole]);

  return (
    <Modal
      title="상태 변경"
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="status"
          label="상태"
          rules={[{ required: true, message: '상태를 선택해주세요' }]}
        >
          <Select placeholder="상태 선택">{statusOptions}</Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StatusChangeModal;

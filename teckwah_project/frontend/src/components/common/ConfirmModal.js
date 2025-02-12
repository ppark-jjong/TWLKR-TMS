// frontend/src/components/common/ConfirmModal.js
import React from 'react';
import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

/**
 * 확인 모달 컴포넌트
 * @param {Object} props
 * @param {string} props.title - 모달 제목
 * @param {string} props.content - 모달 내용
 * @param {Function} props.onConfirm - 확인 버튼 클릭 핸들러
 * @param {Function} props.onCancel - 취소 버튼 클릭 핸들러
 * @param {boolean} props.visible - 모달 표시 여부
 */
const ConfirmModal = ({ title, content, onConfirm, onCancel, visible }) => {
  return (
    <Modal
      title={
        <span>
          <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
          {title}
        </span>
      }
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="확인"
      cancelText="취소"
    >
      <p>{content}</p>
    </Modal>
  );
};

export default ConfirmModal;
// src/components/CommonModal.js - Ant Design 5.x 호환성 개선

import React from 'react';
import { Modal, Button } from 'antd';

const CommonModal = ({
  visible,
  title,
  content,
  onOk,
  onCancel,
  okText = '확인',
  cancelText = '취소',
  okButtonProps = {},
  cancelButtonProps = {},
  confirmLoading = false,
  width = 520,
  centered = true,
  maskClosable = false,
}) => {
  return (
    <Modal
      open={visible} // visible 대신 open으로 변경 (Ant Design 5.x 호환성)
      title={title}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      footer={[
        cancelText && (
          <Button key="back" onClick={onCancel} {...cancelButtonProps}>
            {cancelText}
          </Button>
        ),
        okText && (
          <Button
            key="submit"
            type="primary"
            onClick={onOk}
            loading={confirmLoading}
            {...okButtonProps}
          >
            {okText}
          </Button>
        ),
      ]}
      width={width}
      centered={centered}
      maskClosable={maskClosable}
    >
      {content}
    </Modal>
  );
};

export default CommonModal;

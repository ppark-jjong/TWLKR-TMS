import React from 'react';
import { Modal, Button, Spin } from 'antd';
import PropTypes from 'prop-types';

/**
 * 공통 모달 컴포넌트 - 여러 모달 컴포넌트의 기본 구조를 제공
 */
const BaseModal = ({
  title,
  open,
  onOk,
  onCancel,
  confirmLoading,
  width,
  cancelText,
  okText,
  centered,
  closable,
  maskClosable,
  destroyOnClose,
  footer,
  children,
  bodyStyle,
  afterClose,
  className,
  showFooter = true,
  afterOpen,
}) => {
  // 기본 풋터 (사용자 정의 풋터가 없는 경우)
  const defaultFooter = showFooter ? (
    <>
      <Button onClick={onCancel}>{cancelText || '취소'}</Button>
      <Button type="primary" onClick={onOk} loading={confirmLoading}>
        {okText || '확인'}
      </Button>
    </>
  ) : null;

  return (
    <Modal
      title={title}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      width={width || 520}
      centered={centered !== false}
      closable={closable !== false}
      maskClosable={maskClosable !== false}
      destroyOnClose={destroyOnClose !== false}
      footer={footer === undefined ? defaultFooter : footer}
      bodyStyle={{ padding: '16px 24px', ...bodyStyle }}
      afterClose={afterClose}
      className={className}
      afterOpenChange={afterOpen}
    >
      {confirmLoading && !showFooter ? (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Spin tip="처리 중..." />
        </div>
      ) : null}
      {children}
    </Modal>
  );
};

BaseModal.propTypes = {
  title: PropTypes.node,
  open: PropTypes.bool,
  onOk: PropTypes.func,
  onCancel: PropTypes.func,
  confirmLoading: PropTypes.bool,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  cancelText: PropTypes.string,
  okText: PropTypes.string,
  centered: PropTypes.bool,
  closable: PropTypes.bool,
  maskClosable: PropTypes.bool,
  destroyOnClose: PropTypes.bool,
  footer: PropTypes.node,
  children: PropTypes.node,
  bodyStyle: PropTypes.object,
  afterClose: PropTypes.func,
  className: PropTypes.string,
  showFooter: PropTypes.bool,
  afterOpen: PropTypes.func,
};

export default BaseModal;

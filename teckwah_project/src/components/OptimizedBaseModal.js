import React, { memo, useMemo } from 'react';
import { Modal, Button, Spin } from 'antd';
import PropTypes from 'prop-types';

/**
 * 최적화된 공통 모달 컴포넌트 - 여러 모달 컴포넌트의 기본 구조를 제공
 * 
 * 성능 최적화:
 * 1. React.memo를 사용한 불필요한 리렌더링 방지
 * 2. useMemo를 사용한 footers 최적화
 * 3. 중앙 집중식 스타일 적용
 */
const OptimizedBaseModal = ({
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
  // 기본 풋터 메모이제이션 (사용자 정의 풋터가 없는 경우)
  const defaultFooter = useMemo(() => {
    if (!showFooter) return null;
    
    return (
      <>
        <Button onClick={onCancel}>{cancelText || '취소'}</Button>
        <Button type="primary" onClick={onOk} loading={confirmLoading}>
          {okText || '확인'}
        </Button>
      </>
    );
  }, [showFooter, onCancel, cancelText, onOk, okText, confirmLoading]);
  
  // 스타일 중앙화
  const loadingContainerStyle = {
    textAlign: 'center',
    margin: '20px 0'
  };
  
  const defaultBodyStyle = { 
    padding: '16px 24px',
    ...bodyStyle
  };

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
      bodyStyle={defaultBodyStyle}
      afterClose={afterClose}
      className={className}
      afterOpenChange={afterOpen}
    >
      {confirmLoading && !showFooter ? (
        <div style={loadingContainerStyle}>
          <Spin tip="처리 중..." />
        </div>
      ) : null}
      {children}
    </Modal>
  );
};

OptimizedBaseModal.propTypes = {
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

// React.memo를 사용해 불필요한 리렌더링 방지
export default memo(OptimizedBaseModal);

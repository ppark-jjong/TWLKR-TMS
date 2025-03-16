// src/components/common/BaseModal.js
import React, { useEffect } from 'react';
import { Modal, Typography, Space } from 'antd';
import { FONT_STYLES } from '../../utils/Constants';

const { Text } = Typography;

/**
 * 기본 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onCancel - 취소 버튼 클릭 핸들러
 * @param {Function} props.onOk - 확인 버튼 클릭 핸들러
 * @param {boolean} props.loading - 로딩 상태
 * @param {string} props.title - 모달 제목
 * @param {string} props.subTitle - 모달 부제목
 * @param {React.ReactNode} props.children - 모달 내용
 * @param {Object} props.modalProps - 추가 모달 속성
 */
const BaseModal = ({
  visible,
  onCancel,
  onOk,
  loading = false,
  title,
  subTitle,
  children,
  ...modalProps
}) => {
  // ESC 키로 모달 닫기 방지 (선택적)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && visible && modalProps.maskClosable === false) {
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [visible, modalProps.maskClosable]);

  return (
    <Modal
      title={
        <Space direction="vertical" size={4}>
          <Text strong style={FONT_STYLES.TITLE.MEDIUM}>
            {title}
          </Text>
          {subTitle && (
            <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
              {subTitle}
            </Text>
          )}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={loading}
      maskClosable={modalProps.maskClosable !== false}
      destroyOnClose={modalProps.destroyOnClose !== false}
      {...modalProps}
    >
      {children}
    </Modal>
  );
};

export default BaseModal;

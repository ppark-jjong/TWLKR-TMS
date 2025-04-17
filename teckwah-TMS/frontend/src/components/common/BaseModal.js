/**
 * 기본 모달 컴포넌트
 * - 공통 모달 패턴 추상화
 */
import React from 'react';
import { Modal, Button, Space } from 'antd';

/**
 * 공통 모달 컴포넌트
 * @param {Object} props
 * @param {string} props.title - 모달 제목
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {Array|null} props.footer - 커스텀 푸터 버튼 (null은 푸터 숨김)
 * @param {boolean} props.loading - 로딩 상태
 * @param {string} props.width - 모달 너비
 * @param {boolean} props.centered - 중앙 정렬 여부
 * @param {Object} props.bodyStyle - 모달 본문 스타일
 * @param {boolean} props.destroyOnClose - 닫을 때 내용 파괴 여부
 * @param {string} props.cancelText - 취소 버튼 텍스트
 * @param {string} props.okText - 확인 버튼 텍스트
 * @param {Function} props.onOk - 확인 버튼 핸들러
 * @param {ReactNode} props.children - 모달 내용
 */
const BaseModal = ({
  title,
  visible,
  onCancel,
  footer = undefined,
  loading = false,
  width = 600,
  centered = false,
  bodyStyle = {},
  destroyOnClose = true,
  cancelText = '취소',
  okText = '확인',
  onOk,
  children,
  ...rest
}) => {
  // 기본 푸터 버튼
  const defaultFooter = [
    <Button key="cancel" onClick={onCancel} disabled={loading}>
      {cancelText}
    </Button>,
    onOk && (
      <Button 
        key="ok" 
        type="primary" 
        onClick={onOk} 
        loading={loading}
      >
        {okText}
      </Button>
    )
  ].filter(Boolean);
  
  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onCancel}
      width={width}
      centered={centered}
      destroyOnClose={destroyOnClose}
      bodyStyle={bodyStyle}
      footer={footer === undefined ? defaultFooter : footer}
      maskClosable={!loading}
      closable={!loading}
      {...rest}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          데이터를 불러오는 중...
        </div>
      ) : children}
    </Modal>
  );
};

export default BaseModal;

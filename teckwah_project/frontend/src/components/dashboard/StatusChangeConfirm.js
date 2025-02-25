// frontend/src/components/dashboard/StatusChangeConfirm.js
import React from 'react';
import { Modal, Typography } from 'antd';
import { STATUS_TEXTS, FONT_STYLES } from '../../utils/Constants';

const { Text } = Typography;

const StatusChangeConfirm = ({
  visible,
  dashboard,
  newStatus,
  onConfirm,
  onCancel,
  isAdmin,
}) => {
  return (
    <Modal
      title={<span style={FONT_STYLES.TITLE.MEDIUM}>상태 변경 확인</span>}
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="변경"
      cancelText="취소"
      width={500}
    >
      <div style={{ marginBottom: 16 }}>
        <Text style={FONT_STYLES.BODY.MEDIUM}>
          주문번호 <Text strong>{dashboard?.order_no}</Text>의 상태를
        </Text>
      </div>
      <div style={{ marginBottom: 24 }}>
        <Text style={FONT_STYLES.BODY.MEDIUM}>
          <Text strong type="warning">
            {STATUS_TEXTS[dashboard?.status]}
          </Text>
          에서{' '}
          <Text strong type="warning">
            {STATUS_TEXTS[newStatus]}
          </Text>
          (으)로 변경하시겠습니까?
        </Text>
      </div>
      {isAdmin && (
        <div
          style={{
            backgroundColor: '#fff2f0',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          <Text type="danger" style={FONT_STYLES.BODY.MEDIUM}>
            관리자 권한으로 상태를 변경합니다. 일반적인 상태 변경 규칙이
            적용되지 않습니다.
          </Text>
        </div>
      )}
    </Modal>
  );
};

export default StatusChangeConfirm;

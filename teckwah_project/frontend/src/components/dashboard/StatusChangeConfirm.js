// frontend/src/components/dashboard/StatusChangeConfirm.js (비관적 락 관련 UI 개선)
import React from 'react';
import { Modal, Typography, Alert } from 'antd';
import { STATUS_TEXTS, FONT_STYLES } from '../../utils/Constants';

const { Text } = Typography;

/**
 * 상태 변경 확인 모달 컴포넌트
 * 비관적 락 관련 사용자 경험 개선
 *
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Object} props.dashboard - 대시보드 데이터
 * @param {string} props.newStatus - 변경할 상태
 * @param {Function} props.onConfirm - 확인 콜백
 * @param {Function} props.onCancel - 취소 콜백
 * @param {boolean} props.isAdmin - 관리자 여부
 * @param {boolean} props.loading - 로딩 상태
 */
const StatusChangeConfirm = ({
  visible,
  dashboard,
  newStatus,
  onConfirm,
  onCancel,
  isAdmin,
  loading = false,
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
      confirmLoading={loading}
      maskClosable={!loading}
      closable={!loading}
      okButtonProps={{ loading: loading }}
      cancelButtonProps={{ disabled: loading }}
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

      {/* 관리자 권한 알림 */}
      {isAdmin && (
        <Alert
          message="관리자 권한 알림"
          description="관리자 권한으로 상태를 변경합니다. 일반적인 상태 변경 규칙이 적용되지 않습니다."
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 비관적 락 관련 알림 추가 */}
      <Alert
        message="동시 작업 안내"
        description="상태 변경 중에는 다른 사용자의 상태 변경이 제한됩니다. 필요한 작업을 완료 후 변경 버튼을 클릭해주세요."
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />
    </Modal>
  );
};

export default StatusChangeConfirm;

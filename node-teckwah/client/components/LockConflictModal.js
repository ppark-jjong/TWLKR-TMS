// src/components/LockConflictModal.js
import React from "react";
import { Modal, Button, Alert, Typography } from "antd";

const { Text } = Typography;

/**
 * 락 충돌 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.open - 모달 표시 여부
 * @param {Object} props.lockInfo - 락 정보
 * @param {Function} props.onRetry - 재시도 핸들러
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {boolean} props.confirmLoading - 확인 버튼 로딩 상태
 */
const LockConflictModal = ({
  open,
  lockInfo,
  onRetry,
  onCancel,
  confirmLoading = false,
}) => {
  const renderLockInfo = () => {
    if (!lockInfo) return null;

    const { locked_by, expires_at } = lockInfo;

    // 만료 시간 포맷팅
    const expiryTime = expires_at
      ? new Date(expires_at).toLocaleTimeString("ko-KR")
      : "알 수 없음";

    // 남은 시간 계산
    const now = new Date();
    const expiryDate = expires_at ? new Date(expires_at) : null;
    const waitMinutes = expiryDate
      ? Math.max(0, Math.ceil((expiryDate - now) / 60000))
      : "?";

    return (
      <Alert
        type="warning"
        message="락 충돌 발생"
        description={
          <div>
            <p>
              다른 사용자(<Text strong>{locked_by}</Text>)가 현재 작업 중입니다.
            </p>
            <p>
              락 만료 시간: <Text strong>{expiryTime}</Text> (약 {waitMinutes}분
              후)
            </p>
            <p>자동 재시도 없이 다음 선택지가 있습니다:</p>
            <ul>
              <li>작업을 취소하고 나중에 다시 시도</li>
              <li>지금 수동으로 재시도 (다른 사용자의 작업이 완료된 경우)</li>
            </ul>
          </div>
        }
        showIcon
      />
    );
  };

  return (
    <Modal
      title="락 충돌 발생"
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          작업 취소
        </Button>,
        <Button
          key="retry"
          type="primary"
          loading={confirmLoading}
          onClick={onRetry}
        >
          재시도
        </Button>,
      ]}
      closable={false}
      maskClosable={false}
      centered
    >
      {renderLockInfo()}
    </Modal>
  );
};

export default LockConflictModal;

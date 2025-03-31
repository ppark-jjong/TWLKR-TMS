// src/components/LockConflictModal.js
import React from 'react';
import {
  Modal,
  Button,
  Space,
  Alert,
  Typography,
  Descriptions,
  Badge,
} from 'antd';
import {
  LockOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * 락 충돌 정보를 보여주는 개선된 모달 컴포넌트
 *
 * 사용자 경험 향상을 위해 더 명확한 정보와 시각적 피드백을 제공합니다.
 */
const LockConflictModal = ({ visible, lockInfo, onCancel, onRetry }) => {
  // 남은 시간 계산 및 포맷
  const formatRemainingTime = (seconds) => {
    if (!seconds) return '알 수 없음';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `약 ${minutes}분 ${remainingSeconds}초`;
    }
    return `약 ${remainingSeconds}초`;
  };

  // 만료 시간 포맷
  const formatExpiryTime = (isoString) => {
    if (!isoString) return '알 수 없음';

    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      return isoString;
    }
  };

  // 락 타입에 따른 적절한 메시지 선택
  const getLockTypeLabel = (type) => {
    switch (type) {
      case 'EDIT':
        return '편집';
      case 'STATUS':
        return '상태 변경';
      case 'ASSIGN':
        return '배차 처리';
      default:
        return type;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <LockOutlined style={{ color: '#faad14' }} />
          <span>작업 충돌 알림</span>
        </Space>
      }
      open={visible}
      footer={[
        <Button key="retry" type="primary" onClick={onRetry}>
          다시 시도
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          취소
        </Button>,
      ]}
      onCancel={onCancel}
      width={500}
      maskClosable={false}
      centered
    >
      <Alert
        message="다른 사용자가 현재 작업 중입니다"
        description="선택한 항목에 대해 다른 사용자가 작업 중입니다. 잠시 후 다시 시도하거나 작업을 취소할 수 있습니다."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Descriptions
        title="락 상세 정보"
        bordered
        column={1}
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Descriptions.Item label="작업 사용자">
          <Space>
            <UserOutlined />
            <Text strong>{lockInfo.locked_by || '알 수 없음'}</Text>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="작업 유형">
          <Badge
            status="processing"
            text={getLockTypeLabel(lockInfo.lock_type)}
          />
        </Descriptions.Item>
        <Descriptions.Item label="남은 시간">
          <Space>
            <ClockCircleOutlined />
            <Text type="danger">
              {formatRemainingTime(lockInfo.remaining_seconds)}
            </Text>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="만료 예정 시각">
          {formatExpiryTime(lockInfo.expires_at)}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Text type="secondary">
          다른 사용자의 작업이 완료되거나 락이 만료될 때까지 기다리거나,
          <br />
          지금 다시 시도할 수 있습니다.
        </Text>
      </div>
    </Modal>
  );
};

export default LockConflictModal;

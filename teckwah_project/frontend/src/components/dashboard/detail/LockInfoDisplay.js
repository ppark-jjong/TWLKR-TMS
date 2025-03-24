// src/components/dashboard/detail/LockInfoDisplay.js (상태 변경용 락 표시 개선)
import React, { memo } from 'react';
import { Alert, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

/**
 * 락 정보 표시 컴포넌트
 * 다른 사용자가 락을 보유 중일 때 정보 표시
 * 상태 변경 락 지원 추가
 *
 * @param {Object} props - 컴포넌트 속성
 * @param {Object} props.lockInfo - 락 정보 객체
 * @param {Function} props.getLockTypeText - 락 타입에 따른 텍스트 변환 함수
 */
const LockInfoDisplay = ({ lockInfo, getLockTypeText }) => {
  if (!lockInfo) return null;

  // 락 타입 텍스트 가져오기
  const lockTypeText = getLockTypeText(lockInfo.lock_type);

  // 만료 시간 계산
  const expiresAt = lockInfo.expires_at ? dayjs(lockInfo.expires_at) : null;
  const timeRemaining = expiresAt
    ? Math.max(0, expiresAt.diff(dayjs(), 'minute'))
    : 0;

  // 락 타입별 알림 타입 및 아이콘 설정
  let alertType = 'info';
  if (lockInfo.lock_type === 'STATUS') {
    alertType = 'warning'; // 상태 변경 락은 warning 타입으로 강조
  }

  return (
    <Alert
      type={alertType}
      showIcon
      message="편집 세션 정보"
      description={
        <>
          <Text>
            현재 <Text strong>{lockInfo.locked_by}</Text>님이
            <Text strong> {lockTypeText} </Text>
            작업 중입니다.
          </Text>
          {expiresAt && (
            <div>
              <Text>
                세션 만료: {expiresAt.format('HH:mm:ss')} (남은 시간: 약{' '}
                {timeRemaining}분)
              </Text>
            </div>
          )}
          {lockInfo.lock_type === 'STATUS' && (
            <div style={{ marginTop: 8 }}>
              <Text type="warning">
                상태 변경 작업이 완료될 때까지 기다려 주세요.
              </Text>
            </div>
          )}
        </>
      }
      style={{ marginBottom: 16 }}
    />
  );
};

export default memo(LockInfoDisplay);

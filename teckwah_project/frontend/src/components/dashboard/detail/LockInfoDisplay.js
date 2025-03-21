// src/components/dashboard/detail/LockInfoDisplay.js
import React, { memo } from 'react';
import { Alert, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

/**
 * 락 정보 표시 컴포넌트
 * 다른 사용자가 락을 보유 중일 때 정보 표시
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

  return (
    <Alert
      type="info"
      showIcon
      message="편집 세션 정보"
      description={
        <>
          <Text>
            현재 <Text strong>{lockInfo.locked_by}</Text>님이 {lockTypeText}{' '}
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
        </>
      }
      style={{ marginBottom: 16 }}
    />
  );
};

export default memo(LockInfoDisplay);

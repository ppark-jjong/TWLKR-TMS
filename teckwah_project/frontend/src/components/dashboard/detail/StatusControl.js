// src/components/dashboard/detail/StatusControl.js (비관적 락 적용)
import React, { useState, memo, useCallback } from 'react';
import { Button, Space, Dropdown, Menu } from 'antd';
import {
  CheckCircleFilled,
  PlayCircleFilled,
  WarningFilled,
  StopFilled,
  DownOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  STATUS_TYPES,
  STATUS_TEXTS,
  STATUS_COLORS,
} from '../../../utils/Constants';
import StatusChangeConfirm from '../StatusChangeConfirm';
import { useLogger } from '../../../utils/LogUtils';

/**
 * 대시보드 상태 제어 컴포넌트
 * 비관적 락 기반 상태 변경 처리 적용
 *
 * @param {Object} props - 컴포넌트 속성
 * @param {Object} props.dashboard - 대시보드 데이터
 * @param {Function} props.onStatusChange - 상태 변경 핸들러
 * @param {boolean} props.isAdmin - 관리자 여부
 * @param {boolean} props.lockLoading - 락 획득 중 로딩 상태
 */
const DashboardStatusControl = ({
  dashboard,
  onStatusChange,
  isAdmin = false,
  lockLoading = false,
}) => {
  const logger = useLogger('StatusControl');

  // 상태 변경 확인 모달 관련 상태
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null);

  /**
   * 상태 변경 가능 여부 체크
   * 관리자는 모든 상태 변경 가능, 일반 사용자는 규칙에 따라 제한
   *
   * @param {string} currentStatus - 현재 상태
   * @param {string} targetStatus - 변경할 상태
   * @returns {boolean} - 변경 가능 여부
   */
  const canChangeToStatus = useCallback(
    (currentStatus, targetStatus) => {
      // 동일 상태로 변경은 불가
      if (currentStatus === targetStatus) return false;

      // 관리자는 모든 상태 변경 가능
      if (isAdmin) return true;

      // 일반 사용자의 상태 변경 규칙
      const validTransitions = {
        [STATUS_TYPES.WAITING]: [STATUS_TYPES.IN_PROGRESS, STATUS_TYPES.CANCEL],
        [STATUS_TYPES.IN_PROGRESS]: [STATUS_TYPES.COMPLETE, STATUS_TYPES.ISSUE],
        [STATUS_TYPES.COMPLETE]: [],
        [STATUS_TYPES.ISSUE]: [STATUS_TYPES.IN_PROGRESS],
        [STATUS_TYPES.CANCEL]: [],
      };

      return validTransitions[currentStatus]?.includes(targetStatus) || false;
    },
    [isAdmin]
  );

  /**
   * 상태 변경 시도 핸들러
   * @param {string} status - 변경할 상태
   */
  const handleStatusChange = useCallback(
    (status) => {
      // 변경 가능 상태 확인
      if (canChangeToStatus(dashboard.status, status)) {
        logger.debug(`상태 변경 시도: ${dashboard.status} → ${status}`);
        setTargetStatus(status);
        setShowConfirm(true);
      }
    },
    [dashboard, canChangeToStatus, logger]
  );

  /**
   * 상태 확인 취소 핸들러
   */
  const handleConfirmCancel = useCallback(() => {
    setShowConfirm(false);
    setTargetStatus(null);
  }, []);

  /**
   * 상태 변경 확인 핸들러
   * 비관적 락 처리는 상위 컴포넌트의 onStatusChange에서 수행
   */
  const handleConfirmChange = useCallback(() => {
    if (targetStatus && onStatusChange) {
      onStatusChange(targetStatus);
    }
    setShowConfirm(false);
    setTargetStatus(null);
  }, [targetStatus, onStatusChange]);

  /**
   * 상태별 버튼 아이콘 및 텍스트 정보 반환
   * @param {string} status - 상태 코드
   * @returns {Object} 버튼 속성 정보
   */
  const getStatusButton = (status) => {
    const disabled = !canChangeToStatus(dashboard.status, status);

    switch (status) {
      case STATUS_TYPES.WAITING:
        return {
          icon: <ClockCircleOutlined />,
          text: STATUS_TEXTS[status],
          type: 'default',
          disabled,
        };
      case STATUS_TYPES.IN_PROGRESS:
        return {
          icon: <PlayCircleFilled />,
          text: STATUS_TEXTS[status],
          type: 'warning',
          disabled,
        };
      case STATUS_TYPES.COMPLETE:
        return {
          icon: <CheckCircleFilled />,
          text: STATUS_TEXTS[status],
          type: 'success',
          disabled,
        };
      case STATUS_TYPES.ISSUE:
        return {
          icon: <WarningFilled />,
          text: STATUS_TEXTS[status],
          type: 'danger',
          disabled,
        };
      case STATUS_TYPES.CANCEL:
        return {
          icon: <StopFilled />,
          text: STATUS_TEXTS[status],
          type: 'default',
          disabled,
        };
      default:
        return {
          text: STATUS_TEXTS[status],
          type: 'default',
          disabled,
        };
    }
  };

  // 상태별 메뉴 아이템 생성
  const menuItems = Object.values(STATUS_TYPES)
    .filter((status) => status !== dashboard.status) // 현재 상태 제외
    .map((status) => {
      const btnProps = getStatusButton(status);
      return {
        key: status,
        icon: btnProps.icon,
        label: btnProps.text,
        disabled: btnProps.disabled || lockLoading,
        onClick: () => handleStatusChange(status),
      };
    });

  // 현재 사용 가능한 상태 변경 버튼 (최대 2개까지만 직접 표시)
  const visibleButtons = Object.values(STATUS_TYPES)
    .filter(
      (status) =>
        status !== dashboard.status &&
        canChangeToStatus(dashboard.status, status)
    )
    .slice(0, 2);

  return (
    <>
      <Space>
        {/* 직접 표시되는 버튼 (최대 2개) */}
        {visibleButtons.map((status) => {
          const btnProps = getStatusButton(status);
          return (
            <Button
              key={status}
              type={btnProps.type}
              icon={btnProps.icon}
              onClick={() => handleStatusChange(status)}
              disabled={lockLoading}
              loading={lockLoading}
            >
              {btnProps.text}
            </Button>
          );
        })}

        {/* 더 많은 상태 표시 드롭다운 */}
        {(menuItems.length > 2 || isAdmin) && (
          <Dropdown
            overlay={<Menu items={menuItems} />}
            trigger={['click']}
            placement="bottomRight"
            disabled={lockLoading}
          >
            <Button disabled={lockLoading}>
              더 많은 상태 <DownOutlined />
            </Button>
          </Dropdown>
        )}
      </Space>

      {/* 상태 변경 확인 모달 */}
      <StatusChangeConfirm
        visible={showConfirm}
        dashboard={dashboard}
        newStatus={targetStatus}
        onConfirm={handleConfirmChange}
        onCancel={handleConfirmCancel}
        isAdmin={isAdmin}
      />
    </>
  );
};

export default memo(DashboardStatusControl);

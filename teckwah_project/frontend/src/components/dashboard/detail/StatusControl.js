// src/components/dashboard/detail/StatusControl.js
import React, { useState, memo, useCallback } from 'react';
import { Button, Space, Dropdown, Menu } from 'antd';
import {
  CheckCircleFilled,
  PlayCircleFilled,
  WarningFilled,
  StopFilled,
  DownOutlined,
} from '@ant-design/icons';
import {
  STATUS_TYPES,
  STATUS_TEXTS,
  STATUS_COLORS,
} from '../../../utils/Constants';
import StatusChangeConfirm from '../StatusChangeConfirm'; // 재사용할 기존 컴포넌트

/**
 * 대시보드 상태 제어 컴포넌트
 * 상태 변경 버튼 및 확인 모달 제공
 *
 * @param {Object} props - 컴포넌트 속성
 * @param {Object} props.dashboard - 대시보드 데이터
 * @param {Function} props.onStatusChange - 상태 변경 핸들러
 * @param {boolean} props.isAdmin - 관리자 여부
 */
const DashboardStatusControl = ({
  dashboard,
  onStatusChange,
  isAdmin = false,
}) => {
  // 상태 변경 확인 모달 관련 상태
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null);

  // 상태 변경 가능 여부 체크
  const canChangeToStatus = useCallback(
    (currentStatus, targetStatus) => {
      // 관리자는 모든 상태 변경 가능
      if (isAdmin) return true;

      // 일반적인 상태 변경 규칙
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

  // 상태 변경 시도 핸들러
  const handleStatusChange = useCallback(
    (status) => {
      // 변경 가능 상태 확인
      if (canChangeToStatus(dashboard.status, status)) {
        setTargetStatus(status);
        setShowConfirm(true);
      }
    },
    [dashboard, canChangeToStatus]
  );

  // 상태 확인 취소 핸들러
  const handleConfirmCancel = useCallback(() => {
    setShowConfirm(false);
    setTargetStatus(null);
  }, []);

  // 상태 변경 확인 핸들러
  const handleConfirmChange = useCallback(() => {
    if (targetStatus && onStatusChange) {
      onStatusChange(targetStatus);
    }
    setShowConfirm(false);
    setTargetStatus(null);
  }, [targetStatus, onStatusChange]);

  // 상태별 버튼 아이콘 및 텍스트
  const getStatusButton = (status) => {
    const disabled = !canChangeToStatus(dashboard.status, status);

    switch (status) {
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
        disabled: btnProps.disabled,
        onClick: () => handleStatusChange(status),
      };
    });

  // 현재 사용 가능한 상태 변경 버튼 (관리자 또는 직접 전환 가능 상태)
  const visibleButtons = Object.values(STATUS_TYPES)
    .filter(
      (status) =>
        status !== dashboard.status &&
        canChangeToStatus(dashboard.status, status)
    )
    .slice(0, 2); // 최대 2개까지만 직접 표시

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
            >
              {btnProps.text}
            </Button>
          );
        })}

        {/* 더 많은 상태가 있거나 관리자일 경우 드롭다운 메뉴 표시 */}
        {(menuItems.length > 2 || isAdmin) && (
          <Dropdown
            overlay={<Menu items={menuItems} />}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button>
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

// src/components/dashboard/DashboardStatusControl.js
import React, { useState } from 'react';
import { Button, Select, Space, Tag, Tooltip } from 'antd';
import EditOutlined from '@ant-design/icons/EditOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import { STATUS_COLORS, STATUS_TEXTS } from '../../utils/Constants';
import useAsync from '../../hooks/useAsync';
import DashboardService from '../../services/DashboardService';
import { MessageKeys } from '../../utils/message';

/**
 * 상태 변경 컨트롤 컴포넌트
 * 상태 확인 및 변경 UI 제공
 */
const DashboardStatusControl = ({
  dashboard,
  onStatusChange,
  isAdmin,
  canChangeStatus,
}) => {
  const [editingStatus, setEditingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);

  const { loading, execute: updateStatus } = useAsync(
    DashboardService.updateStatus,
    {
      messageKey: MessageKeys.DASHBOARD.STATUS,
      loadingMessage: '상태 변경 중...',
      successMessage: (result) =>
        `${STATUS_TEXTS[result.status]} 상태로 변경되었습니다`,
      errorMessage: '상태 변경 중 오류가 발생했습니다',
      onSuccess: (result) => {
        setEditingStatus(false);
        if (onStatusChange) {
          onStatusChange(result);
        }
      },
    }
  );

  // 상태 변경 가능한 상태 목록 가져오기
  const getAvailableStatuses = () => {
    // 관리자는 모든 상태로 변경 가능
    if (isAdmin) {
      return Object.entries(STATUS_TEXTS).map(([key, value]) => ({
        value: key,
        label: value,
      }));
    }

    // 일반 사용자는 제한된 상태 변경만 가능
    const transitions = {
      WAITING: ['IN_PROGRESS', 'CANCEL'],
      IN_PROGRESS: ['COMPLETE', 'ISSUE', 'CANCEL'],
      COMPLETE: [],
      ISSUE: [],
      CANCEL: [],
    };

    const availableStatuses = transitions[dashboard.status] || [];
    return availableStatuses.map((status) => ({
      value: status,
      label: STATUS_TEXTS[status],
    }));
  };

  // 상태 변경 핸들러
  const handleStatusChange = (value) => {
    setSelectedStatus(value);
    confirmStatusChange(value);
  };

  // 상태 변경 확인
  const confirmStatusChange = (newStatus) => {
    updateStatus(dashboard.dashboard_id, newStatus, isAdmin);
  };

  // 사용할 수 있는 상태 목록
  const availableStatuses = getAvailableStatuses();

  // 상태 변경 버튼 렌더링
  const renderStatusChangeButton = () => {
    // 상태 변경이 불가능한 경우 (일반 사용자 & 배차 미할당)
    if (!canChangeStatus && !isAdmin) {
      return (
        <Tooltip title="배차 담당자 할당 후 상태 변경이 가능합니다">
          <Button icon={<EditOutlined />} disabled>
            상태 변경
          </Button>
        </Tooltip>
      );
    }

    // 일반 사용자이고 변경 가능한 상태가 없는 경우
    if (availableStatuses.length === 0 && !isAdmin) {
      return null;
    }

    return editingStatus ? (
      <Space.Compact>
        <Select
          placeholder={STATUS_TEXTS[dashboard.status]}
          onChange={handleStatusChange}
          options={availableStatuses}
          disabled={loading}
          style={{ width: 150 }}
          size="large"
        />
        <Button
          icon={<CloseOutlined />}
          onClick={() => setEditingStatus(false)}
          size="large"
        />
      </Space.Compact>
    ) : (
      <Button
        icon={<EditOutlined />}
        type="primary"
        onClick={() => setEditingStatus(true)}
        size="large"
      >
        상태 변경
      </Button>
    );
  };

  return (
    <Space size="large">
      <Tag
        color={STATUS_COLORS[dashboard.status]}
        style={{
          padding: '8px 16px',
          fontSize: '16px',
          fontWeight: 600,
          marginRight: 0,
        }}
      >
        {STATUS_TEXTS[dashboard.status]}
      </Tag>
      {renderStatusChangeButton()}
    </Space>
  );
};

export default DashboardStatusControl;

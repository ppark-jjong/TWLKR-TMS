// src/components/dashboard/DashboardRemarkEditor.js
import React, { useState } from 'react';
import { Button, Typography, Input, Space } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import DashboardService from '../../services/DashboardService';
import useAsync from '../../hooks/useAsync';
import { MessageKeys } from '../../utils/message';
import { FONT_STYLES } from '../../utils/Constants';

const { Text, Title } = Typography;
const { TextArea } = Input;

/**
 * 대시보드 메모 편집 전용 컴포넌트
 * 일반 필드 수정과 분리된 별도의 메모 관리 UI
 */
const DashboardRemarkEditor = ({ dashboard, onUpdate }) => {
  const [editingRemark, setEditingRemark] = useState(false);
  const [remarkContent, setRemarkContent] = useState(dashboard?.remark || '');

  // 메모 업데이트 비동기 처리
  const { loading, execute: updateRemark } = useAsync(
    DashboardService.updateRemark,
    {
      messageKey: MessageKeys.DASHBOARD.MEMO,
      loadingMessage: '메모 업데이트 중...',
      successMessage: '메모가 업데이트되었습니다',
      errorMessage: '메모 업데이트 중 오류가 발생했습니다',
      onSuccess: (updatedDashboard) => {
        setEditingRemark(false);
        if (onUpdate) {
          onUpdate(updatedDashboard);
        }
      },
      onError: () => {
        // 실패 시 원래 메모로 복원
        setRemarkContent(dashboard?.remark || '');
      },
    }
  );

  // 메모 저장 핸들러
  const handleSaveRemark = async () => {
    await updateRemark(dashboard.dashboard_id, remarkContent);
  };

  // 편집 취소 핸들러
  const handleCancelEdit = () => {
    setEditingRemark(false);
    setRemarkContent(dashboard?.remark || '');
  };

  return (
    <div>
      <Title level={5} style={FONT_STYLES.TITLE.SMALL}>
        메모
      </Title>
      {editingRemark ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <TextArea
            value={remarkContent}
            onChange={(e) => setRemarkContent(e.target.value)}
            rows={6}
            maxLength={2000}
            showCount
            style={{
              ...FONT_STYLES.BODY.MEDIUM,
              width: '100%',
              padding: '12px',
              borderRadius: '6px',
            }}
            placeholder="메모를 입력하세요"
          />
          <Space>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleSaveRemark}
              loading={loading}
              size="large"
            >
              저장
            </Button>
            <Button
              icon={<CloseOutlined />}
              onClick={handleCancelEdit}
              size="large"
            >
              취소
            </Button>
          </Space>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: '#fafafa',
              padding: '16px',
              borderRadius: '6px',
              minHeight: '120px',
              maxHeight: '200px',
              overflowY: 'auto',
              marginRight: '16px',
              ...FONT_STYLES.BODY.MEDIUM,
            }}
          >
            {dashboard?.remark || '메모 없음'}
          </div>
          <Button
            icon={<EditOutlined />}
            onClick={() => setEditingRemark(true)}
            size="large"
          >
            메모 수정
          </Button>
        </div>
      )}
    </div>
  );
};

export default DashboardRemarkEditor;

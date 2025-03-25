// src/components/dashboard/detail/RemarkSection.js
import React, { memo } from 'react';
import { Button, Space, Input, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { FONT_STYLES } from '../../../utils/Constants';

const { Text, Title } = Typography;
const { TextArea } = Input;

/**
 * 메모 섹션 컴포넌트
 * 메모 표시, 편집 모드 전환, 메모 내용 변경 기능 제공
 *
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.editMode - 편집 모드 여부
 * @param {Object} props.dashboard - 대시보드 데이터
 * @param {string} props.remarkContent - 메모 내용
 * @param {Function} props.onRemarkContentChange - 메모 내용 변경 핸들러
 * @param {Function} props.onEditStart - 편집 시작 핸들러
 * @param {Function} props.onSave - 저장 핸들러
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {boolean} props.loading - 로딩 상태
 * @param {boolean} props.lockLoading - 락 획득 로딩 상태
 */
const RemarkSection = ({
  editMode = false,
  dashboard,
  remarkContent = '',
  onRemarkContentChange,
  onEditStart,
  onSave,
  onCancel,
  loading = false,
  lockLoading = false,
}) => {
  // 메모 데이터 유무 확인
  const hasRemarks =
    dashboard?.remarks &&
    dashboard.remarks.length > 0 &&
    dashboard.remarks[0].content;

  // 편집 모드 렌더링
  if (editMode) {
    return (
      <div style={{ marginTop: 24 }}>
        <Title level={5} style={FONT_STYLES.TITLE.SMALL}>
          메모 편집
        </Title>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TextArea
            value={remarkContent}
            onChange={(e) => onRemarkContentChange(e.target.value)}
            rows={6}
            maxLength={2000}
            showCount
            style={{ width: '100%', padding: 12, borderRadius: 6 }}
            placeholder="메모를 입력하세요"
            disabled={loading}
          />
          <Space>
            <Button
              type="primary"
              onClick={onSave}
              loading={loading}
              size="middle"
            >
              저장
            </Button>
            <Button onClick={onCancel} size="middle" disabled={loading}>
              취소
            </Button>
          </Space>
        </div>
      </div>
    );
  }

  // 조회 모드 렌더링
  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={5} style={FONT_STYLES.TITLE.SMALL}>
          메모
        </Title>
        <Button
          icon={<EditOutlined />}
          onClick={onEditStart}
          size="middle"
          loading={lockLoading}
        >
          메모 편집
        </Button>
      </div>
      <div
        style={{
          backgroundColor: '#fafafa',
          padding: 16,
          borderRadius: 6,
          minHeight: 120,
          maxHeight: 200,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {hasRemarks ? dashboard.remarks[0].content : '메모 없음'}
      </div>
    </div>
  );
};

export default memo(RemarkSection);
RemarkSection;

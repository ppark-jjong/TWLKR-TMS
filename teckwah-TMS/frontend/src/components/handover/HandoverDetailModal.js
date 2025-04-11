import React from 'react';
import { Modal, Typography, Divider, Button, Space, Tag, Spin, Popconfirm } from 'antd';
import { formatDate } from '../../utils/helpers';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { isAdmin } from '../../utils/auth';

const { Title, Text, Paragraph } = Typography;

/**
 * 인수인계/공지사항 상세 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Object} props.data - 인수인계 상세 데이터
 * @param {Function} props.onEdit - 수정 버튼 클릭 콜백
 * @param {Function} props.onDelete - 삭제 버튼 클릭 콜백
 * @param {boolean} props.loading - 로딩 상태
 */
const HandoverDetailModal = ({
  visible,
  onClose,
  data,
  onEdit,
  onDelete,
  loading,
}) => {
  // 사용자가 작성자 또는 관리자인지 확인
  const canModify = () => {
    if (!data) return false;
    
    const userData = JSON.parse(localStorage.getItem('teckwah_tms_user'));
    
    // 작성자이거나 관리자인 경우 수정/삭제 가능
    return (
      userData?.user_id === data.update_by ||
      isAdmin()
    );
  };

  // 데이터가 없는 경우
  if (!data) {
    return null;
  }

  return (
    <Modal
      title={
        <Space>
          <span>{data.is_notice ? '공지사항' : '인수인계'} 상세 정보</span>
          {data.is_notice && <Tag color="blue">공지</Tag>}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="close" onClick={onClose}>
          닫기
        </Button>,
        canModify() && (
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => onEdit(data)}
          >
            수정
          </Button>
        ),
        canModify() && (
          <Popconfirm
            key="delete"
            title="정말 삭제하시겠습니까?"
            description="삭제된 데이터는 복구할 수 없습니다."
            onConfirm={() => onDelete(data.handover_id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button type="primary" danger icon={<DeleteOutlined />}>
              삭제
            </Button>
          </Popconfirm>
        ),
      ].filter(Boolean)}
    >
      <div style={{ position: 'relative', minHeight: '200px' }}>
        {loading ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.7)',
              zIndex: 1,
            }}
          >
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* 기본 정보 */}
            <div style={{ marginBottom: 24 }}>
              <Title level={4}>{data.title}</Title>
              <Space split={<Divider type="vertical" />}>
                <Text type="secondary">작성자: {data.update_by}</Text>
                <Text type="secondary">작성일시: {formatDate(data.create_at, true)}</Text>
                {data.update_at !== data.create_at && (
                  <Text type="secondary">수정일시: {formatDate(data.update_at, true)}</Text>
                )}
              </Space>
            </div>

            {/* 내용 */}
            <Divider />
            <div
              style={{
                background: '#f9f9f9',
                padding: '16px',
                borderRadius: '4px',
                minHeight: '200px',
              }}
            >
              <Paragraph style={{ whiteSpace: 'pre-line' }}>{data.content}</Paragraph>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default HandoverDetailModal;

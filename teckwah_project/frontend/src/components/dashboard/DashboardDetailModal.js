import React, { useState } from 'react';
import { Modal, Typography, Tag, Button, Space, message, Select, Input } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { 
  STATUS_TYPES,
  STATUS_TEXTS,
  STATUS_COLORS,
  TYPE_TEXTS,
  WAREHOUSE_TEXTS,
  DEPARTMENT_TEXTS
} from '../../utils/Constants';
import { 
  formatDateTime, 
  formatDistance, 
  formatDuration,
  formatPhoneNumber 
} from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const DetailSection = ({ title, children }) => (
  <div style={{ 
    backgroundColor: '#f5f5f5', 
    borderRadius: '8px', 
    padding: '16px', 
    marginBottom: '16px' 
  }}>
    <Title level={5} style={{ marginBottom: '12px', color: '#555' }}>
      {title}
    </Title>
    {children}
  </div>
);

const DetailRow = ({ label, value, highlight = false }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    marginBottom: '8px',
    color: highlight ? '#1890ff' : 'inherit'
  }}>
    <Text type="secondary">{label}</Text>
    <Text strong={highlight}>{value}</Text>
  </div>
);

const DashboardDetailModal = ({ visible, onCancel, onSuccess, dashboard }) => {
  const [loading, setLoading] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingRemark, setEditingRemark] = useState(false);
  const [newStatus, setNewStatus] = useState(dashboard.status);
  const [newRemark, setNewRemark] = useState(dashboard.remark);

  const handleStatusUpdate = async () => {
    try {
      setLoading(true);
      await DashboardService.updateStatus(dashboard.dashboard_id, { status: newStatus });
      message.success('상태가 업데이트되었습니다');
      setEditingStatus(false);
      onSuccess();
    } catch (error) {
      message.error('상태 업데이트 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleRemarkUpdate = async () => {
    try {
      setLoading(true);
      await DashboardService.updateRemark(dashboard.dashboard_id, newRemark);
      message.success('메모가 업데이트되었습니다');
      setEditingRemark(false);
      onSuccess();
    } catch (error) {
      message.error('메모 업데이트 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`주문번호 ${dashboard.order_no} 상세정보`}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      maskClosable={true}
      bodyStyle={{ 
        padding: '24px', 
        backgroundColor: 'white',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}
    >
      <DetailSection title="주문 상태">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingStatus ? (
            <Space.Compact style={{ width: '100%' }}>
              <Select
                value={newStatus}
                onChange={(value) => setNewStatus(value)}
                style={{ width: '100%' }}
                options={Object.entries(STATUS_TYPES)
                  .filter(([_, value]) => value !== dashboard.status)
                  .map(([key, value]) => ({
                    value,
                    label: STATUS_TEXTS[key]
                  }))}
              />
              <Button 
                type="primary" 
                onClick={handleStatusUpdate} 
                loading={loading}
              >
                저장
              </Button>
              <Button onClick={() => {
                setEditingStatus(false);
                setNewStatus(dashboard.status);
              }}>
                취소
              </Button>
            </Space.Compact>
          ) : (
            <Space>
              <Tag 
                color={STATUS_COLORS[dashboard.status]}
                style={{ padding: '4px 12px', fontSize: '14px' }}
              >
                {STATUS_TEXTS[dashboard.status]}
              </Tag>
              <Button 
                icon={<EditOutlined />}
                type="text"
                onClick={() => setEditingStatus(true)}
              >
                상태 변경
              </Button>
            </Space>
          )}
        </div>
      </DetailSection>

      <DetailSection title="기본 정보">
        <DetailRow label="종류" value={TYPE_TEXTS[dashboard.type]} />
        <DetailRow label="부서" value={DEPARTMENT_TEXTS[dashboard.department]} />
        <DetailRow label="출발 허브" value={WAREHOUSE_TEXTS[dashboard.warehouse]} />
      </DetailSection>

      <DetailSection title="기사 정보">
        <DetailRow 
          label="담당 기사" 
          value={dashboard.driver_name || '-'} 
          highlight={!!dashboard.driver_name} 
        />
        <DetailRow 
          label="기사 연락처" 
          value={formatPhoneNumber(dashboard.driver_contact) || '-'} 
          highlight={!!dashboard.driver_contact} 
        />
      </DetailSection>

      <DetailSection title="배송 정보">
        <DetailRow label="접수 시각" value={formatDateTime(dashboard.create_time)} />
        <DetailRow label="출발 시각" value={formatDateTime(dashboard.depart_time) || '-'} />
        <DetailRow label="완료 시각" value={formatDateTime(dashboard.complete_time) || '-'} />
        <DetailRow label="예상 ETA" value={formatDateTime(dashboard.eta)} />
      </DetailSection>

      <DetailSection title="배송 세부 사항">
        <DetailRow label="주소" value={dashboard.address} />
        <DetailRow label="거리" value={formatDistance(dashboard.distance)} />
        <DetailRow label="예상 소요 시간" value={formatDuration(dashboard.duration_time)} />
      </DetailSection>

      <DetailSection title="수령인 정보">
        <DetailRow label="수령인" value={dashboard.customer || '-'} />
        <DetailRow label="연락처" value={formatPhoneNumber(dashboard.contact) || '-'} />
      </DetailSection>

      <DetailSection title="메모">
        {editingRemark ? (
          <Space.Compact style={{ width: '100%' }}>
            <TextArea
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              rows={4}
              maxLength={500}
              showCount
            />
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                onClick={handleRemarkUpdate} 
                loading={loading} 
                block
              >
                메모 저장
              </Button>
              <Button 
                onClick={() => {
                  setEditingRemark(false);
                  setNewRemark(dashboard.remark);
                }} 
                block
              >
                취소
              </Button>
            </Space>
          </Space.Compact>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Paragraph 
              ellipsis={{ rows: 3, expandable: true }} 
              style={{ margin: 0, width: '100%' }}
            >
              {dashboard.remark || '메모 없음'}
            </Paragraph>
            <Button 
              icon={<EditOutlined />}
              type="text"
              onClick={() => setEditingRemark(true)}
            />
          </div>
        )}
      </DetailSection>
    </Modal>
  );
};

export default DashboardDetailModal;
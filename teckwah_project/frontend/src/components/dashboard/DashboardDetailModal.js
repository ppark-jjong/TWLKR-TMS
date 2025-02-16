// frontend/src/components/dashboard/DashboardDetailModal.js
import React, { useState } from 'react';
import { Modal, Descriptions, Select, Input, Button, message, Space, Typography, Tag } from 'antd';
import { 
  STATUS_TYPES,
  STATUS_TEXTS,
  STATUS_COLORS,
  TYPE_TEXTS,
  WAREHOUSE_TEXTS
} from '../../utils/Constants';
import { 
  formatDateTime, 
  formatDistance, 
  formatDuration,
  formatPhoneNumber 
} from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';

const { TextArea } = Input;
const { Text } = Typography;

const DashboardDetailModal = ({ visible, onCancel, onSuccess, dashboard }) => {
  const [loading, setLoading] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingRemark, setEditingRemark] = useState(false);
  const [newStatus, setNewStatus] = useState(dashboard.status);
  const [newRemark, setNewRemark] = useState(dashboard.remark);

  // 상태 변경 시에도 이전 상태로 돌아갈 수 있도록 수정
  const getStatusOptions = () => {
    return Object.values(STATUS_TYPES)
      .filter(status => status !== newStatus)
      .map(status => ({
        value: status,
        label: STATUS_TEXTS[status]
      }));
  };

  const handleStatusUpdate = async () => {
    try {
      setLoading(true);
      await DashboardService.updateStatus(dashboard.dashboard_id, newStatus);
      message.success('상태가 업데이트되었습니다');
      setEditingStatus(false);
      onSuccess();
      onCancel();
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
      onCancel();
    } catch (error) {
      message.error('메모 업데이트 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '18px' }}>대시보드 상세 정보</Text>
          <Text strong style={{ fontSize: '24px', color: '#1890ff' }}>
            주문번호: {dashboard.order_no}
          </Text>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      maskClosable={false}
    >
      <Descriptions 
        bordered 
        column={2}
        style={{ marginTop: '16px' }}
      >
        <Descriptions.Item label="종류">{TYPE_TEXTS[dashboard.type]}</Descriptions.Item>
        <Descriptions.Item label="부서">{dashboard.department}</Descriptions.Item>
        <Descriptions.Item label="출발 허브">{WAREHOUSE_TEXTS[dashboard.warehouse]}</Descriptions.Item>
        <Descriptions.Item label="담당 기사">{dashboard.driver_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="기사 연락처">
          {dashboard.driver_contact ? formatPhoneNumber(dashboard.driver_contact) : '-'}
        </Descriptions.Item>
        
        <Descriptions.Item label="배송 상태" span={2}>
          <div style={{ 
            display: 'flex', 
            gap: 8, 
            minHeight: '40px', 
            alignItems: 'center',
            width: '100%' 
          }}>
            {editingStatus ? (
              <Space size="middle">
                <Select
                  value={newStatus}
                  onChange={setNewStatus}
                  style={{ width: 200 }}
                  options={getStatusOptions()}
                />
                <Button onClick={handleStatusUpdate} loading={loading} type="primary">저장</Button>
                <Button onClick={() => {
                  setEditingStatus(false);
                  setNewStatus(dashboard.status);
                }}>취소</Button>
              </Space>
            ) : (
              <Space>
                <Tag 
                  color={STATUS_COLORS[dashboard.status]}
                  style={{ padding: '4px 12px', fontSize: '14px' }}
                >
                  {STATUS_TEXTS[dashboard.status]}
                </Tag>
                <Button 
                  size="small" 
                  type="primary" 
                  ghost
                  onClick={() => setEditingStatus(true)}
                >
                  수정
                </Button>
              </Space>
            )}
          </div>
        </Descriptions.Item>

        <Descriptions.Item label="접수 시각">{formatDateTime(dashboard.create_time)}</Descriptions.Item>
        <Descriptions.Item label="출발 시각">{formatDateTime(dashboard.depart_time)}</Descriptions.Item>
        <Descriptions.Item label="완료 시각" span={2}>{formatDateTime(dashboard.complete_time)}</Descriptions.Item>

        <Descriptions.Item label="주소" span={2}>{dashboard.address}</Descriptions.Item>
        <Descriptions.Item label="거리">{formatDistance(dashboard.distance)}</Descriptions.Item>
        <Descriptions.Item label="예상 소요 시간">{formatDuration(dashboard.duration_time)}</Descriptions.Item>
        <Descriptions.Item label="수령인">{dashboard.customer}</Descriptions.Item>
        <Descriptions.Item label="연락처">{formatPhoneNumber(dashboard.contact)}</Descriptions.Item>

        <Descriptions.Item label="메모" span={2}>
          {editingRemark ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TextArea
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                rows={4}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button onClick={handleRemarkUpdate} loading={loading} type="primary">저장</Button>
                <Button onClick={() => {
                  setEditingRemark(false);
                  setNewRemark(dashboard.remark);
                }}>취소</Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>{dashboard.remark || '-'}</div>
              <Button 
                size="small" 
                type="primary" 
                ghost
                onClick={() => setEditingRemark(true)}
              >
                수정
              </Button>
            </div>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default DashboardDetailModal;
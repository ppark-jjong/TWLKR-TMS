// frontend/src/components/dashboard/DashboardDetailModal.js
import React, { useState } from 'react';
import { Modal, Descriptions, Select, Input, Button, Space, Typography, Tag, message } from 'antd';
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

const { TextArea } = Input;
const { Text } = Typography;

const DashboardDetailModal = ({ visible, onCancel, onSuccess, dashboard }) => {
  const [loading, setLoading] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingRemark, setEditingRemark] = useState(false);
  const [newStatus, setNewStatus] = useState(dashboard.status);
  const [newRemark, setNewRemark] = useState(dashboard.remark);

  const getStatusOptions = () => {
    return Object.entries(STATUS_TYPES)
      .filter(([_, value]) => value !== newStatus)
      .map(([key, value]) => ({
        value,
        label: STATUS_TEXTS[key]
      }));
  };

  const handleStatusUpdate = async () => {
    try {
      setLoading(true);
      await DashboardService.updateStatus(dashboard.dashboard_id, newStatus);
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
      title={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 0'
        }}>
          <Space direction="vertical" size={4}>
            <Text style={{ fontSize: '14px', color: '#666' }}>주문번호</Text>
            <Text strong style={{ fontSize: '24px' }}>{dashboard.order_no}</Text>
          </Space>
          <Space align="center">
            {editingStatus ? (
              <Space>
                <Select
                  value={newStatus}
                  onChange={(value) => setNewStatus(value)}
                  style={{ width: 120 }}
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
                  icon={<EditOutlined />}
                  type="text"
                  onClick={() => setEditingStatus(true)}
                />
              </Space>
            )}
          </Space>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      maskClosable={false}
      bodyStyle={{ padding: '24px' }}
    >
      <Descriptions 
        column={3}
        bordered
        size="small"
        style={{ marginTop: '24px' }}
      >
        <Descriptions.Item label="종류">{TYPE_TEXTS[dashboard.type]}</Descriptions.Item>
        <Descriptions.Item label="부서">{DEPARTMENT_TEXTS[dashboard.department]}</Descriptions.Item>
        <Descriptions.Item label="출발 허브">{WAREHOUSE_TEXTS[dashboard.warehouse]}</Descriptions.Item>

        <Descriptions.Item label="담당 기사" span={2}>{dashboard.driver_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="기사 연락처" span={2}>
          {formatPhoneNumber(dashboard.driver_contact) || '-'}
        </Descriptions.Item>

        <Descriptions.Item label="접수 시각">{formatDateTime(dashboard.create_time)}</Descriptions.Item>
        <Descriptions.Item label="출발 시각">{formatDateTime(dashboard.depart_time) || '-'}</Descriptions.Item>
        <Descriptions.Item label="완료 시각">{formatDateTime(dashboard.complete_time) || '-'}</Descriptions.Item>

        <Descriptions.Item label="주소" span={3}>{dashboard.address}</Descriptions.Item>

        <Descriptions.Item label="거리">{formatDistance(dashboard.distance)}</Descriptions.Item>
        <Descriptions.Item label="예상 소요 시간" span={2}>
          {formatDuration(dashboard.duration_time)}
        </Descriptions.Item>

        <Descriptions.Item label="수령인" span={2}>{dashboard.customer}</Descriptions.Item>
        <Descriptions.Item label="연락처" span={2}>
          {formatPhoneNumber(dashboard.contact)}
        </Descriptions.Item>

        <Descriptions.Item label="메모" span={3}>
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
                icon={<EditOutlined />}
                type="text"
                onClick={() => setEditingRemark(true)}
              />
            </div>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default DashboardDetailModal;
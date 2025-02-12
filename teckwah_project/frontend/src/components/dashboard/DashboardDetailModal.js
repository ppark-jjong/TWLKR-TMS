// frontend/src/components/dashboard/DashboardDetailModal.js
import React, { useState } from 'react';
import { Modal, Descriptions, Select, Input, Button, message } from 'antd';
import { STATUS_TYPES, STATUS_TEXTS } from '../../utils/Constants';
import { 
  formatDateTime, 
  formatDistance, 
  formatDuration,
  formatPhoneNumber 
} from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';

const { TextArea } = Input;

/**
 * 대시보드 상세 정보 모달 컴포넌트
 * @param {Object} props
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {Function} props.onSuccess - 성공 핸들러
 * @param {import('../../types').Dashboard} props.dashboard - 대시보드 데이터
 */
const DashboardDetailModal = ({ visible, onCancel, onSuccess, dashboard }) => {
  const [loading, setLoading] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingRemark, setEditingRemark] = useState(false);
  const [newStatus, setNewStatus] = useState(dashboard.status);
  const [newRemark, setNewRemark] = useState(dashboard.remark);

  // 상태 업데이트
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

  // 메모 업데이트
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

  // 상태 옵션 생성 및 상태 변경 가능 여부 체크
  const getStatusOptions = () => {
    const currentStatus = dashboard.status;
    let allowedStatus = [];

    switch (currentStatus) {
      case STATUS_TYPES.WAITING:
        allowedStatus = [STATUS_TYPES.IN_PROGRESS];
        break;
      case STATUS_TYPES.IN_PROGRESS:
        allowedStatus = [STATUS_TYPES.COMPLETE, STATUS_TYPES.ISSUE];
        break;
      case STATUS_TYPES.ISSUE:
        allowedStatus = [STATUS_TYPES.IN_PROGRESS];
        break;
      default:
        allowedStatus = [];
    }

    return allowedStatus.map(status => ({
      value: status,
      label: STATUS_TEXTS[status]
    }));
  };

  return (
    <Modal
      title="대시보드 상세 정보"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      maskClosable={false}
    >
      <Descriptions bordered column={2}>
        <Descriptions.Item label="종류">{dashboard.type}</Descriptions.Item>
        <Descriptions.Item label="부서">{dashboard.department}</Descriptions.Item>
        <Descriptions.Item label="출발 허브">{dashboard.warehouse}</Descriptions.Item>
        <Descriptions.Item label="담당 기사">{dashboard.driver_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="기사 연락처">
          {dashboard.driver_contact ? formatPhoneNumber(dashboard.driver_contact) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="order_no">{dashboard.order_no}</Descriptions.Item>
        <Descriptions.Item label="ETA">{formatDateTime(dashboard.eta)}</Descriptions.Item>
        
        <Descriptions.Item label="배송 상태" span={2}>
          {editingStatus ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Select
                value={newStatus}
                onChange={setNewStatus}
                style={{ width: 200 }}
                options={getStatusOptions()}
              />
              <Button onClick={handleStatusUpdate} loading={loading} type="primary">저장</Button>
              <Button onClick={() => setEditingStatus(false)}>취소</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {STATUS_TEXTS[dashboard.status]}
              {getStatusOptions().length > 0 && (
                <Button size="small" onClick={() => setEditingStatus(true)}>수정</Button>
              )}
            </div>
          )}
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
                <Button onClick={() => setEditingRemark(false)}>취소</Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>{dashboard.remark || '-'}</div>
              <Button size="small" onClick={() => setEditingRemark(true)}>수정</Button>
            </div>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default DashboardDetailModal;
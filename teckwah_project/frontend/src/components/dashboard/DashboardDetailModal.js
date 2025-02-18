// frontend/src/components/dashboard/DashboardDetailModal.js
import React, { useState, useEffect } from 'react';
import { Modal, Typography, Tag, Button, Space, Select, Input, Row, Col, Divider } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { 
  STATUS_TYPES,
  STATUS_TEXTS,
  STATUS_COLORS,
  TYPE_TEXTS,
  WAREHOUSE_TEXTS,
  DEPARTMENT_TEXTS,
  FONT_STYLES
} from '../../utils/Constants';
import { 
  formatDateTime, 
  formatDistance, 
  formatDuration,
  formatPhoneNumber 
} from '../../utils/Formatter';
import message, { MessageKeys, MessageTemplates } from '../../utils/message';
import DashboardService from '../../services/DashboardService';
import { useDashboard } from '../../contexts/DashboardContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const DetailItem = ({ label, value, highlight = false }) => (
  <div style={{ marginBottom: '12px' }}>
    <Text type="secondary" style={{ ...FONT_STYLES.LABEL, display: 'block', marginBottom: '4px' }}>
      {label}
    </Text>
    <Text strong={highlight} style={highlight ? FONT_STYLES.BODY.LARGE : FONT_STYLES.BODY.MEDIUM}>
      {value}
    </Text>
  </div>
);

const DashboardDetailModal = ({ visible, onCancel, onSuccess, dashboard: initialDashboard }) => {
  const [loading, setLoading] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingRemark, setEditingRemark] = useState(false);
  const [dashboard, setDashboard] = useState(initialDashboard);
  const { updateDashboard } = useDashboard();

  useEffect(() => {
    setDashboard(initialDashboard);
  }, [initialDashboard]);

  const handleStatusUpdate = async (newStatus) => {
    const key = MessageKeys.DASHBOARD.STATUS;
    setLoading(true);
    message.loading(`${STATUS_TEXTS[newStatus]} 상태로 변경 중...`, key);

    try {
      const updatedDashboard = await DashboardService.updateStatus(dashboard.dashboard_id, { 
        status: newStatus 
      });
      
      // 로컬 상태 및 컨텍스트 업데이트
      setDashboard(updatedDashboard);
      updateDashboard(dashboard.dashboard_id, updatedDashboard);
      setEditingStatus(false);
      
      message.loadingToSuccess(
        MessageTemplates.DASHBOARD.STATUS_SUCCESS(STATUS_TEXTS[newStatus]),
        key
      );
    } catch (error) {
      message.loadingToError(MessageTemplates.DASHBOARD.STATUS_FAIL, key);
    } finally {
      setLoading(false);
    }
  };

  const handleRemarkUpdate = async () => {
    const key = MessageKeys.DASHBOARD.MEMO;
    setLoading(true);
    message.loading('메모 업데이트 중...', key);

    try {
      const updatedDashboard = await DashboardService.updateRemark(
        dashboard.dashboard_id,
        dashboard.remark
      );
      
      setDashboard(updatedDashboard);
      updateDashboard(dashboard.dashboard_id, updatedDashboard);
      setEditingRemark(false);
      
      message.loadingToSuccess(MessageTemplates.DASHBOARD.MEMO_SUCCESS, key);
    } catch (error) {
      message.loadingToError(MessageTemplates.DASHBOARD.MEMO_FAIL, key);
      setDashboard(initialDashboard); // 에러 시 원래 상태로 복구
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Text style={FONT_STYLES.TITLE.MEDIUM}>
          주문번호 {dashboard.order_no} 상세정보
        </Text>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1400}
      style={{ top: 20 }}
      bodyStyle={{ 
        padding: '16px',
        backgroundColor: 'white',
        height: 'calc(90vh - 100px)',
        overflow: 'hidden'
      }}
    >
      <div style={{ height: '100%' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%', height: '100%' }}>
          <Space size="middle">
            <Tag color={STATUS_COLORS[dashboard.status]} style={{ 
              padding: '4px 12px',
              ...FONT_STYLES.BODY.MEDIUM
            }}>
              {STATUS_TEXTS[dashboard.status]}
            </Tag>
            {editingStatus ? (
              <Space.Compact>
                <Select
                  value={dashboard.status}
                  onChange={handleStatusUpdate}
                  style={{ width: '120px' }}
                  options={Object.entries(STATUS_TYPES)
                    .filter(([_, value]) => value !== dashboard.status)
                    .map(([key, value]) => ({
                      value,
                      label: STATUS_TEXTS[key]
                    }))}
                  disabled={loading}
                />
                <Button 
                  icon={<CloseOutlined />}
                  onClick={() => setEditingStatus(false)}
                />
              </Space.Compact>
            ) : (
              <Button 
                icon={<EditOutlined />}
                type="text"
                onClick={() => setEditingStatus(true)}
              >
                상태 변경
              </Button>
            )}
          </Space>

          <Row gutter={[24, 24]} style={{ marginTop: '8px' }}>
            <Col span={8}>
              <Title level={5} style={{ ...FONT_STYLES.TITLE.SMALL, marginBottom: '12px' }}>
                기본 정보
              </Title>
              <DetailItem label="부서" value={DEPARTMENT_TEXTS[dashboard.department]} />
              <DetailItem label="출발 허브" value={WAREHOUSE_TEXTS[dashboard.warehouse]} />
              <DetailItem label="SLA" value={dashboard.sla} />
            </Col>

            <Col span={8}>
              <Title level={5} style={{ ...FONT_STYLES.TITLE.SMALL, marginBottom: '12px' }}>
                배송 시간
              </Title>
              <DetailItem label="접수 시각" value={formatDateTime(dashboard.create_time)} />
              <DetailItem label="출발 시각" value={formatDateTime(dashboard.depart_time) || '-'} />
              <DetailItem label="완료 시각" value={formatDateTime(dashboard.complete_time) || '-'} />
              <DetailItem label="예상 ETA" value={formatDateTime(dashboard.eta)} />
            </Col>

            <Col span={8}>
              <Title level={5} style={{ ...FONT_STYLES.TITLE.SMALL, marginBottom: '12px' }}>
                기사 정보
              </Title>
              <DetailItem 
                label="담당 기사" 
                value={dashboard.driver_name || '-'} 
                highlight={!!dashboard.driver_name} 
              />
              <DetailItem 
                label="기사 연락처" 
                value={formatPhoneNumber(dashboard.driver_contact) || '-'} 
                highlight={!!dashboard.driver_contact} 
              />
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            <Col span={12}>
              <Title level={5} style={{ ...FONT_STYLES.TITLE.SMALL, marginBottom: '12px' }}>
                배송 세부사항
              </Title>
              <DetailItem label="주소" value={dashboard.address} />
              <DetailItem label="예상 거리" value={formatDistance(dashboard.distance)} />
              <DetailItem label="예상 소요시간" value={formatDuration(dashboard.duration_time)} />
            </Col>

            <Col span={12}>
              <Title level={5} style={{ ...FONT_STYLES.TITLE.SMALL, marginBottom: '12px' }}>
                수령인 정보 및 메모
              </Title>
              <DetailItem label="수령인" value={dashboard.customer || '-'} />
              <DetailItem label="연락처" value={formatPhoneNumber(dashboard.contact) || '-'} />
              <div style={{ marginTop: '8px' }}>
                {editingRemark ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <TextArea
                      value={dashboard.remark}
                      onChange={(e) => setDashboard({...dashboard, remark: e.target.value})}
                      rows={2}
                      maxLength={500}
                      showCount
                      style={FONT_STYLES.BODY.MEDIUM}
                    />
                    <Space>
                      <Button 
                        type="primary" 
                        icon={<CheckOutlined />}
                        onClick={handleRemarkUpdate} 
                        loading={loading}
                      >
                        저장
                      </Button>
                      <Button 
                        icon={<CloseOutlined />}
                        onClick={() => {
                          setEditingRemark(false);
                          setDashboard(initialDashboard);
                        }}
                      >
                        취소
                      </Button>
                    </Space>
                  </Space>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start' 
                  }}>
                    <Text style={{ flex: 1, ...FONT_STYLES.BODY.MEDIUM }}>
                      {dashboard.remark || '메모 없음'}
                    </Text>
                    <Button 
                      icon={<EditOutlined />}
                      type="text"
                      onClick={() => setEditingRemark(true)}
                    >
                      메모 수정
                    </Button>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Space>
      </div>
    </Modal>
  );
};

export default DashboardDetailModal;
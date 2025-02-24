// frontend/src/components/dashboard/DashboardDetailModal.js
import React, { useState } from 'react';
import {
  Modal,
  Typography,
  Tag,
  Button,
  Space,
  Select,
  Input,
  Row,
  Col,
  Divider,
} from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import {
  STATUS_TYPES,
  STATUS_TEXTS,
  STATUS_COLORS,
  TYPE_TEXTS,
  WAREHOUSE_TEXTS,
  DEPARTMENT_TEXTS,
  FONT_STYLES,
} from '../../utils/Constants';
import {
  formatDateTime,
  formatDistance,
  formatDuration,
} from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 정보 표시 컴포넌트
const InfoItem = ({ label, value, highlight = false }) => (
  <div style={{ marginBottom: '16px' }}>
    <div
      style={{
        display: 'flex',
        backgroundColor: '#fafafa',
        padding: '12px 16px',
        borderRadius: '6px',
      }}
    >
      <Text
        style={{
          ...FONT_STYLES.BODY.MEDIUM,
          width: '120px',
          color: '#666',
          flexShrink: 0,
        }}
      >
        {label}
      </Text>
      <Text
        strong={highlight}
        style={{
          ...FONT_STYLES.BODY.MEDIUM,
          flex: 1,
          color: highlight ? '#1890ff' : 'rgba(0, 0, 0, 0.85)',
        }}
      >
        {value || '-'}
      </Text>
    </div>
  </div>
);

const DashboardDetailModal = ({ visible, dashboard, onCancel, onSuccess }) => {
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingRemark, setEditingRemark] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState(dashboard);

  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      await DashboardService.updateStatus(dashboard.dashboard_id, newStatus);
      setEditingStatus(false);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const handleRemarkUpdate = async () => {
    try {
      setLoading(true);
      await DashboardService.updateRemark(
        dashboard.dashboard_id,
        currentDashboard.remark
      );
      setEditingRemark(false);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  // 상태 변경 가능한 상태 목록
  const getAvailableStatuses = () => {
    // 상태 변경 규칙
    const transitions = {
      WAITING: ['IN_PROGRESS', 'CANCEL'],
      IN_PROGRESS: ['COMPLETE', 'ISSUE', 'CANCEL'],
      COMPLETE: [],
      ISSUE: [],
      CANCEL: [],
    };

    return Object.entries(STATUS_TYPES)
      .filter(([_, value]) =>
        transitions[currentDashboard.status].includes(value)
      )
      .map(([key, value]) => ({
        value,
        label: STATUS_TEXTS[key],
      }));
  };

  return (
    <Modal
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            marginRight: '48px',
          }}
        >
          <Text style={{ ...FONT_STYLES.TITLE.LARGE, marginRight: '24px' }}>
            주문번호: {dashboard.order_no}
          </Text>
          <Space size="large">
            <Tag
              color={STATUS_COLORS[currentDashboard.status]}
              style={{
                padding: '8px 16px',
                fontSize: '16px',
                fontWeight: 600,
                marginRight: 0,
              }}
            >
              {STATUS_TEXTS[currentDashboard.status]}
            </Tag>
            {editingStatus ? (
              <Space.Compact>
                <Select
                  placeholder={STATUS_TEXTS[currentDashboard.status]}
                  onChange={handleStatusChange}
                  options={getAvailableStatuses()}
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
                onClick={() => setEditingStatus(true)}
                disabled={!currentDashboard.driver_name}
                size="large"
              >
                상태 변경
              </Button>
            )}
          </Space>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1200}
      maskClosable={false}
    >
      <div style={{ padding: '24px' }}>
        <Row gutter={32}>
          <Col span={12}>
            <Title level={5} style={FONT_STYLES.TITLE.SMALL}>
              기본 정보
            </Title>
            <InfoItem
              label="부서"
              value={DEPARTMENT_TEXTS[currentDashboard.department]}
            />
            <InfoItem label="종류" value={TYPE_TEXTS[currentDashboard.type]} />
            <InfoItem
              label="출발 허브"
              value={WAREHOUSE_TEXTS[currentDashboard.warehouse]}
            />
            <InfoItem label="SLA" value={currentDashboard.sla} />

            <Divider />

            <Title level={5} style={FONT_STYLES.TITLE.SMALL}>
              배송 시간
            </Title>
            <InfoItem
              label="접수 시각"
              value={formatDateTime(currentDashboard.create_time)}
            />
            <InfoItem
              label="출발 시각"
              value={formatDateTime(currentDashboard.depart_time)}
            />
            <InfoItem
              label="완료 시각"
              value={formatDateTime(currentDashboard.complete_time)}
            />
            <InfoItem
              label="ETA"
              value={formatDateTime(currentDashboard.eta)}
              highlight={true}
            />
          </Col>

          <Col span={12}>
            <Title level={5} style={FONT_STYLES.TITLE.SMALL}>
              배송 담당자
            </Title>
            <InfoItem
              label="담당 기사"
              value={currentDashboard.driver_name}
              highlight={true}
            />
            <InfoItem
              label="기사 연락처"
              value={currentDashboard.driver_contact}
            />

            <Divider />

            <Title level={5} style={FONT_STYLES.TITLE.SMALL}>
              배송 세부사항
            </Title>
            <InfoItem label="주소" value={currentDashboard.address} />
            <InfoItem
              label="예상 거리"
              value={formatDistance(currentDashboard.distance)}
            />
            <InfoItem
              label="예상 소요시간"
              value={formatDuration(currentDashboard.duration_time)}
            />

            <Divider />

            <Title level={5} style={FONT_STYLES.TITLE.SMALL}>
              수령인 정보
            </Title>
            <InfoItem label="수령인" value={currentDashboard.customer} />
            <InfoItem label="연락처" value={currentDashboard.contact} />
          </Col>
        </Row>

        <Divider />

        <div>
          <Title level={5} style={FONT_STYLES.TITLE.SMALL}>
            메모
          </Title>
          {editingRemark ? (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <TextArea
                value={currentDashboard.remark}
                onChange={(e) =>
                  setCurrentDashboard({
                    ...currentDashboard,
                    remark: e.target.value,
                  })
                }
                rows={6}
                maxLength={2000}
                showCount
                style={{
                  ...FONT_STYLES.BODY.MEDIUM,
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                }}
              />
              <Space>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleRemarkUpdate}
                  loading={loading}
                  size="large"
                >
                  저장
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setEditingRemark(false);
                    setCurrentDashboard(dashboard);
                  }}
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
                {currentDashboard.remark || '메모 없음'}
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
      </div>
    </Modal>
  );
};

export default DashboardDetailModal;

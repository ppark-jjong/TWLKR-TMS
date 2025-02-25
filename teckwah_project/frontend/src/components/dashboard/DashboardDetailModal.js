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
<<<<<<< HEAD
  Tooltip,
=======
>>>>>>> main
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
<<<<<<< HEAD
  formatPhoneNumber,
=======
>>>>>>> main
} from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { confirm } = Modal;

<<<<<<< HEAD
// 섹션 타이틀 컴포넌트
const SectionTitle = ({ children }) => (
  <Title
    level={5}
    style={{
      ...FONT_STYLES.TITLE.SMALL,
      marginBottom: '16px',
      color: '#1890ff',
      borderBottom: '2px solid #1890ff',
      paddingBottom: '8px',
    }}
  >
    {children}
  </Title>
);

=======
>>>>>>> main
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

<<<<<<< HEAD
const DashboardDetailModal = ({
  visible,
  dashboard,
  onCancel,
  onSuccess,
  isAdmin,
}) => {
  const [loading, setLoading] = useState(false);
=======
const DashboardDetailModal = ({ visible, dashboard, onCancel, onSuccess }) => {
>>>>>>> main
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingRemark, setEditingRemark] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState(dashboard);
  const [selectedStatus, setSelectedStatus] = useState(null);

<<<<<<< HEAD
  // 상태 변경 가능 여부 확인
  const canChangeStatus = () => {
    if (isAdmin) return true;
    return !!(currentDashboard.driver_name && currentDashboard.driver_contact);
  };

  // 상태 변경 가능한 상태 목록 가져오기
  const getAvailableStatuses = (currentStatus) => {
    // 관리자는 모든 상태로 변경 가능
    if (isAdmin) {
      return Object.entries(STATUS_TYPES).map(([key, value]) => ({
        value,
        label: STATUS_TEXTS[key],
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

    return Object.entries(STATUS_TYPES)
      .filter(([_, value]) => transitions[currentStatus].includes(value))
      .map(([key, value]) => ({
        value,
        label: STATUS_TEXTS[key],
      }));
  };

  // 상태 변경 확인 (관리자용)
  const confirmStatusChange = (newStatus) => {
    if (!isAdmin) {
      handleStatusUpdate(newStatus);
      return;
    }

    // 관리자 상태 변경 확인 모달
    let timeChangeMessage = '';
    if (newStatus === 'IN_PROGRESS' && dashboard.status !== 'IN_PROGRESS') {
      timeChangeMessage = '• depart_time이 현재 시간으로 설정됩니다.';
    } else if (['COMPLETE', 'ISSUE'].includes(newStatus)) {
      timeChangeMessage = '• complete_time이 현재 시간으로 설정됩니다.';
    } else if (['WAITING', 'CANCEL'].includes(newStatus)) {
      timeChangeMessage = '• depart_time과 complete_time이 초기화됩니다.';
    }

    confirm({
      title: '상태 변경 확인',
      content: (
        <div>
          <p>
            상태를 <b>{STATUS_TEXTS[newStatus]}</b>로 변경하시겠습니까?
          </p>
          <p style={{ color: '#ff4d4f' }}>{timeChangeMessage}</p>
          <p>
            상태 변경 시 시간 값이 자동으로 업데이트되며, 이는 데이터 처리에
            중요한 영향을 미칩니다.
          </p>
        </div>
      ),
      okText: '변경',
      cancelText: '취소',
      onOk() {
        handleStatusUpdate(newStatus);
      },
    });
  };

  const handleStatusUpdate = async (newStatus) => {
=======
  const handleStatusChange = async (newStatus) => {
>>>>>>> main
    try {
      setLoading(true);
<<<<<<< HEAD
      console.log(
        '상태 변경 요청:',
        dashboard.dashboard_id,
        newStatus,
        isAdmin
      );

      const updatedDashboard = await DashboardService.updateStatus(
        dashboard.dashboard_id,
        newStatus,
        isAdmin
      );
      setCurrentDashboard(updatedDashboard);
=======
      await DashboardService.updateStatus(dashboard.dashboard_id, newStatus);
>>>>>>> main
      setEditingStatus(false);
      onSuccess();
<<<<<<< HEAD
    } catch (error) {
      console.error('상태 변경 실패:', error);
      message.error(
        error.response?.data?.detail || '상태 변경 중 오류가 발생했습니다'
      );
=======
>>>>>>> main
    } finally {
      setLoading(false);
    }
  };

  const handleRemarkUpdate = async () => {
    try {
      setLoading(true);
<<<<<<< HEAD
      console.log(
        '메모 업데이트 요청:',
        dashboard.dashboard_id,
        currentDashboard.remark
      );

      const updatedDashboard = await DashboardService.updateRemark(
=======
      await DashboardService.updateRemark(
>>>>>>> main
        dashboard.dashboard_id,
        currentDashboard.remark
      );
      setEditingRemark(false);
      onSuccess();
<<<<<<< HEAD
    } catch (error) {
      console.error('메모 업데이트 실패:', error);
      message.error(
        error.response?.data?.detail || '메모 업데이트 중 오류가 발생했습니다'
      );
      setCurrentDashboard(dashboard); // 에러 시 원래 상태로 복구
=======
>>>>>>> main
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  // 상태 변경 선택 처리
  const handleStatusSelect = (value) => {
    setSelectedStatus(value);
    confirmStatusChange(value);
  };

  // 상태 변경 버튼 렌더링
  const renderStatusChangeButton = () => {
    const availableStatuses = getAvailableStatuses(currentDashboard.status);

    // 상태 변경이 불가능한 경우 (일반 사용자 & 배차 미할당)
    if (!canChangeStatus() && !isAdmin) {
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
          placeholder={STATUS_TEXTS[currentDashboard.status]}
          onChange={handleStatusSelect}
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
=======
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
>>>>>>> main
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
<<<<<<< HEAD
      bodyStyle={{
        maxHeight: 'calc(90vh - 150px)',
        overflowY: 'auto',
        padding: '24px',
      }}
=======
      maskClosable={false}
>>>>>>> main
    >
      <div style={{ padding: '24px' }}>
        <Row gutter={32}>
          <Col span={12}>
<<<<<<< HEAD
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle>기본 정보</SectionTitle>
              <InfoItem
                label="부서"
                value={DEPARTMENT_TEXTS[currentDashboard.department]}
              />
              <InfoItem
                label="종류"
                value={TYPE_TEXTS[currentDashboard.type]}
              />
              <InfoItem
                label="출발 허브"
                value={WAREHOUSE_TEXTS[currentDashboard.warehouse]}
              />
              <InfoItem label="SLA" value={currentDashboard.sla} />
            </div>

            <div>
              <SectionTitle>배송 시간</SectionTitle>
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
            </div>
          </Col>

          <Col span={12}>
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle>배송 담당자</SectionTitle>
              <InfoItem
                label="담당 기사"
                value={currentDashboard.driver_name}
                highlight={true}
              />
              <InfoItem
                label="기사 연락처"
                value={formatPhoneNumber(currentDashboard.driver_contact)}
              />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <SectionTitle>배송 세부사항</SectionTitle>
              <InfoItem label="주소" value={currentDashboard.address} />
              <InfoItem
                label="예상 거리"
                value={formatDistance(currentDashboard.distance)}
              />
              <InfoItem
                label="예상 소요시간"
                value={formatDuration(currentDashboard.duration_time)}
              />
            </div>

            <div>
              <SectionTitle>수령인 정보</SectionTitle>
              <InfoItem label="수령인" value={currentDashboard.customer} />
              <InfoItem
                label="연락처"
                value={formatPhoneNumber(currentDashboard.contact)}
              />
            </div>
=======
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
>>>>>>> main
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

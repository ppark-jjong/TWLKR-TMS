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
  Tooltip,
  Form,
  DatePicker,
  message as antMessage,
} from 'antd';
import axios from 'axios';
import {
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  SaveOutlined,
} from '@ant-design/icons';
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
  formatPhoneNumber,
} from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';
import message, { MessageKeys, MessageTemplates } from '../../utils/message';
import dayjs from 'dayjs';
import LockService from '../../services/LockService';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { confirm } = Modal;

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

const DashboardDetailModal = ({
  visible,
  dashboard,
  onCancel,
  onSuccess,
  isAdmin,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingRemark, setEditingRemark] = useState(false);
  const [editingFields, setEditingFields] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState(dashboard);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [remarkLocked, setRemarkLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState('');
  const [lockAcquired, setLockAcquired] = useState(false);
  const [lockError, setLockError] = useState(null);
  // 낙관적 락을 위한 버전 관리
  const [currentVersion, setCurrentVersion] = useState(dashboard?.version || 1);
  // 편집 모드 시작 시 락 획득 시도
  const startEditingFields = async () => {
    try {
      await LockService.acquireLock(dashboard.dashboard_id, 'EDIT');
      setLockAcquired(true);
      initFieldsForm();
      setEditingFields(true);
    } catch (error) {
      // 락 획득 실패 처리
      setLockError(
        error.response?.data?.detail || '편집을 시작할 수 없습니다.'
      );
    }
  };

  // 편집 취소 시 락 해제
  const cancelEditingFields = async () => {
    setEditingFields(false);
    form.resetFields();
    if (lockAcquired) {
      await LockService.releaseLock(dashboard.dashboard_id);
      setLockAcquired(false);
    }
  };

  // 필드 수정을 위한 폼 초기화
  const initFieldsForm = () => {
    form.setFieldsValue({
      eta: currentDashboard.eta ? dayjs(currentDashboard.eta) : null,
      customer: currentDashboard.customer || '',
      contact: currentDashboard.contact || '',
      address: currentDashboard.address || '',
      postal_code: currentDashboard.postal_code || '',
      version: currentVersion,
    });
  };

  // 상태 변경 가능 여부 확인
  const canChangeStatus = () => {
    // 관리자는 항상 변경 가능
    if (isAdmin) return true;

    // 디버깅을 위한 상세 로깅 추가
    console.log('상태 변경 가능 여부 체크:', {
      dashboardId: currentDashboard.dashboard_id,
      driverName: currentDashboard.driver_name || '없음',
      driverContact: currentDashboard.driver_contact || '없음',
      hasDriverName: Boolean(currentDashboard.driver_name),
      hasDriverContact: Boolean(currentDashboard.driver_contact),
      typeofDriverName: typeof currentDashboard.driver_name,
      typeofDriverContact: typeof currentDashboard.driver_contact,
    });

    // 명시적인 문자열 타입 확인 및 공백 검사 (문제 해결)
    const hasDriverName =
      typeof currentDashboard.driver_name === 'string' &&
      currentDashboard.driver_name.trim() !== '';

    const hasDriverContact =
      typeof currentDashboard.driver_contact === 'string' &&
      currentDashboard.driver_contact.trim() !== '';

    return hasDriverName && hasDriverContact;
  };

  // 상태 변경 가능한 상태 목록 가져오기
  const getAvailableStatuses = () => {
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
      .filter(([_, value]) =>
        transitions[currentDashboard.status]?.includes(value)
      )
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
    if (
      newStatus === 'IN_PROGRESS' &&
      currentDashboard.status !== 'IN_PROGRESS'
    ) {
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
    const key = MessageKeys.DASHBOARD.STATUS;
    try {
      setLoading(true);
      message.loading('상태 변경 중...', key);

      console.log(
        '상태 변경 요청:',
        dashboard.dashboard_id,
        newStatus,
        isAdmin,
        '버전:',
        currentVersion
      );

      const updatedDashboard = await DashboardService.updateStatus(
        dashboard.dashboard_id,
        newStatus,
        isAdmin,
        currentVersion // 낙관적 락을 위한 버전 전송
      );

      // 업데이트된 대시보드 정보로 화면 갱신
      setCurrentDashboard(updatedDashboard);
      setCurrentVersion(updatedDashboard.version); // 버전 업데이트
      setEditingStatus(false);
      message.loadingToSuccess(
        `${STATUS_TEXTS[newStatus]} 상태로 변경되었습니다`,
        key
      );
      onSuccess(); // 부모 컴포넌트에 성공 알림
    } catch (error) {
      console.error('상태 변경 실패:', error);

      // 사용자 친화적인 오류 메시지 처리
      if (error.response?.status === 409) {
        // 낙관적 락 충돌
        const errorDetail = error.response?.data?.detail;
        const newVersion = errorDetail?.current_version;

        if (newVersion) {
          // 충돌 시 사용자에게 친절한 메시지 표시
          antMessage.error(
            '다른 사용자가 이미 주문 정보를 수정했습니다. 최신 데이터를 불러옵니다.'
          );
          setCurrentVersion(newVersion); // 최신 버전으로 업데이트
          // 부모 컴포넌트의 리로드 함수 호출
          onSuccess();
        } else {
          message.loadingToError(
            '데이터 충돌이 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.',
            key
          );
        }
      } else if (error.response?.status === 423) {
        // 비관적 락 충돌
        const lockedBy =
          error.response?.data?.detail?.locked_by || '다른 사용자';
        message.loadingToError(
          `현재 ${lockedBy}님이 이 데이터를 수정 중입니다. 잠시 후 다시 시도해주세요.`,
          key
        );
      } else if (error.response?.status === 400) {
        // 유효하지 않은 상태 변경
        const errorMessage =
          error.response?.data?.detail || '유효하지 않은 상태 변경입니다.';
        message.loadingToError(errorMessage, key);
      } else {
        message.loadingToError(
          '상태 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          key
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // 메모 수정 시 비관적 락 획득 시도
  const tryAcquireRemarkLock = async () => {
    try {
      setLoading(true);
      // 비관적 락 획득 시도 API 호출 (가상 - 백엔드 명세에 없음)
      // 실제 구현 시에는 백엔드에서 제공하는 락 획득 API 사용
      const response = await axios.post(
        `/dashboard/${dashboard.dashboard_id}/remark/lock`
      );

      setEditingRemark(true);
      message.success('메모 수정 모드가 활성화되었습니다');
      return true;
    } catch (error) {
      // 락 획득 실패 (다른 사용자가 이미 편집 중)
      if (error.response?.status === 423) {
        const lockedBy =
          error.response?.data?.detail?.locked_by || '다른 사용자';
        setRemarkLocked(true);
        setLockedBy(lockedBy);
        message.error(
          `현재 ${lockedBy}님이 메모를 수정 중입니다. 잠시 후 다시 시도해주세요.`
        );
      } else {
        message.error('메모 수정 모드 활성화에 실패했습니다');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRemarkUpdate = async () => {
    const key = MessageKeys.DASHBOARD.MEMO;
    try {
      setLoading(true);
      message.loading('메모 업데이트 중...', key);

      console.log(
        '메모 업데이트 요청:',
        dashboard.dashboard_id,
        currentDashboard.remark,
        '버전:',
        currentVersion
      );

      const updatedDashboard = await DashboardService.updateRemark(
        dashboard.dashboard_id,
        currentDashboard.remark,
        currentVersion // 낙관적 락을 위한 버전 전송
      );

      setCurrentDashboard(updatedDashboard);
      setCurrentVersion(updatedDashboard.version); // 버전 업데이트
      setEditingRemark(false);
      message.loadingToSuccess('메모가 업데이트되었습니다', key);
      onSuccess();

      // 비관적 락 해제 (가상 - 백엔드 명세에 없음)
      // 실제 구현 시에는 백엔드에서 제공하는 락 해제 API 사용
      await axios.delete(`/dashboard/${dashboard.dashboard_id}/remark/lock`);
    } catch (error) {
      console.error('메모 업데이트 실패:', error);

      // 낙관적 락 충돌 확인 - 사용자 친화적인 메시지
      if (error.response?.status === 409) {
        const errorDetail = error.response?.data?.detail;
        const newVersion = errorDetail?.current_version;

        if (newVersion) {
          antMessage.error(
            '다른 사용자가 이미 데이터를 수정했습니다. 최신 정보로 업데이트합니다.'
          );
          setCurrentVersion(newVersion);
          onSuccess();
        } else {
          message.loadingToError(
            '데이터 충돌이 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.',
            key
          );
        }
        setCurrentDashboard(dashboard); // 에러 시 원래 상태로 복구
      } else if (error.response?.status === 423) {
        // 비관적 락 충돌
        const lockedBy =
          error.response?.data?.detail?.locked_by || '다른 사용자';
        message.loadingToError(
          `현재 ${lockedBy}님이 메모를 수정 중입니다. 잠시 후 다시 시도해주세요.`,
          key
        );
        setCurrentDashboard(dashboard); // 에러 시 원래 상태로 복구
      } else {
        message.loadingToError(
          '메모 업데이트 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          key
        );
        setCurrentDashboard(dashboard); // 에러 시 원래 상태로 복구
      }
    } finally {
      setLoading(false);
    }
  };

  // 필드 업데이트 핸들러
  const handleFieldsUpdate = async () => {
    const key = 'field-update';
    try {
      const values = await form.validateFields();
      setLoading(true);
      message.loading('필드 업데이트 중...', key);

      // 버전 정보 추가
      values.version = currentVersion;

      console.log('필드 업데이트 요청:', dashboard.dashboard_id, values);

      const updatedDashboard = await DashboardService.updateFields(
        dashboard.dashboard_id,
        values
      );

      setCurrentDashboard(updatedDashboard);
      setCurrentVersion(updatedDashboard.version);
      setEditingFields(false);
      message.loadingToSuccess(
        '주문 정보가 성공적으로 업데이트되었습니다',
        key
      );
      onSuccess();
    } catch (error) {
      console.error('필드 업데이트 실패:', error);

      // 사용자 친화적인 오류 메시지 처리
      if (error.response?.status === 409) {
        // 낙관적 락 충돌
        const errorDetail = error.response?.data?.detail;
        const newVersion = errorDetail?.current_version;

        if (newVersion) {
          antMessage.error(
            '다른 사용자가 이미 주문 정보를 수정했습니다. 최신 정보로 업데이트합니다.'
          );
          setCurrentVersion(newVersion);
          setEditingFields(false);
          onSuccess();
        } else {
          message.loadingToError(
            '데이터 충돌이 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.',
            key
          );
        }
      } else if (error.response?.status === 423) {
        // 비관적 락 충돌
        const lockedBy =
          error.response?.data?.detail?.locked_by || '다른 사용자';
        message.loadingToError(
          `현재 ${lockedBy}님이 이 데이터를 수정 중입니다. 잠시 후 다시 시도해주세요.`,
          key
        );
      } else if (error.errorFields) {
        // 폼 유효성 검사 오류
        message.loadingToError(
          '입력값을 확인해주세요. 모든 필수 항목을 작성해야 합니다.',
          key
        );
      } else if (error.response?.status === 400) {
        // 데이터 유효성 검사 실패
        const errorMessage =
          error.response?.data?.detail || '입력한 정보가 유효하지 않습니다.';
        message.loadingToError(errorMessage, key);
      } else {
        message.loadingToError(
          '데이터 업데이트 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          key
        );
      }
    } finally {
      setLoading(false);
    }
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
            {renderStatusChangeButton()}
          </Space>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1200}
      bodyStyle={{
        maxHeight: 'calc(90vh - 150px)',
        overflowY: 'auto',
        padding: '24px',
      }}
    >
      {editingFields ? (
        <Form form={form} layout="vertical">
          <Row gutter={32}>
            <Col span={12}>
              <Form.Item
                name="eta"
                label="ETA"
                rules={[
                  { required: true, message: 'ETA를 선택해주세요' },
                  {
                    validator: (_, value) => {
                      if (value && value.isBefore(dayjs())) {
                        return Promise.reject(
                          '현재 시간 이후로 ETA를 설정해주세요'
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                  placeholder="도착 예정 시간 선택"
                />
              </Form.Item>

              <Form.Item
                name="postal_code"
                label="우편번호"
                rules={[
                  { required: true, message: '우편번호를 입력해주세요' },
                  {
                    pattern: /^\d{5}$/,
                    message: '5자리 숫자로 입력해주세요',
                  },
                ]}
              >
                <Input maxLength={5} placeholder="12345" />
              </Form.Item>

              <Form.Item
                name="address"
                label="주소"
                rules={[{ required: true, message: '주소를 입력해주세요' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="상세 주소를 입력하세요"
                  maxLength={200}
                  showCount
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="customer"
                label="수령인"
                rules={[
                  { required: true, message: '수령인을 입력해주세요' },
                  {
                    whitespace: true,
                    message: '공백만으로는 입력할 수 없습니다',
                  },
                  { max: 50, message: '50자를 초과할 수 없습니다' },
                ]}
              >
                <Input placeholder="수령인 이름" maxLength={50} />
              </Form.Item>

              <Form.Item
                name="contact"
                label="연락처"
                rules={[
                  { required: true, message: '연락처를 입력해주세요' },
                  {
                    pattern: /^\d{2,3}-\d{3,4}-\d{4}$/,
                    message:
                      '올바른 연락처 형식으로 입력해주세요 (예: 010-1234-5678)',
                  },
                ]}
              >
                <Input placeholder="010-1234-5678" />
              </Form.Item>

              {/* 메모 필드는 제거 (백엔드 요구사항서에 따라 별도 수정 기능 사용) */}
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: '16px' }}>
            <Space>
              <Button onClick={cancelEditingFields}>취소</Button>
              <Button
                type="primary"
                onClick={handleFieldsUpdate}
                loading={loading}
                icon={<SaveOutlined />}
              >
                저장
              </Button>
            </Space>
          </div>
        </Form>
      ) : (
        <div style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '16px',
            }}
          >
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={startEditingFields}
            >
              정보 수정
            </Button>
          </div>

          <Row gutter={32}>
            <Col span={12}>
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
            </Col>
          </Row>

          <Divider />

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
                  placeholder="메모를 입력하세요"
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
                  onClick={() =>
                    remarkLocked
                      ? message.warning(
                          `현재 ${lockedBy}님이 메모를 수정 중입니다`
                        )
                      : tryAcquireRemarkLock()
                  }
                  size="large"
                  disabled={remarkLocked}
                >
                  메모 수정
                </Button>
              </div>
            )}
          </div>

          {isAdmin && (
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                버전: {currentVersion}
              </Text>
            </div>
          )}
        </div>
      )}
    </Modal>
  );

  // 상태 변경 버튼 렌더링
  function renderStatusChangeButton() {
    const availableStatuses = getAvailableStatuses();

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
          onChange={handleStatusChange}
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
  }

  // 상태 변경 선택 처리
  function handleStatusChange(value) {
    setSelectedStatus(value);
    confirmStatusChange(value);
  }
};

export default DashboardDetailModal;

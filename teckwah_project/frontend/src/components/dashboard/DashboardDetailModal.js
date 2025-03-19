// src/components/dashboard/DashboardDetailModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Typography,
  Divider,
  Form,
  Row,
  Col,
  Button,
  Card,
  Space,
  Alert,
  Tooltip,
  Badge,
  Descriptions,
  Input,
} from 'antd';
import {
  EditOutlined,
  CloseOutlined,
  SaveOutlined,
  SyncOutlined,
  WarningOutlined,
  LockOutlined,
  UnlockOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  DEPARTMENT_TEXTS,
  TYPE_TEXTS,
  STATUS_TEXTS,
  STATUS_COLORS,
  WAREHOUSE_TEXTS,
  FONT_STYLES,
} from '../../utils/Constants';
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  formatPhoneNumber,
} from '../../utils/Formatter';
import DashboardInfoSection, {
  SectionTitle,
  InfoItem,
} from './DashboardInfoSection';
import DashboardStatusControl from './DashboardStatusControl';
import useDashboardDetail from '../../hooks/useDashboardDetail';
import { useAuth } from '../../contexts/AuthContext';
import { useLogger } from '../../utils/LogUtils';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * 개선된 대시보드 상세 정보 모달 컴포넌트
 * useDashboardDetail 커스텀 훅을 활용하여 비즈니스 로직과 UI 분리
 */
const DashboardDetailModal = ({
  visible, // 모달 표시 여부
  dashboard, // 초기 대시보드 정보
  onCancel, // 취소 콜백
  onSuccess, // 성공 콜백
  isAdmin = false, // 관리자 여부
}) => {
  const logger = useLogger('DashboardDetailModal');
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [versionAlert, setVersionAlert] = useState({
    visible: false,
    message: '',
    latestVersion: null,
  });
  const [refreshLoading, setRefreshLoading] = useState(false);

  // useDashboardDetail 커스텀 훅 사용
  const {
    // 상태
    dashboard: currentDashboard,
    loading,
    error,
    editMode,
    remarkContent,
    lockInfo,
    lockLoading,

    // 상태 설정 함수
    setRemarkContent,

    // 액션 함수
    fetchDashboardDetail,
    checkLockStatus,
    startFieldsEdit,
    startRemarkEdit,
    updateFields,
    updateRemark,
    releaseLock,
    cancelEdit,
    updateStatus,

    // 유틸리티 함수
    getLockTypeText,
  } = useDashboardDetail({
    dashboardId: dashboard?.dashboard_id,
    onSuccess: (updatedDashboard) => {
      if (onSuccess) {
        onSuccess(updatedDashboard);
      }
    },
    onError: (error) => {
      // 낙관적 락 충돌 처리 (백엔드 API가 현재 이를 지원하지 않지만 향후 확장성 고려)
      if (error.response?.status === 409) {
        setVersionAlert({
          visible: true,
          message:
            '다른 사용자가 이미 이 정보를 수정했습니다. 최신 데이터로 갱신되었습니다.',
          latestVersion:
            error.response.data?.version_info?.current_version || null,
        });
      }
    },
  });

  // 폼 초기화
  useEffect(() => {
    if (currentDashboard && editMode.fields) {
      form.setFieldsValue({
        eta: currentDashboard.eta ? dayjs(currentDashboard.eta) : null,
        customer: currentDashboard.customer || '',
        contact: currentDashboard.contact || '',
        address: currentDashboard.address || '',
        postal_code: currentDashboard.postal_code || '',
      });
    }
  }, [currentDashboard, editMode.fields, form]);

  // 최신 데이터 새로고침
  const handleRefreshData = async () => {
    try {
      setRefreshLoading(true);
      await fetchDashboardDetail();
    } finally {
      setRefreshLoading(false);
    }
  };

  // 필드 저장 핸들러
  const handleSaveFields = async () => {
    try {
      const values = await form.validateFields();
      await updateFields(values);
    } catch (error) {
      logger.error('필드 저장 실패:', error);
    }
  };

  // 관리자 전용: 강제 락 해제
  const handleForceUnlock = async () => {
    if (!isAdmin) return;

    try {
      logger.info(`강제 락 해제 요청: ID=${currentDashboard?.dashboard_id}`);
      // 현재는 백엔드 API가 이 기능을 지원하지 않음 - 향후 구현 예정

      // API 지원 시 아래 코드 활성화:
      // await LockService.forceReleaseLock(currentDashboard.dashboard_id);

      // 데이터 새로고침
      await fetchDashboardDetail();
    } catch (error) {
      logger.error('강제 락 해제 실패:', error);
    }
  };

  // 모달 취소 핸들러
  const handleModalCancel = async () => {
    // 변경 사항이 있는 경우 확인 요청
    if (editMode.fields || editMode.remark) {
      const confirmed = window.confirm(
        '저장되지 않은 변경 사항이 있습니다. 정말 닫으시겠습니까?'
      );
      if (!confirmed) return;

      // 편집 취소 및 락 해제
      await cancelEdit();
    }

    if (onCancel) {
      onCancel();
    }
  };

  // 버전 충돌 알림 렌더링
  const renderVersionAlert = () => {
    if (!versionAlert.visible) return null;

    return (
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="데이터 버전 충돌"
        description={
          <>
            <Paragraph>{versionAlert.message}</Paragraph>
            {versionAlert.latestVersion && (
              <Paragraph>
                <Text strong>현재 버전: {versionAlert.latestVersion}</Text>
              </Paragraph>
            )}
          </>
        }
        action={
          <Button
            size="small"
            onClick={() =>
              setVersionAlert({
                visible: false,
                message: '',
                latestVersion: null,
              })
            }
          >
            확인
          </Button>
        }
        style={{ marginBottom: 16 }}
      />
    );
  };

  // 락 정보 알림 렌더링
  const renderLockInfo = () => {
    if (!lockInfo) return null;

    const lockTypeText = getLockTypeText(lockInfo.lock_type);
    const expiresAt = lockInfo.expires_at ? dayjs(lockInfo.expires_at) : null;
    const timeRemaining = expiresAt ? expiresAt.diff(dayjs(), 'minute') : 0;

    return (
      <Alert
        type="info"
        showIcon
        icon={<LockOutlined />}
        message="편집 세션 정보"
        description={
          <>
            <Paragraph>
              <Text>
                현재 <Text strong>{lockInfo.locked_by}</Text>님이 {lockTypeText}{' '}
                작업 중입니다.
              </Text>
            </Paragraph>
            {expiresAt && (
              <Paragraph>
                <Text>
                  세션 만료: {expiresAt.format('HH:mm:ss')} (남은 시간: 약{' '}
                  {timeRemaining}분)
                </Text>
              </Paragraph>
            )}
          </>
        }
        style={{ marginBottom: 16 }}
      />
    );
  };

  // 관리자 제어판 렌더링
  const renderAdminControls = () => {
    if (!isAdmin) return null;

    return (
      <Card
        size="small"
        title={<Text strong>관리자 제어판</Text>}
        extra={
          <Text type="secondary">버전: {currentDashboard?.version || 1}</Text>
        }
        style={{ marginTop: 16, backgroundColor: '#fffbe6', marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space wrap>
            <Tooltip title="모든 편집 락 강제 해제">
              <Button
                icon={<UnlockOutlined />}
                onClick={handleForceUnlock}
                danger
              >
                강제 락 해제
              </Button>
            </Tooltip>

            <Tooltip title="최신 데이터로 새로고침">
              <Button
                icon={<SyncOutlined spin={refreshLoading} />}
                onClick={handleRefreshData}
                loading={refreshLoading}
              >
                데이터 새로고침
              </Button>
            </Tooltip>

            <Tooltip title="마지막 업데이트: ">
              <Text type="secondary">
                마지막 갱신: {dayjs().format('HH:mm:ss')}
              </Text>
            </Tooltip>
          </Space>

          {lockInfo && (
            <Descriptions
              size="small"
              bordered
              column={1}
              style={{ marginTop: 8 }}
            >
              <Descriptions.Item label="락 소유자">
                {lockInfo.locked_by}
              </Descriptions.Item>
              <Descriptions.Item label="락 타입">
                {getLockTypeText(lockInfo.lock_type)}
              </Descriptions.Item>
              <Descriptions.Item label="만료 시간">
                {lockInfo.expires_at
                  ? dayjs(lockInfo.expires_at).format('HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Space>
      </Card>
    );
  };

  // 메모 섹션 렌더링
  const renderRemarkSection = () => {
    if (editMode.remark) {
      return (
        <div style={{ marginTop: 24 }}>
          <SectionTitle>메모 편집</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <TextArea
              value={remarkContent}
              onChange={(e) => setRemarkContent(e.target.value)}
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
                icon={<SaveOutlined />}
                onClick={updateRemark}
                loading={loading}
                size="large"
              >
                저장
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={cancelEdit}
                size="large"
                disabled={loading}
              >
                취소
              </Button>
            </Space>
          </div>
        </div>
      );
    }

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
          <SectionTitle>메모</SectionTitle>
          <Button
            icon={<EditOutlined />}
            onClick={startRemarkEdit}
            size="middle"
            loading={lockLoading}
            disabled={editMode.fields}
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
          {currentDashboard?.remarks &&
          currentDashboard.remarks.length > 0 &&
          currentDashboard.remarks[0].content
            ? currentDashboard.remarks[0].content
            : '메모 없음'}
        </div>
      </div>
    );
  };

  // 편집 폼 렌더링
  const renderEditForm = () => {
    return (
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

            <div style={{ marginTop: '20px', color: '#666', fontSize: '13px' }}>
              * 메모는 별도의 '메모 편집' 버튼을 통해서만 수정할 수 있습니다.
            </div>
          </Col>
        </Row>

        <div style={{ textAlign: 'right', marginTop: '16px' }}>
          <Space>
            <Button onClick={cancelEdit} icon={<CloseOutlined />}>
              취소
            </Button>
            <Button
              type="primary"
              onClick={handleSaveFields}
              loading={loading}
              icon={<SaveOutlined />}
            >
              저장
            </Button>
          </Space>
        </div>
      </Form>
    );
  };

  // 정보 섹션 데이터 구성
  const getInfoSections = () => {
    if (!currentDashboard) return {};

    return {
      basicInfoItems: [
        { label: '부서', value: DEPARTMENT_TEXTS[currentDashboard.department] },
        { label: '종류', value: TYPE_TEXTS[currentDashboard.type] },
        {
          label: '출발 허브',
          value: WAREHOUSE_TEXTS[currentDashboard.warehouse],
        },
        { label: 'SLA', value: currentDashboard.sla },
      ],
      timeInfoItems: [
        {
          label: '접수 시각',
          value: formatDateTime(currentDashboard.create_time),
        },
        {
          label: '출발 시각',
          value: formatDateTime(currentDashboard.depart_time),
        },
        {
          label: '완료 시각',
          value: formatDateTime(currentDashboard.complete_time),
        },
        {
          label: 'ETA',
          value: formatDateTime(currentDashboard.eta),
          highlight: true,
        },
      ],
      driverInfoItems: [
        {
          label: '담당 기사',
          value: currentDashboard.driver_name,
          highlight: true,
        },
        {
          label: '기사 연락처',
          value: formatPhoneNumber(currentDashboard.driver_contact),
        },
      ],
      deliveryInfoItems: [
        { label: '주소', value: currentDashboard.address },
        {
          label: '예상 거리',
          value: formatDistance(currentDashboard.distance),
        },
        {
          label: '예상 소요시간',
          value: formatDuration(currentDashboard.duration_time),
        },
      ],
      receiverInfoItems: [
        { label: '수령인', value: currentDashboard.customer },
        { label: '연락처', value: formatPhoneNumber(currentDashboard.contact) },
      ],
    };
  };

  // 메인 렌더링
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
          <div>
            <Text style={{ ...FONT_STYLES.TITLE.MEDIUM, marginRight: '12px' }}>
              주문번호: {currentDashboard?.order_no}
            </Text>
            <Badge
              count={STATUS_TEXTS[currentDashboard?.status]}
              style={{
                backgroundColor:
                  currentDashboard?.status === 'WAITING'
                    ? '#1890ff'
                    : currentDashboard?.status === 'IN_PROGRESS'
                    ? '#faad14'
                    : currentDashboard?.status === 'COMPLETE'
                    ? '#52c41a'
                    : currentDashboard?.status === 'ISSUE'
                    ? '#f5222d'
                    : '#d9d9d9',
              }}
            />
          </div>
          {!editMode.fields && currentDashboard && (
            <DashboardStatusControl
              dashboard={currentDashboard}
              onStatusChange={updateStatus}
              isAdmin={isAdmin}
            />
          )}
        </div>
      }
      open={visible}
      onCancel={handleModalCancel}
      footer={null}
      width={1200}
      bodyStyle={{
        maxHeight: 'calc(90vh - 150px)',
        overflowY: 'auto',
        padding: '24px',
      }}
      maskClosable={!editMode.fields && !editMode.remark}
      closable={!editMode.fields && !editMode.remark}
      destroyOnClose={true}
    >
      {/* 버전 충돌 알림 */}
      {renderVersionAlert()}

      {/* 락 정보 알림 */}
      {lockInfo && renderLockInfo()}

      {/* 관리자 제어판 */}
      {isAdmin && renderAdminControls()}

      {/* 로딩/에러 상태 표시 */}
      {loading && !currentDashboard && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin tip="데이터를 불러오는 중..." />
        </div>
      )}

      {error && (
        <Alert
          message="데이터 로드 오류"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 편집 모드 */}
      {currentDashboard && editMode.fields
        ? renderEditForm()
        : currentDashboard && (
            <div style={{ padding: '0' }}>
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
                  onClick={startFieldsEdit}
                  loading={lockLoading}
                  disabled={editMode.remark}
                >
                  정보 수정
                </Button>
              </div>

              <Row gutter={32}>
                <Col span={12}>
                  <DashboardInfoSection
                    title="기본 정보"
                    items={getInfoSections().basicInfoItems}
                  />
                  <DashboardInfoSection
                    title="배송 시간"
                    items={getInfoSections().timeInfoItems}
                  />
                </Col>

                <Col span={12}>
                  <DashboardInfoSection
                    title="배송 담당자"
                    items={getInfoSections().driverInfoItems}
                  />
                  <DashboardInfoSection
                    title="배송 세부사항"
                    items={getInfoSections().deliveryInfoItems}
                  />
                  <DashboardInfoSection
                    title="수령인 정보"
                    items={getInfoSections().receiverInfoItems}
                  />
                </Col>
              </Row>

              <Divider />

              {/* 메모 섹션 */}
              {renderRemarkSection()}
            </div>
          )}
    </Modal>
  );
};

export default DashboardDetailModal;

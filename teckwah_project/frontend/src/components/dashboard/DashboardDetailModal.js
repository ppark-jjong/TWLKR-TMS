// src/components/dashboard/DashboardDetailModal.js

import React, { Suspense } from 'react';
import {
  Modal,
  Typography,
  Divider,
  Row,
  Col,
  Button,
  Badge,
  Spin,
  Alert,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { STATUS_TEXTS, STATUS_COLORS } from '../../utils/Constants';
import DashboardInfoSection from './DashboardInfoSection';
import DashboardStatusControl from './DashboardStatusControl';
import useDashboardDetail from '../../hooks/useDashboardDetail';
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  formatPhoneNumber,
} from '../../utils/Formatter';

const { Text } = Typography;

// 지연 로딩 폴백 컴포넌트
const DetailFallback = () => (
  <div style={{ textAlign: 'center', padding: '20px' }}>
    <Spin tip="상세 정보 로딩 중..." />
  </div>
);

/**
 * 개선된 대시보드 상세 정보 모달 컴포넌트
 * 커스텀 훅을 사용하여 로직 분리
 */
const DashboardDetailModal = ({
  visible,
  dashboard,
  onCancel,
  onSuccess,
  isAdmin = false,
}) => {
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
    startFieldsEdit,
    startRemarkEdit,
    updateFields,
    updateRemark,
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
  });

  // 모달 취소 핸들러
  const handleModalCancel = async () => {
    if (editMode.fields || editMode.remark) {
      const confirmed = window.confirm(
        '저장되지 않은 변경 사항이 있습니다. 정말 닫으시겠습니까?'
      );
      if (!confirmed) return;

      await cancelEdit();
    }

    if (onCancel) {
      onCancel();
    }
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
        message="편집 세션 정보"
        description={
          <>
            <Text>
              현재 <Text strong>{lockInfo.locked_by}</Text>님이 {lockTypeText}{' '}
              작업 중입니다.
            </Text>
            {expiresAt && (
              <div>
                <Text>
                  세션 만료: {expiresAt.format('HH:mm:ss')} (남은 시간: 약{' '}
                  {timeRemaining}분)
                </Text>
              </div>
            )}
          </>
        }
        style={{ marginBottom: 16 }}
      />
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
                onClick={updateRemark}
                loading={loading}
                size="large"
              >
                저장
              </Button>
              <Button onClick={cancelEdit} size="large" disabled={loading}>
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
            <Text style={{ marginRight: '12px' }}>
              주문번호: {currentDashboard?.order_no}
            </Text>
            <Badge
              count={STATUS_TEXTS[currentDashboard?.status]}
              style={{
                backgroundColor:
                  STATUS_COLORS[currentDashboard?.status] || '#d9d9d9',
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
      {/* 락 정보 알림 */}
      {lockInfo && renderLockInfo()}

      {/* 로딩/에러 상태 표시 */}
      {loading && !currentDashboard && <DetailFallback />}

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
      {currentDashboard && (
        <Suspense fallback={<DetailFallback />}>
          {editMode.fields ? (
            <DashboardEditForm
              dashboard={currentDashboard}
              onSave={updateFields}
              onCancel={cancelEdit}
              loading={loading}
            />
          ) : (
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
        </Suspense>
      )}
    </Modal>
  );
};

export default DashboardDetailModal;

// src/components/dashboard/DashboardDetailModal.js
import React, { Suspense, useState, useEffect, useCallback } from "react";
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
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { STATUS_TEXTS, STATUS_COLORS } from "../../utils/Constants";
import useDashboardDetail from "../../hooks/useDashboardDetail";
import { useLogger } from "../../utils/LogUtils";

// 모듈화를 위한 컴포넌트 분리 - 상세 정보 섹션별 컴포넌트 임포트
import { DashboardInfoSection } from "./detail/InfoSections";
import { LockInfoDisplay } from "./detail/LockInfoDisplay";
import { RemarkSection } from "./detail/RemarkSection";
import { DashboardStatusControl } from "./detail/StatusControl";
import { DashboardEditForm } from "./detail/DashboardEditForm";

const { Text } = Typography;

// 지연 로딩 폴백 컴포넌트
const DetailFallback = () => (
  <div style={{ textAlign: "center", padding: "20px" }}>
    <Spin tip="상세 정보 로딩 중..." />
  </div>
);

/**
 * 개선된 대시보드 상세 정보 모달 컴포넌트
 * 컴포넌트 책임 분리 및 성능 최적화
 */
const DashboardDetailModal = ({
  visible,
  dashboard,
  onCancel,
  onSuccess,
  isAdmin = false,
}) => {
  const logger = useLogger("DashboardDetailModal");

  // useDashboardDetail 커스텀 훅 사용으로 비즈니스 로직 분리
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

  // 모달 취소 핸들러 - 메모이제이션 적용
  const handleModalCancel = useCallback(async () => {
    if (editMode.fields || editMode.remark) {
      const confirmed = window.confirm(
        "저장되지 않은 변경 사항이 있습니다. 정말 닫으시겠습니까?"
      );
      if (!confirmed) return;

      await cancelEdit();
    }

    if (onCancel) {
      onCancel();
    }
  }, [editMode.fields, editMode.remark, cancelEdit, onCancel]);

  // 초기 데이터 로드 및 정리
  useEffect(() => {
    if (visible && dashboard?.dashboard_id) {
      fetchDashboardDetail();
    }

    return () => {
      // 컴포넌트 언마운트 시 락 정리는 useDashboardDetail 내부에서 처리
    };
  }, [visible, dashboard, fetchDashboardDetail]);

  // 정보 섹션 데이터 구성 - 메모이제이션 적용
  const infoSections = useMemo(() => {
    if (!currentDashboard) return {};

    return {
      basicInfoItems: [
        { label: "부서", value: DEPARTMENT_TEXTS[currentDashboard.department] },
        { label: "종류", value: TYPE_TEXTS[currentDashboard.type] },
        {
          label: "출발 허브",
          value: WAREHOUSE_TEXTS[currentDashboard.warehouse],
        },
        { label: "SLA", value: currentDashboard.sla },
      ],
      timeInfoItems: [
        {
          label: "접수 시각",
          value: formatDateTime(currentDashboard.create_time),
        },
        {
          label: "출발 시각",
          value: formatDateTime(currentDashboard.depart_time),
        },
        {
          label: "완료 시각",
          value: formatDateTime(currentDashboard.complete_time),
        },
        {
          label: "ETA",
          value: formatDateTime(currentDashboard.eta),
          highlight: true,
        },
      ],
      driverInfoItems: [
        {
          label: "담당 기사",
          value: currentDashboard.driver_name,
          highlight: true,
        },
        {
          label: "기사 연락처",
          value: formatPhoneNumber(currentDashboard.driver_contact),
        },
      ],
      deliveryInfoItems: [
        { label: "주소", value: currentDashboard.address },
        {
          label: "예상 거리",
          value: formatDistance(currentDashboard.distance),
        },
        {
          label: "예상 소요시간",
          value: formatDuration(currentDashboard.duration_time),
        },
      ],
      receiverInfoItems: [
        { label: "수령인", value: currentDashboard.customer },
        { label: "연락처", value: formatPhoneNumber(currentDashboard.contact) },
      ],
    };
  }, [currentDashboard]);

  // 메인 콘텐츠 렌더링 - 조건부 렌더링 최적화
  const renderContent = () => {
    // 로딩 상태
    if (loading && !currentDashboard) {
      return <DetailFallback />;
    }

    // 에러 상태
    if (error) {
      return (
        <Alert
          message="데이터 로드 오류"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: "16px" }}
        />
      );
    }

    // 데이터 없음
    if (!currentDashboard) {
      return (
        <Alert message="데이터를 찾을 수 없습니다" type="warning" showIcon />
      );
    }

    // 편집 모드
    if (editMode.fields) {
      return (
        <DashboardEditForm
          dashboard={currentDashboard}
          onSave={updateFields}
          onCancel={cancelEdit}
          loading={loading}
        />
      );
    }

    // 조회 모드
    return (
      <div style={{ padding: "0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "16px",
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
              items={infoSections.basicInfoItems}
            />
            <DashboardInfoSection
              title="배송 시간"
              items={infoSections.timeInfoItems}
            />
          </Col>

          <Col span={12}>
            <DashboardInfoSection
              title="배송 담당자"
              items={infoSections.driverInfoItems}
            />
            <DashboardInfoSection
              title="배송 세부사항"
              items={infoSections.deliveryInfoItems}
            />
            <DashboardInfoSection
              title="수령인 정보"
              items={infoSections.receiverInfoItems}
            />
          </Col>
        </Row>

        <Divider />

        {/* 메모 섹션 - 별도 컴포넌트로 추출 */}
        <RemarkSection
          editMode={editMode.remark}
          dashboard={currentDashboard}
          remarkContent={remarkContent}
          onRemarkContentChange={setRemarkContent}
          onEditStart={startRemarkEdit}
          onSave={updateRemark}
          onCancel={cancelEdit}
          loading={loading}
          lockLoading={lockLoading}
        />
      </div>
    );
  };

  return (
    <Modal
      title={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 0",
            marginRight: "48px",
          }}
        >
          <div>
            <Text style={{ marginRight: "12px" }}>
              주문번호: {currentDashboard?.order_no}
            </Text>
            <Badge
              count={STATUS_TEXTS[currentDashboard?.status]}
              style={{
                backgroundColor:
                  STATUS_COLORS[currentDashboard?.status] || "#d9d9d9",
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
        maxHeight: "calc(90vh - 150px)",
        overflowY: "auto",
        padding: "24px",
      }}
      maskClosable={!editMode.fields && !editMode.remark}
      closable={!editMode.fields && !editMode.remark}
      destroyOnClose={true}
    >
      {/* 락 정보 알림 */}
      {lockInfo && (
        <LockInfoDisplay
          lockInfo={lockInfo}
          getLockTypeText={getLockTypeText}
        />
      )}

      {/* 메인 콘텐츠 */}
      <Suspense fallback={<DetailFallback />}>{renderContent()}</Suspense>
    </Modal>
  );
};

export default React.memo(DashboardDetailModal);

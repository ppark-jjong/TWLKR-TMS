// src/components/dashboard/DashboardDetailModal.js
import React, { useState, useEffect } from 'react';
import { Modal, Typography, Divider, Form, Row, Col, Button } from 'antd';
import EditOutlined from '@ant-design/icons/EditOutlined';
import dayjs from 'dayjs';
import {
  DEPARTMENT_TEXTS,
  TYPE_TEXTS,
  WAREHOUSE_TEXTS,
  FONT_STYLES,
} from '../../utils/Constants';
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  formatPhoneNumber,
} from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';
import useAsync from '../../hooks/useAsync';
import useForm from '../../hooks/useForm';
import DashboardInfoSection, {
  SectionTitle,
  InfoItem,
} from './DashboardInfoSection';
import DashboardStatusControl from './DashboardStatusControl';
import DashboardDetailForm from './DashboardDetailForm';
import DashboardRemarkEditor from './DashboardRemarkEditor';
import { MessageKeys } from '../../utils/message';

const { Text } = Typography;

/**
 * 리팩토링된 대시보드 상세 정보 모달
 * 컴포넌트 분리와 커스텀 훅 활용으로 로직 단순화
 */
const DashboardDetailModal = ({
  visible,
  dashboard,
  onCancel,
  onSuccess,
  isAdmin,
}) => {
  const [form] = Form.useForm();
  const [editingFields, setEditingFields] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState(dashboard);

  // 낙관적 락을 위한 버전 관리
  const [currentVersion, setCurrentVersion] = useState(dashboard?.version || 1);

  // 필드 업데이트를 위한 비동기 처리
  const { loading: updateLoading, execute: updateFields } = useAsync(
    DashboardService.updateFields,
    {
      messageKey: MessageKeys.DASHBOARD.UPDATE,
      loadingMessage: '필드 업데이트 중...',
      successMessage: '주문 정보가 성공적으로 업데이트되었습니다',
      errorMessage: '데이터 업데이트 중 오류가 발생했습니다',
      onSuccess: (updatedDashboard) => {
        setCurrentDashboard(updatedDashboard);
        setCurrentVersion(updatedDashboard.version);
        setEditingFields(false);
        if (onSuccess) {
          onSuccess();
        }
      },
    }
  );

  // 컴포넌트 마운트 또는 dashboard 변경 시 초기화
  useEffect(() => {
    if (dashboard) {
      setCurrentDashboard(dashboard);
      setCurrentVersion(dashboard.version || 1);
      initFieldsForm();
    }
  }, [dashboard]);

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

    // 명시적인 문자열 타입 확인 및 공백 검사
    const hasDriverName =
      typeof currentDashboard.driver_name === 'string' &&
      currentDashboard.driver_name.trim() !== '';

    const hasDriverContact =
      typeof currentDashboard.driver_contact === 'string' &&
      currentDashboard.driver_contact.trim() !== '';

    return hasDriverName && hasDriverContact;
  };

  // 필드 편집 시작
  const startEditingFields = () => {
    initFieldsForm();
    setEditingFields(true);
  };

  // 필드 편집 취소
  const cancelEditingFields = () => {
    setEditingFields(false);
    form.resetFields();
  };

  // 필드 저장 핸들러
  const handleFieldsUpdate = async () => {
    try {
      // 폼 유효성 검증
      const values = await form.validateFields();

      // 필드 업데이트 데이터 준비
      const fieldsData = {
        eta: values.eta,
        customer: values.customer,
        contact: values.contact,
        address: values.address,
        postal_code: values.postal_code,
      };

      // 업데이트 API 호출
      await updateFields(dashboard.dashboard_id, fieldsData);
    } catch (error) {
      // 폼 유효성 검증 실패는 여기서 자동 처리됨
      console.error('필드 검증 실패:', error);
    }
  };

  // 상태 변경 핸들러
  const handleStatusChange = (updatedDashboard) => {
    setCurrentDashboard(updatedDashboard);
    setCurrentVersion(updatedDashboard.version);
    if (onSuccess) {
      onSuccess();
    }
  };

  // 메모 업데이트 핸들러
  const handleRemarkUpdate = (updatedDashboard) => {
    setCurrentDashboard(updatedDashboard);
    setCurrentVersion(updatedDashboard.version);
    if (onSuccess) {
      onSuccess();
    }
  };

  // 정보 섹션 데이터 구성
  const basicInfoItems = [
    { label: '부서', value: DEPARTMENT_TEXTS[currentDashboard.department] },
    { label: '종류', value: TYPE_TEXTS[currentDashboard.type] },
    { label: '출발 허브', value: WAREHOUSE_TEXTS[currentDashboard.warehouse] },
    { label: 'SLA', value: currentDashboard.sla },
  ];

  const timeInfoItems = [
    { label: '접수 시각', value: formatDateTime(currentDashboard.create_time) },
    { label: '출발 시각', value: formatDateTime(currentDashboard.depart_time) },
    {
      label: '완료 시각',
      value: formatDateTime(currentDashboard.complete_time),
    },
    {
      label: 'ETA',
      value: formatDateTime(currentDashboard.eta),
      highlight: true,
    },
  ];

  const driverInfoItems = [
    {
      label: '담당 기사',
      value: currentDashboard.driver_name,
      highlight: true,
    },
    {
      label: '기사 연락처',
      value: formatPhoneNumber(currentDashboard.driver_contact),
    },
  ];

  const deliveryInfoItems = [
    { label: '주소', value: currentDashboard.address },
    { label: '예상 거리', value: formatDistance(currentDashboard.distance) },
    {
      label: '예상 소요시간',
      value: formatDuration(currentDashboard.duration_time),
    },
  ];

  const receiverInfoItems = [
    { label: '수령인', value: currentDashboard.customer },
    { label: '연락처', value: formatPhoneNumber(currentDashboard.contact) },
  ];

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
            주문번호: {currentDashboard.order_no}
          </Text>
          <DashboardStatusControl
            dashboard={currentDashboard}
            onStatusChange={handleStatusChange}
            isAdmin={isAdmin}
            canChangeStatus={canChangeStatus()}
          />
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
        <DashboardDetailForm
          form={form}
          loading={updateLoading}
          onSave={handleFieldsUpdate}
          onCancel={cancelEditingFields}
        />
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
              <DashboardInfoSection title="기본 정보" items={basicInfoItems} />
              <DashboardInfoSection title="배송 시간" items={timeInfoItems} />
            </Col>

            <Col span={12}>
              <DashboardInfoSection
                title="배송 담당자"
                items={driverInfoItems}
              />
              <DashboardInfoSection
                title="배송 세부사항"
                items={deliveryInfoItems}
              />
              <DashboardInfoSection
                title="수령인 정보"
                items={receiverInfoItems}
              />
            </Col>
          </Row>

          <Divider />

          {/* 메모 섹션 - 별도 컴포넌트로 분리 */}
          <DashboardRemarkEditor
            dashboard={currentDashboard}
            onUpdate={handleRemarkUpdate}
          />

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
};

export default DashboardDetailModal;

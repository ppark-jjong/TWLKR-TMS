// src/components/dashboard/AssignDriverModal.js
import React from 'react';
import { Form, Input, Typography, Space } from 'antd';
import { formatPhoneNumber } from '../../utils/Formatter';
import { FONT_STYLES } from '../../utils/Constants';
import DashboardService from '../../services/DashboardService';
import { validateAssignmentForm } from '../../utils/validator';
import { MessageKeys } from '../../utils/message';
import BaseModal from '../common/BaseModal';
import useForm from '../../hooks/useForm';

const { Text } = Typography;

/**
 * 배차 처리 모달 컴포넌트
 * 관리자/일반 사용자 모두 사용 가능
 * 권한별 제약은 상위 컴포넌트(DashboardPage)에서 처리
 */
const AssignDriverModal = ({ visible, onCancel, onSuccess, selectedRows }) => {
  // 폼 관련 상태 및 함수
  const { form, loading, submitForm } = useForm({
    onSubmit: async (values) => {
      // 선택된 대시보드 ID 추출
      const dashboardIds = selectedRows.map((row) => row.dashboard_id);

      console.log('배차 처리 요청:', {
        dashboard_ids: dashboardIds,
        driver_name: values.driver_name,
        driver_contact: values.driver_contact,
      });

      // DashboardService의 배차 처리 API 호출
      return await DashboardService.assignDriver({
        dashboard_ids: dashboardIds,
        driver_name: values.driver_name,
        driver_contact: values.driver_contact,
      });
    },
    validate: validateAssignmentForm,
    messageKey: MessageKeys.DASHBOARD.ASSIGN,
    loadingMessage: '배차 처리 중...',
    successMessage: '배차가 완료되었습니다',
    errorMessage: '배차 처리 중 오류가 발생했습니다',
    onSuccess: () => {
      form.resetFields();
      onSuccess();
    },
  });

  // 연락처 포맷팅 처리
  const handlePhoneChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setFieldsValue({ driver_contact: formattedNumber });
  };

  return (
    <BaseModal
      title="배차 정보 입력"
      subTitle={`선택된 주문: ${selectedRows.length}건`}
      visible={visible}
      onCancel={onCancel}
      onOk={submitForm}
      confirmLoading={loading}
      maskClosable={false}
      width={600}
    >
      <div
        style={{
          marginBottom: 16,
          padding: '12px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}
      >
        <Text
          strong
          style={{
            ...FONT_STYLES.BODY.MEDIUM,
            display: 'block',
            marginBottom: '8px',
          }}
        >
          선택된 주문번호:
        </Text>
        <div
          style={{
            maxHeight: '100px',
            overflowY: 'auto',
            ...FONT_STYLES.BODY.MEDIUM,
          }}
        >
          {selectedRows.map((row) => row.order_no).join(', ')}
        </div>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="driver_name"
          label={<span style={FONT_STYLES.LABEL}>배송 담당</span>}
          rules={[
            { required: true, message: '배송 담당자를 입력해주세요' },
            { whitespace: true, message: '공백만으로는 입력할 수 없습니다' },
            { max: 50, message: '50자를 초과할 수 없습니다' },
          ]}
        >
          <Input
            placeholder="배송 담당자 이름"
            maxLength={50}
            style={FONT_STYLES.BODY.MEDIUM}
          />
        </Form.Item>

        <Form.Item
          name="driver_contact"
          label={<span style={FONT_STYLES.LABEL}>배송 담당 연락처</span>}
          rules={[
            { required: true, message: '연락처를 입력해주세요' },
            {
              pattern: /^\d{2,3}-\d{3,4}-\d{4}$/,
              message:
                '올바른 연락처 형식으로 입력해주세요 (예: 010-1234-5678)',
            },
          ]}
        >
          <Input
            onChange={handlePhoneChange}
            placeholder="010-1234-5678"
            maxLength={13}
            style={FONT_STYLES.BODY.MEDIUM}
          />
        </Form.Item>
      </Form>
    </BaseModal>
  );
};

export default AssignDriverModal;

// frontend/src/components/dashboard/AssignDriverModal.js (Updated)
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Typography,
  Space,
  message as antMessage,
} from 'antd';
import { formatPhoneNumber } from '../../utils/Formatter';
import { FONT_STYLES } from '../../utils/Constants';
import DashboardService from '../../services/DashboardService';
import { validateAssignmentForm } from '../../utils/validator';
import message, { MessageKeys, MessageTemplates } from '../../utils/message';

const { Text } = Typography;

const AssignDriverModal = ({ visible, onCancel, onSuccess, selectedRows }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // 낙관적 락을 위한 버전 정보 수집
  useEffect(() => {
    if (visible && selectedRows.length > 0) {
      // 각 대시보드 ID별 버전 정보 수집
      const versions = {};
      selectedRows.forEach((row) => {
        versions[row.dashboard_id] = row.version || 1;
      });
      // 폼에 버전 정보 설정 (내부적으로만 사용)
      form.setFieldsValue({ versions });
    }
  }, [visible, selectedRows, form]);

  // 연락처 포맷팅 처리
  const handlePhoneChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setFieldsValue({ driver_contact: formattedNumber });
  };

  const handleSubmit = async () => {
    const key = MessageKeys.DASHBOARD.ASSIGN;
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      message.loading('배차 처리 중...', key);

      // 추가 유효성 검증
      const errors = validateAssignmentForm(values);
      if (Object.keys(errors).length > 0) {
        form.setFields(
          Object.entries(errors).map(([name, error]) => ({
            name,
            errors: error ? [error] : [],
          }))
        );
        message.loadingToError('입력 정보를 확인해주세요', key);
        setSubmitting(false);
        return;
      }

      // 선택된 대시보드 ID 추출
      const dashboardIds = selectedRows.map((row) => row.dashboard_id);
      console.log('배차 처리 요청:', {
        dashboard_ids: dashboardIds,
        driver_name: values.driver_name,
        driver_contact: values.driver_contact,
        versions: values.versions, // 낙관적 락을 위한 버전 정보
      });

      await DashboardService.assignDriver({
        dashboard_ids: dashboardIds,
        driver_name: values.driver_name,
        driver_contact: values.driver_contact,
        versions: values.versions, // 낙관적 락을 위한 버전 정보
      });

      message.loadingToSuccess('배차가 완료되었습니다', key);
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('배차 처리 실패:', error);

      // 낙관적 락 충돌 확인
      if (error.response?.status === 409) {
        antMessage.error(
          '다른 사용자가 이미 데이터를 수정했습니다. 최신 정보를 확인 후 다시 시도해주세요.'
        );
        // 부모 컴포넌트에 알림 (데이터 리로드 유도)
        onSuccess();
      } else {
        const errorMessage =
          error.response?.data?.detail || '배차 처리 중 오류가 발생했습니다';
        message.loadingToError(errorMessage, key);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space direction="vertical" size={4}>
          <Text strong style={FONT_STYLES.TITLE.MEDIUM}>
            배차 정보 입력
          </Text>
          <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
            선택된 주문: {selectedRows.length}건
          </Text>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
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

        {/* 버전 정보는 숨겨진 필드로 관리 */}
        <Form.Item name="versions" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignDriverModal;

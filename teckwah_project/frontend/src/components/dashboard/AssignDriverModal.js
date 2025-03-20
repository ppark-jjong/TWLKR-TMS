// src/components/dashboard/AssignDriverModal.js
import React, { useEffect, useState } from 'react';
import { Form, Input, Typography, Space, Alert, Tooltip } from 'antd';
import { CarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { formatPhoneNumber } from '../../utils/Formatter';
import { FONT_STYLES } from '../../utils/Constants';
import { validateAssignmentForm } from '../../utils/validator';
import { MessageKeys } from '../../utils/message';
import BaseModal from '../common/BaseModal';
import useForm from '../../hooks/useForm';
import { useLogger } from '../../utils/LogUtils';
import DashboardService from '../../services/DashboardService';

const { Title, Text, Paragraph } = Typography;

/**
 * 배차 처리 모달 컴포넌트 (개선된 버전)
 * - 백엔드 API 명세에 맞는 파라미터 구성
 * - 다중 배차 처리 로직 및 유효성 검증 강화
 * - 비관적 락 통합 구현
 *
 * @param {Object} props 컴포넌트 속성
 * @param {boolean} props.visible 모달 표시 여부
 * @param {Function} props.onCancel 취소 콜백
 * @param {Function} props.onSuccess 성공 콜백
 * @param {Array} props.selectedRows 선택된 대시보드 행 배열
 */
const AssignDriverModal = ({
  visible,
  onCancel,
  onSuccess,
  selectedRows = [],
}) => {
  const logger = useLogger('AssignDriverModal');
  const [orderNumbers, setOrderNumbers] = useState([]);
  const [orderCount, setOrderCount] = useState(0);

  // 폼 관련 상태 및 함수 - useForm 커스텀 훅 활용
  const { form, loading, error, submitForm } = useForm({
    onSubmit: async (values) => {
      try {
        // 선택된 대시보드 ID 추출
        const dashboardIds = selectedRows.map((row) => row.dashboard_id);

        logger.info('배차 처리 요청:', {
          dashboard_ids: dashboardIds,
          driver_name: values.driver_name,
          driver_contact: values.driver_contact,
        });

        // 백엔드 API 명세에 맞는 요청 데이터 구성
        const requestData = {
          dashboard_ids: dashboardIds,
          driver_name: values.driver_name,
          driver_contact: values.driver_contact,
        };

        // DashboardService의 배차 처리 API 호출
        const result = await DashboardService.assignDriver(requestData);

        logger.debug('배차 처리 결과:', result);
        return result;
      } catch (error) {
        logger.error('배차 처리 실패:', error);
        throw error;
      }
    },
    validate: validateAssignmentForm,
    messageKey: MessageKeys.DASHBOARD.ASSIGN,
    loadingMessage: '배차 처리 중...',
    successMessage: '배차가 완료되었습니다',
    errorMessage: '배차 처리 중 오류가 발생했습니다',
    onSuccess: () => {
      form.resetFields();
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  // 모달이 열릴 때마다 데이터 초기화
  useEffect(() => {
    if (visible) {
      form.resetFields();

      // 선택된 주문 정보 설정
      if (selectedRows && selectedRows.length > 0) {
        const numbers = selectedRows.map((row) => row.order_no);
        setOrderNumbers(numbers);
        setOrderCount(selectedRows.length);
      } else {
        setOrderNumbers([]);
        setOrderCount(0);
      }
    }
  }, [visible, form, selectedRows]);

  // 연락처 포맷팅 처리
  const handlePhoneChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setFieldsValue({ driver_contact: formattedNumber });
  };

  // 선택된 주문 정보 표시
  const renderSelectedOrders = () => {
    if (orderCount === 0) {
      return <Alert message="선택된 주문이 없습니다" type="warning" showIcon />;
    }

    return (
      <div style={{ marginBottom: 16 }}>
        <Text style={FONT_STYLES.BODY.MEDIUM}>
          선택된 주문: <Text strong>{orderCount}건</Text>
        </Text>
        <div
          style={{
            maxHeight: '100px',
            overflowY: 'auto',
            marginTop: 8,
            padding: '8px 12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          {orderNumbers.join(', ')}
        </div>
      </div>
    );
  };

  return (
    <BaseModal
      title="배차 정보 입력"
      subTitle={`선택된 주문: ${orderCount}건`}
      visible={visible}
      onCancel={onCancel}
      onOk={submitForm}
      confirmLoading={loading}
      maskClosable={false}
      width={500}
    >
      {/* 선택된 주문 정보 표시 */}
      {renderSelectedOrders()}

      {/* 에러 메시지 표시 */}
      {error && (
        <Alert
          message="입력 오류"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 배차 정보 입력 폼 */}
      <Form form={form} layout="vertical">
        <Form.Item
          name="driver_name"
          label={<span style={FONT_STYLES.LABEL}>배송 담당</span>}
          rules={[
            { required: true, message: '배송 담당자를 입력해주세요' },
            { whitespace: true, message: '공백만으로는 입력할 수 없습니다' },
            { max: 50, message: '50자를 초과할 수 없습니다' },
          ]}
          tooltip={{
            title: '배송을 담당할 기사 이름을 입력하세요',
            icon: <InfoCircleOutlined />,
          }}
        >
          <Input
            prefix={<CarOutlined style={{ color: '#1890ff' }} />}
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
          tooltip={{
            title: '배송 담당자 연락처를 입력하세요 (형식: 010-1234-5678)',
            icon: <InfoCircleOutlined />,
          }}
        >
          <Input
            onChange={handlePhoneChange}
            placeholder="010-1234-5678"
            maxLength={13}
            style={FONT_STYLES.BODY.MEDIUM}
          />
        </Form.Item>
      </Form>

      {/* 주의사항 안내 */}
      <Paragraph style={{ marginTop: 16, fontSize: '12px', color: '#666' }}>
        * 배차 처리 시 선택한 모든 주문에 동일한 배송 담당자가 지정됩니다.
      </Paragraph>
    </BaseModal>
  );
};

export default AssignDriverModal;

// src/components/dashboard/CreateDashboardModal.js
import React, { useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Alert,
  Tooltip,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DashboardService from '../../services/DashboardService';
import {
  TYPE_TYPES,
  TYPE_TEXTS,
  WAREHOUSE_TYPES,
  WAREHOUSE_TEXTS,
  FONT_STYLES,
} from '../../utils/Constants';
import { validateDashboardForm } from '../../utils/validator';
import { formatPhoneNumber } from '../../utils/Formatter';
import { MessageKeys } from '../../utils/message';
import BaseModal from '../common/BaseModal';
import useForm from '../../hooks/useForm';
import { useLogger } from '../../utils/LogUtils';

const { Option } = Select;
const { TextArea } = Input;

/**
 * 대시보드 생성 모달 컴포넌트 (개선된 버전)
 * - 백엔드 API 명세에 맞는 필드 구성
 * - 유효성 검증 로직 개선
 * - 폼 상태 관리 최적화
 * - 에러 처리 및 사용자 피드백 개선
 *
 * @param {Object} props 컴포넌트 속성
 * @param {boolean} props.visible 모달 표시 여부
 * @param {Function} props.onCancel 취소 콜백
 * @param {Function} props.onSuccess 성공 콜백
 * @param {string} props.userDepartment 사용자 부서 정보
 */
const CreateDashboardModal = ({
  visible,
  onCancel,
  onSuccess,
  userDepartment,
}) => {
  const logger = useLogger('CreateDashboardModal');

  // 폼 관련 상태 및 함수 - useForm 커스텀 훅 활용
  const { form, loading, error, submitForm } = useForm({
    onSubmit: async (values) => {
      logger.info('대시보드 생성 요청 데이터:', values);

      // API 요청에 맞는 데이터 구조로 변환
      const dashboardData = {
        ...values,
        // ISO 형식으로 날짜 변환
        eta: values.eta.toISOString(),
      };

      // API 호출
      return await DashboardService.createDashboard(dashboardData);
    },
    validate: validateDashboardForm,
    messageKey: MessageKeys.DASHBOARD.CREATE,
    loadingMessage: '대시보드 생성 중...',
    successMessage: '대시보드가 생성되었습니다',
    errorMessage: '대시보드 생성 중 오류가 발생했습니다',
    onSuccess: () => {
      form.resetFields();
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  // 폼 초기화
  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        eta: dayjs().add(1, 'hour'), // 기본값: 현재 시간 + 1시간
      });
    }
  }, [visible, form]);

  // 연락처 포맷팅 처리
  const handlePhoneChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setFieldsValue({ contact: formattedNumber });
  };

  // ETA 선택 제한 (현재 시간 이후만 선택 가능)
  const disabledDate = (current) => {
    return current && current < dayjs().startOf('day');
  };

  // 시간 선택 제한 (오늘 날짜인 경우 현재 시간 이전 비활성화)
  const disabledTime = (current) => {
    const now = dayjs();
    if (current && current.isSame(now, 'day')) {
      return {
        disabledHours: () => Array.from({ length: now.hour() }, (_, i) => i),
        disabledMinutes: (hour) =>
          hour === now.hour()
            ? Array.from({ length: now.minute() }, (_, i) => i)
            : [],
      };
    }
    return {};
  };

  return (
    <BaseModal
      title="새 배송 등록"
      visible={visible}
      onCancel={onCancel}
      onOk={submitForm}
      confirmLoading={loading}
      width={800}
      maskClosable={false}
      destroyOnClose
    >
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

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          eta: dayjs().add(1, 'hour'),
        }}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="type"
              label={<span style={FONT_STYLES.LABEL}>종류</span>}
              rules={[{ required: true, message: '종류를 선택해주세요' }]}
              tooltip={{
                title: '배송 종류를 선택하세요',
                icon: <InfoCircleOutlined />,
              }}
            >
              <Select style={FONT_STYLES.BODY.MEDIUM}>
                {Object.entries(TYPE_TYPES).map(([key, value]) => (
                  <Option key={key} value={value}>
                    {TYPE_TEXTS[key]}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="order_no"
              label={<span style={FONT_STYLES.LABEL}>주문번호</span>}
              rules={[
                { required: true, message: '주문번호를 입력해주세요' },
                { pattern: /^\d+$/, message: '숫자만 입력 가능합니다' },
                { max: 15, message: '주문번호는 15자를 초과할 수 없습니다' },
              ]}
              tooltip={{
                title: '주문 식별을 위한 고유번호를 입력하세요 (숫자만 가능)',
                icon: <InfoCircleOutlined />,
              }}
            >
              <Input maxLength={15} style={FONT_STYLES.BODY.MEDIUM} />
            </Form.Item>

            <Form.Item
              name="warehouse"
              label={<span style={FONT_STYLES.LABEL}>출발허브</span>}
              rules={[{ required: true, message: '출발허브를 선택해주세요' }]}
              tooltip={{
                title: '배송 출발 위치를 선택하세요',
                icon: <InfoCircleOutlined />,
              }}
            >
              <Select style={FONT_STYLES.BODY.MEDIUM}>
                {Object.entries(WAREHOUSE_TYPES).map(([key, value]) => (
                  <Option key={key} value={value}>
                    {WAREHOUSE_TEXTS[key]}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="sla"
              label={<span style={FONT_STYLES.LABEL}>SLA</span>}
              rules={[
                { required: true, message: 'SLA를 입력해주세요' },
                { max: 10, message: 'SLA는 10자를 초과할 수 없습니다' },
                {
                  whitespace: true,
                  message: '공백만으로는 입력할 수 없습니다',
                },
              ]}
              tooltip={{
                title: '서비스 수준 계약(당일배송, 익일배송 등)을 입력하세요',
                icon: <InfoCircleOutlined />,
              }}
            >
              <Input
                maxLength={10}
                style={FONT_STYLES.BODY.MEDIUM}
                placeholder="당일배송"
              />
            </Form.Item>

            <Form.Item
              name="eta"
              label={<span style={FONT_STYLES.LABEL}>ETA</span>}
              rules={[{ required: true, message: 'ETA를 선택해주세요' }]}
              tooltip={{
                title: '도착 예정 시간을 선택하세요 (현재 시간 이후만 가능)',
                icon: <InfoCircleOutlined />,
              }}
            >
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%', ...FONT_STYLES.BODY.MEDIUM }}
                size="large"
                disabledDate={disabledDate}
                disabledTime={disabledTime}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="postal_code"
              label={<span style={FONT_STYLES.LABEL}>우편번호</span>}
              rules={[
                { required: true, message: '우편번호를 입력해주세요' },
                { pattern: /^\d{5}$/, message: '5자리 숫자로 입력해주세요' },
              ]}
              tooltip={{
                title: '5자리 우편번호를 입력하세요',
                icon: <InfoCircleOutlined />,
              }}
            >
              <Input
                maxLength={5}
                style={FONT_STYLES.BODY.MEDIUM}
                placeholder="12345"
              />
            </Form.Item>

            <Form.Item
              name="address"
              label={<span style={FONT_STYLES.LABEL}>도착 주소</span>}
              rules={[
                { required: true, message: '주소를 입력해주세요' },
                {
                  whitespace: true,
                  message: '공백만으로는 입력할 수 없습니다',
                },
                { max: 200, message: '주소는 200자를 초과할 수 없습니다' },
              ]}
              tooltip={{
                title: '정확한 배송 주소를 입력하세요',
                icon: <InfoCircleOutlined />,
              }}
            >
              <TextArea
                rows={3}
                maxLength={200}
                showCount
                style={{ ...FONT_STYLES.BODY.MEDIUM, resize: 'none' }}
                placeholder="서울시 강남구 역삼동 123-456"
              />
            </Form.Item>

            <Form.Item
              name="customer"
              label={<span style={FONT_STYLES.LABEL}>수령인</span>}
              rules={[
                { required: true, message: '수령인을 입력해주세요' },
                {
                  whitespace: true,
                  message: '공백만으로는 입력할 수 없습니다',
                },
                { max: 50, message: '50자를 초과할 수 없습니다' },
              ]}
              tooltip={{
                title: '배송 받는 사람의 이름을 입력하세요',
                icon: <InfoCircleOutlined />,
              }}
            >
              <Input
                maxLength={50}
                style={FONT_STYLES.BODY.MEDIUM}
                placeholder="홍길동"
              />
            </Form.Item>

            <Form.Item
              name="contact"
              label={<span style={FONT_STYLES.LABEL}>연락처</span>}
              rules={[
                { required: true, message: '연락처를 입력해주세요' },
                {
                  pattern: /^\d{2,3}-\d{3,4}-\d{4}$/,
                  message: '올바른 연락처 형식으로 입력해주세요',
                },
              ]}
              tooltip={{
                title: '수령인 연락처를 입력하세요 (예: 010-1234-5678)',
                icon: <InfoCircleOutlined />,
              }}
            >
              <Input
                onChange={handlePhoneChange}
                maxLength={13}
                style={FONT_STYLES.BODY.MEDIUM}
                placeholder="010-1234-5678"
              />
            </Form.Item>

            <Form.Item
              name="remark"
              label={<span style={FONT_STYLES.LABEL}>메모</span>}
              tooltip={{
                title: '배송 관련 추가 정보나 특이사항을 입력하세요',
                icon: <InfoCircleOutlined />,
              }}
            >
              <TextArea
                rows={3}
                maxLength={2000}
                showCount
                style={{ ...FONT_STYLES.BODY.MEDIUM, resize: 'none' }}
                placeholder="배송 관련 특이사항을 입력하세요"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </BaseModal>
  );
};

export default CreateDashboardModal;

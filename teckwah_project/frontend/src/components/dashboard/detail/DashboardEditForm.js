// src/components/dashboard/detail/DashboardEditForm.js
import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, DatePicker, Button, Space, Row, Col, Alert } from 'antd';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { FONT_STYLES } from '../../../utils/Constants';
import dayjs from 'dayjs';
import {
  formatPhoneNumber,
  disabledDate,
  disabledTime,
} from '../../../utils/Formatter';

const { TextArea } = Input;

/**
 * 대시보드 상세 정보 편집 폼 컴포넌트
 * 메모 필드는 별도 컴포넌트로 분리됨
 *
 * @param {Object} props - 컴포넌트 속성
 * @param {Object} props.dashboard - 대시보드 데이터
 * @param {Function} props.onSave - 저장 핸들러
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {boolean} props.loading - 로딩 상태
 */
const DashboardEditForm = ({
  dashboard,
  onSave,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [validationError, setValidationError] = useState(null);

  // 초기 폼 데이터 설정
  useEffect(() => {
    if (dashboard) {
      form.setFieldsValue({
        eta: dashboard.eta ? dayjs(dashboard.eta) : null,
        postal_code: dashboard.postal_code,
        address: dashboard.address,
        customer: dashboard.customer,
        contact: dashboard.contact,
      });
    }
  }, [dashboard, form]);

  // 저장 핸들러
  const handleSave = async () => {
    try {
      // 폼 검증
      const values = await form.validateFields();

      // ISO 형식 날짜 변환
      if (values.eta) {
        values.eta = values.eta.toISOString();
      }

      // 저장 함수 호출
      if (onSave) {
        onSave(values);
      }
    } catch (errors) {
      // 폼 검증 실패 시
      setValidationError('입력값을 확인해주세요');
      console.error('Validation failed:', errors);
    }
  };

  // 취소 핸들러
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // 연락처 입력 핸들러 - 자동 포맷팅
  const handlePhoneChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setFieldsValue({ contact: formattedNumber });
  };

  // 폼 레이아웃 및 스타일 설정
  const formItemLayout = useMemo(
    () => ({
      labelCol: { span: 24 },
      wrapperCol: { span: 24 },
    }),
    []
  );

  return (
    <div style={{ padding: '20px 0' }}>
      <Form
        form={form}
        {...formItemLayout}
        layout="vertical"
        onFinish={handleSave}
      >
        {/* 검증 오류 메시지 */}
        {validationError && (
          <Alert
            message={validationError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setValidationError(null)}
          />
        )}

        <Row gutter={32}>
          <Col span={12}>
            <Form.Item
              name="eta"
              label={<span style={FONT_STYLES.LABEL}>ETA</span>}
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
                disabledDate={disabledDate}
                disabledTime={disabledTime}
              />
            </Form.Item>

            <Form.Item
              name="postal_code"
              label={<span style={FONT_STYLES.LABEL}>우편번호</span>}
              rules={[
                { required: true, message: '우편번호를 입력해주세요' },
                {
                  pattern: /^\d{5}$/,
                  message: '5자리 숫자로 입력해주세요',
                },
              ]}
            >
              <Input
                maxLength={5}
                placeholder="12345"
                style={FONT_STYLES.BODY.MEDIUM}
              />
            </Form.Item>

            <Form.Item
              name="address"
              label={<span style={FONT_STYLES.LABEL}>주소</span>}
              rules={[
                { required: true, message: '주소를 입력해주세요' },
                {
                  whitespace: true,
                  message: '공백만으로는 입력할 수 없습니다',
                },
                {
                  max: 200,
                  message: '주소는 200자를 초과할 수 없습니다',
                },
              ]}
            >
              <TextArea
                rows={3}
                placeholder="상세 주소를 입력하세요"
                maxLength={200}
                showCount
                style={FONT_STYLES.BODY.MEDIUM}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
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
            >
              <Input
                placeholder="수령인 이름"
                maxLength={50}
                style={FONT_STYLES.BODY.MEDIUM}
              />
            </Form.Item>

            <Form.Item
              name="contact"
              label={<span style={FONT_STYLES.LABEL}>연락처</span>}
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
                placeholder="010-1234-5678"
                onChange={handlePhoneChange}
                style={FONT_STYLES.BODY.MEDIUM}
              />
            </Form.Item>

            {/* 메모 관련 안내 메시지 */}
            <div
              style={{
                marginTop: '28px',
                color: '#666',
                fontSize: '13px',
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
              }}
            >
              * 메모는 별도의 '메모 편집' 버튼을 통해서만 수정할 수 있습니다.
            </div>
          </Col>
        </Row>

        {/* 액션 버튼 */}
        <div style={{ textAlign: 'right', marginTop: '24px' }}>
          <Space>
            <Button
              onClick={handleCancel}
              icon={<CloseOutlined />}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={loading}
              icon={<SaveOutlined />}
            >
              저장
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default DashboardEditForm;

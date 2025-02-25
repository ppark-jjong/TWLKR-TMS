// frontend/src/components/dashboard/CreateDashboardModal.js
<<<<<<< HEAD
import React from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  message as antMessage,
} from 'antd';
import { formatPhoneNumber } from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';
=======
import React, { useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col } from 'antd';
>>>>>>> main
import {
  TYPE_TYPES,
  TYPE_TEXTS,
  WAREHOUSE_TYPES,
  WAREHOUSE_TEXTS,
  FONT_STYLES,
} from '../../utils/Constants';
import { formatPhoneNumber } from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';
import { validateDashboardForm } from '../../utils/validator';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const CreateDashboardModal = ({
  visible,
  onCancel,
  onSuccess,
  userDepartment,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // 폼 초기화
  React.useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        eta: dayjs().add(1, 'hour'),
      });
    }
  }, [visible, form]);

  // 연락처 포맷팅 처리
  const handlePhoneChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setFieldsValue({ contact: formattedNumber });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

<<<<<<< HEAD
      console.log('대시보드 생성 요청 데이터:', values);

      // 우편번호 5자리 검증
      if (!/^\d{5}$/.test(values.postal_code)) {
        message.error('올바른 우편번호가 아닙니다', key);
        setLoading(false);
        return;
      }

      // 연락처 형식 검증
      if (values.contact && !/^\d{2,3}-\d{3,4}-\d{4}$/.test(values.contact)) {
        message.error('올바른 연락처 형식이 아닙니다', key);
        setLoading(false);
        return;
      }

      // 대시보드 데이터 준비
      const dashboardData = {
        ...values,
        department: userDepartment,
        // ISO 형식으로 날짜 변환
        eta: values.eta.toISOString(),
      };

      await DashboardService.createDashboard(dashboardData);
      message.loadingToSuccess('대시보드가 생성되었습니다', key);
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('대시보드 생성 오류:', error);

      // 구체적인 에러 메시지 추출
      const errorDetail =
        error.response?.data?.detail || '대시보드 생성 중 오류가 발생했습니다';
      message.loadingToError(errorDetail, key);
=======
      // 추가 유효성 검증
      const errors = validateDashboardForm(values);
      if (Object.keys(errors).length > 0) {
        form.setFields(
          Object.entries(errors).map(([name, error]) => ({
            name,
            errors: error ? [error] : [],
          }))
        );
        return;
      }

      setSubmitting(true);

      await DashboardService.createDashboard({
        ...values,
        department: userDepartment,
      });

      form.resetFields();
      onSuccess();
>>>>>>> main
    } finally {
      setSubmitting(false);
    }
  };

<<<<<<< HEAD
  // ETA 선택 제한 (현재 시간 이후만 선택 가능)
  const disabledDate = (current) => {
    return current && current < dayjs().startOf('day');
  };

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

=======
>>>>>>> main
  return (
    <Modal
      title={<span style={FONT_STYLES.TITLE.LARGE}>대시보드 생성</span>}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      width={1000}
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
<<<<<<< HEAD
        initialValues={{
          eta: dayjs().add(1, 'hour'),
        }}
=======
        initialValues={{ eta: dayjs().add(1, 'hour') }}
>>>>>>> main
      >
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="type"
              label={<span style={FONT_STYLES.LABEL}>종류</span>}
              rules={[{ required: true, message: '종류를 선택해주세요' }]}
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
              ]}
            >
              <Input maxLength={20} style={FONT_STYLES.BODY.MEDIUM} />
            </Form.Item>

            <Form.Item
              name="warehouse"
              label={<span style={FONT_STYLES.LABEL}>출발허브</span>}
              rules={[{ required: true, message: '출발허브를 선택해주세요' }]}
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
<<<<<<< HEAD
              rules={[
                { required: true, message: 'SLA를 입력해주세요' },
                { max: 10, message: 'SLA는 10자를 초과할 수 없습니다' },
                {
                  whitespace: true,
                  message: '공백만으로는 입력할 수 없습니다',
                },
              ]}
=======
              rules={[{ required: true, message: 'SLA를 입력해주세요' }]}
>>>>>>> main
            >
              <Input maxLength={10} style={FONT_STYLES.BODY.MEDIUM} />
            </Form.Item>

            <Form.Item
              name="eta"
              label={<span style={FONT_STYLES.LABEL}>ETA</span>}
              rules={[{ required: true, message: 'ETA를 선택해주세요' }]}
            >
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%', ...FONT_STYLES.BODY.MEDIUM }}
                size="large"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="postal_code"
              label={<span style={FONT_STYLES.LABEL}>우편번호</span>}
<<<<<<< HEAD
              rules={[
                { required: true, message: '우편번호를 입력해주세요' },
                { pattern: /^\d{5}$/, message: '5자리 숫자로 입력해주세요' },
              ]}
=======
              rules={[{ required: true, message: '우편번호를 입력해주세요' }]}
>>>>>>> main
            >
              <Input maxLength={5} style={FONT_STYLES.BODY.MEDIUM} />
            </Form.Item>

            <Form.Item
              name="address"
              label={<span style={FONT_STYLES.LABEL}>도착 주소</span>}
<<<<<<< HEAD
              rules={[
                { required: true, message: '주소를 입력해주세요' },
                {
                  whitespace: true,
                  message: '공백만으로는 입력할 수 없습니다',
                },
              ]}
=======
              rules={[{ required: true, message: '주소를 입력해주세요' }]}
>>>>>>> main
            >
              <TextArea
                rows={3}
                maxLength={200}
                showCount
                style={{ ...FONT_STYLES.BODY.MEDIUM, resize: 'none' }}
              />
            </Form.Item>

            <Form.Item
              name="customer"
              label={<span style={FONT_STYLES.LABEL}>수령인</span>}
<<<<<<< HEAD
              rules={[
                { required: true, message: '수령인을 입력해주세요' },
                {
                  whitespace: true,
                  message: '공백만으로는 입력할 수 없습니다',
                },
              ]}
=======
              rules={[{ required: true, message: '수령인을 입력해주세요' }]}
>>>>>>> main
            >
              <Input maxLength={50} style={FONT_STYLES.BODY.MEDIUM} />
            </Form.Item>

            <Form.Item
              name="contact"
              label={<span style={FONT_STYLES.LABEL}>연락처</span>}
<<<<<<< HEAD
              rules={[
                { required: true, message: '연락처를 입력해주세요' },
                {
                  pattern: /^\d{2,3}-\d{3,4}-\d{4}$/,
                  message: '올바른 연락처 형식으로 입력해주세요',
                },
              ]}
=======
>>>>>>> main
            >
              <Input
                onChange={handlePhoneChange}
                maxLength={13}
                style={FONT_STYLES.BODY.MEDIUM}
              />
            </Form.Item>

            <Form.Item
              name="remark"
              label={<span style={FONT_STYLES.LABEL}>메모</span>}
            >
              <TextArea
                rows={3}
                maxLength={2000}
                showCount
                style={{ ...FONT_STYLES.BODY.MEDIUM, resize: 'none' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default CreateDashboardModal;

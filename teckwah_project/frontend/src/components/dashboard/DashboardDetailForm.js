// src/components/dashboard/DashboardDetailForm.js
import React from 'react';
import { Form, Input, DatePicker, Button, Space, Row, Col } from 'antd';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import { FONT_STYLES } from '../../utils/Constants';

const { TextArea } = Input;

/**
 * 대시보드 상세 정보 편집 폼 컴포넌트
 * 메모 필드는 별도로 관리되므로 제외됨
 */
const DashboardDetailForm = ({ form, loading, onSave, onCancel }) => {
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

          {/* 주의: 메모 필드가 의도적으로 제외됨 */}
          <div style={{ marginTop: '20px', color: '#666', fontSize: '13px' }}>
            * 메모는 별도의 '메모 수정' 버튼을 통해서만 수정할 수 있습니다.
          </div>
        </Col>
      </Row>

      <div style={{ textAlign: 'right', marginTop: '16px' }}>
        <Space>
          <Button onClick={onCancel} icon={<CloseOutlined />}>
            취소
          </Button>
          <Button
            type="primary"
            onClick={onSave}
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

export default DashboardDetailForm;

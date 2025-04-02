// src/components/AssignDriverModal.js
import React from 'react';
import { Form, Input, Row, Col, Badge, Typography } from 'antd';
import BaseModal from './shared/BaseModal';

const { Text } = Typography;

/**
 * 배차 처리 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.open - 모달 표시 여부
 * @param {Function} props.onOk - 확인 핸들러
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {Object} props.form - Form 인스턴스
 * @param {boolean} props.confirmLoading - 확인 버튼 로딩 상태
 * @param {number} props.selectedCount - 선택된 주문 개수
 */
const AssignDriverModal = ({
  open,
  onOk,
  onCancel,
  form,
  confirmLoading = false,
  selectedCount = 0,
}) => {
  return (
    <BaseModal
      title="배차 처리"
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      width={600}
      centered
    >
      {selectedCount > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Badge color="blue" status="processing" />
          <Text strong> 선택된 주문: {selectedCount}건</Text>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            선택한 주문에 동일한 배송기사 정보가 할당됩니다.
          </Text>
        </div>
      )}

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="driver_name"
              label="기사명"
              rules={[{ required: true, message: '기사명을 입력해주세요' }]}
            >
              <Input placeholder="기사명 입력" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="driver_contact"
              label="연락처"
              rules={[
                { required: true, message: '연락처를 입력해주세요' },
                {
                  pattern: /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/,
                  message: '올바른 연락처 형식이 아닙니다',
                },
              ]}
            >
              <Input
                placeholder="연락처 입력 (예: 010-1234-5678)"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </BaseModal>
  );
};

export default AssignDriverModal;

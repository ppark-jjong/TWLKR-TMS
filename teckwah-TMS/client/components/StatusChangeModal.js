// src/components/StatusChangeModal.js
import React, { useMemo } from 'react';
import { Form, Select, Row, Col, Descriptions, Tag } from 'antd';
import {
  getAvailableStatusTransitions,
  getStatusText,
  getStatusColor,
} from '../utils/PermissionUtils';
import BaseModal from './BaseModal';

const { Option } = Select;

/**
 * 상태 변경 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.open - 모달 표시 여부
 * @param {Function} props.onOk - 확인 핸들러
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {Object} props.form - Form 인스턴스
 * @param {Object} props.currentRecord - 현재 대시보드 데이터
 * @param {boolean} props.isAdmin - 관리자 여부
 * @param {boolean} props.confirmLoading - 확인 버튼 로딩 상태
 */
const StatusChangeModal = ({
  open,
  onOk,
  onCancel,
  form,
  currentRecord,
  isAdmin = false,
  confirmLoading = false,
}) => {
  const userRole = isAdmin ? 'ADMIN' : 'USER';

  // 현재 상태에 따라 선택 가능한 상태 옵션 계산
  const statusOptions = useMemo(() => {
    if (!currentRecord) return [];

    const availableStatuses = getAvailableStatusTransitions(
      currentRecord.status,
      userRole
    );

    return availableStatuses.map((status) => (
      <Option key={status} value={status}>
        {getStatusText(status)}
      </Option>
    ));
  }, [currentRecord, userRole]);

  return (
    <BaseModal
      title="상태 변경"
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      width={600}
      centered
    >
      {currentRecord && (
        <Descriptions
          bordered
          size="small"
          column={2}
          style={{ marginBottom: 20 }}
        >
          <Descriptions.Item label="주문번호" span={1}>
            {currentRecord.order_no}
          </Descriptions.Item>
          <Descriptions.Item label="고객명" span={1}>
            {currentRecord.customer}
          </Descriptions.Item>
          <Descriptions.Item label="현재 상태" span={2}>
            <Tag color={getStatusColor(currentRecord.status)}>
              {getStatusText(currentRecord.status)}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      )}

      <Form form={form} layout="vertical">
        <Row>
          <Col span={24}>
            <Form.Item
              name="status"
              label="변경할 상태"
              rules={[{ required: true, message: '상태를 선택해주세요' }]}
            >
              <Select
                placeholder="상태 선택"
                size="large"
                style={{ width: '100%' }}
              >
                {statusOptions}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </BaseModal>
  );
};

export default StatusChangeModal;

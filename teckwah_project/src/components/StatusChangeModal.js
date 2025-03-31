// src/components/StatusChangeModal.js
import React, { useMemo } from "react";
import { Modal, Form, Select, Row, Col, Descriptions, Tag } from "antd";
import {
  getAvailableStatusTransitions,
  getStatusText,
  getStatusColor,
} from "../utils/permissionUtils";

const { Option } = Select;

/**
 * 상태 변경 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.open - 모달 표시 여부
 * @param {Function} props.onOk - 확인 핸들러
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {Object} props.form - Form 인스턴스
 * @param {Object} props.dashboard - 현재 대시보드 데이터
 * @param {string} props.userRole - 사용자 권한
 * @param {boolean} props.confirmLoading - 확인 버튼 로딩 상태
 */
const StatusChangeModal = ({
  open,
  onOk,
  onCancel,
  form,
  dashboard,
  userRole = "USER",
  confirmLoading = false,
}) => {
  // 현재 상태에 따라 선택 가능한 상태 옵션 계산
  const statusOptions = useMemo(() => {
    if (!dashboard) return [];

    const availableStatuses = getAvailableStatusTransitions(
      dashboard.status,
      userRole
    );

    return availableStatuses.map((status) => (
      <Option key={status} value={status}>
        {getStatusText(status)}
      </Option>
    ));
  }, [dashboard, userRole]);

  return (
    <Modal
      title="상태 변경"
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      width={600}
      centered
    >
      {dashboard && (
        <Descriptions
          bordered
          size="small"
          column={2}
          style={{ marginBottom: 20 }}
        >
          <Descriptions.Item label="주문번호" span={1}>
            {dashboard.order_no}
          </Descriptions.Item>
          <Descriptions.Item label="고객명" span={1}>
            {dashboard.customer}
          </Descriptions.Item>
          <Descriptions.Item label="현재 상태" span={2}>
            <Tag color={getStatusColor(dashboard.status)}>
              {getStatusText(dashboard.status)}
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
              rules={[{ required: true, message: "상태를 선택해주세요" }]}
            >
              <Select
                placeholder="상태 선택"
                size="large"
                style={{ width: "100%" }}
              >
                {statusOptions}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default StatusChangeModal;

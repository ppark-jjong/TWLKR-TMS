import React, { useState, useEffect } from "react";
import { Modal, Select, Form, Alert } from "antd";
import { STATUS_OPTIONS, STATUS_TRANSITIONS } from "../../utils/Constants";
import { getStatusInfo } from "../../utils/Helpers";
import { isAdmin } from "../../utils/Auth";

/**
 * 상태 변경 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Function} props.onSubmit - 폼 제출 콜백
 * @param {Object} props.orderData - 주문 데이터
 * @param {boolean} props.loading - 로딩 상태
 */
const StatusChangeModal = ({
  visible,
  onClose,
  onSubmit,
  orderData,
  loading,
}) => {
  const [form] = Form.useForm();
  const [availableStatusOptions, setAvailableStatusOptions] = useState([]);

  // 주문 데이터가 변경되면 폼 필드 값 설정
  useEffect(() => {
    if (orderData && visible) {
      form.setFieldsValue({
        status: orderData.status,
      });

      // 상태 전이 규칙에 따라 가능한 상태 옵션 설정
      updateAvailableStatusOptions(orderData.status);
    }
  }, [form, orderData, visible]);

  // 가능한 상태 옵션 업데이트
  const updateAvailableStatusOptions = (currentStatus) => {
    const admin = isAdmin();

    if (admin) {
      // 관리자는 모든 상태로 변경 가능
      setAvailableStatusOptions(STATUS_OPTIONS);
    } else {
      // 일반 사용자는 전이 규칙에 따라 제한
      const availableStatuses = STATUS_TRANSITIONS[currentStatus] || [];
      const options = STATUS_OPTIONS.filter((option) =>
        availableStatuses.includes(option.value)
      );

      setAvailableStatusOptions(options);
    }
  };

  // 폼 제출 핸들러
  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        onSubmit(values);
      })
      .catch((error) => {
        console.error("Validation failed:", error);
      });
  };

  // 현재 상태 정보
  const currentStatusInfo = orderData ? getStatusInfo(orderData.status) : {};

  return (
    <Modal
      title="상태 변경"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        {orderData && (
          <Alert
            message={`현재 상태: ${currentStatusInfo.label}`}
            type="info"
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          name="status"
          label="변경할 상태"
          rules={[{ required: true, message: "변경할 상태를 선택해주세요" }]}
        >
          <Select placeholder="상태 선택">
            {availableStatusOptions.map((option) => (
              <Select.Option
                key={option.value}
                value={option.value}
                disabled={orderData && orderData.status === option.value}
              >
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StatusChangeModal;

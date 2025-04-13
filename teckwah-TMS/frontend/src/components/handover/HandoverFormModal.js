import React, { useEffect } from "react";
import { Modal, Form, Input, Checkbox, Typography } from "antd";
import { isAdmin } from "../../utils/Auth";

const { TextArea } = Input;
const { Text } = Typography;

/**
 * 인수인계/공지사항 등록/수정 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Function} props.onSubmit - 폼 제출 콜백
 * @param {Object} props.data - 인수인계 데이터 (수정 시)
 * @param {boolean} props.loading - 로딩 상태
 * @param {boolean} props.isEdit - 수정 모드 여부
 */
const HandoverFormModal = ({
  visible,
  onClose,
  onSubmit,
  data,
  loading,
  isEdit,
}) => {
  const [form] = Form.useForm();
  const admin = isAdmin();

  // 데이터가 변경되면 폼 필드 값 설정
  useEffect(() => {
    if (data && visible && isEdit) {
      form.setFieldsValue({
        title: data.title,
        content: data.content,
        is_notice: data.is_notice,
      });
    } else if (visible && !isEdit) {
      form.resetFields();
    }
  }, [form, data, visible, isEdit]);

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

  // 모달 닫기 핸들러
  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={isEdit ? "인수인계 수정" : "인수인계 등록"}
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
    >
      <Form form={form} layout="vertical" initialValues={{ is_notice: false }}>
        <Form.Item
          name="title"
          label="제목"
          rules={[
            { required: true, message: "제목을 입력해주세요" },
            { max: 100, message: "제목은 100자를 초과할 수 없습니다" },
          ]}
        >
          <Input placeholder="제목을 입력하세요" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="content"
          label="내용"
          rules={[
            { required: true, message: "내용을 입력해주세요" },
            { max: 2000, message: "내용은 2000자를 초과할 수 없습니다" },
          ]}
        >
          <TextArea
            placeholder="내용을 입력하세요"
            rows={8}
            maxLength={2000}
            showCount
          />
        </Form.Item>

        {admin && (
          <Form.Item name="is_notice" valuePropName="checked">
            <Checkbox>공지사항으로 등록</Checkbox>
          </Form.Item>
        )}

        {!admin && (
          <Text type="secondary">공지사항은 관리자만 등록할 수 있습니다.</Text>
        )}
      </Form>
    </Modal>
  );
};

export default HandoverFormModal;

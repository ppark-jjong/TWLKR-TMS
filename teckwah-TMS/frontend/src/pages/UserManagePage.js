import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  message,
  Typography,
  Card,
  Space,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { listUsers, createUser, deleteUser } from "../api/UserService";

const { Title } = Typography;
const { Option } = Select;

/**
 * 사용자 관리 페이지 (Admin 전용)
 */
const UserManagePage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();

  // 사용자 목록 조회
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await listUsers();
      if (response.success) {
        setUsers(response.data);
      } else {
        message.error(
          response.message || "사용자 목록 조회 중 오류가 발생했습니다."
        );
      }
    } catch (error) {
      console.error("사용자 목록 조회 오류:", error);
      message.error("사용자 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 사용자 목록 조회
  useEffect(() => {
    fetchUsers();
  }, []);

  // 사용자 생성 모달 표시
  const showCreateModal = () => {
    createForm.resetFields();
    setCreateModalVisible(true);
  };

  // 사용자 생성 처리
  const handleCreateUser = async (values) => {
    try {
      const response = await createUser(values);
      if (response.success) {
        message.success("사용자가 성공적으로 생성되었습니다.");
        setCreateModalVisible(false);
        fetchUsers(); // 목록 새로고침
      } else {
        message.error(
          response.message || "사용자 생성 중 오류가 발생했습니다."
        );
      }
    } catch (error) {
      console.error("사용자 생성 오류:", error);
      message.error("사용자 생성 중 오류가 발생했습니다.");
    }
  };

  // 사용자 삭제 처리
  const handleDeleteUser = async (userId) => {
    try {
      const response = await deleteUser(userId);
      if (response.success) {
        message.success("사용자가 성공적으로 삭제되었습니다.");
        fetchUsers(); // 목록 새로고침
      } else {
        message.error(
          response.message || "사용자 삭제 중 오류가 발생했습니다."
        );
      }
    } catch (error) {
      console.error("사용자 삭제 오류:", error);
      message.error("사용자 삭제 중 오류가 발생했습니다.");
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: "사용자 ID",
      dataIndex: "user_id",
      key: "user_id",
    },
    {
      title: "부서",
      dataIndex: "department",
      key: "department",
      render: (text) => {
        const departmentMap = {
          CS: "고객 서비스",
          HES: "HES",
          LENOVO: "레노버",
        };
        return departmentMap[text] || text;
      },
    },
    {
      title: "권한",
      dataIndex: "role",
      key: "role",
      render: (text) => (text === "ADMIN" ? "관리자" : "사용자"),
    },
    {
      title: "생성일",
      dataIndex: "created_at",
      key: "created_at",
      render: (text) => new Date(text).toLocaleDateString(),
    },
    {
      title: "작업",
      key: "action",
      render: (_, record) => (
        <Popconfirm
          title="정말 삭제하시겠습니까?"
          onConfirm={() => handleDeleteUser(record.user_id)}
          okText="예"
          cancelText="아니오"
        >
          <Button danger icon={<DeleteOutlined />} size="small">
            삭제
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="user-manage-page">
      <Card>
        <Space direction="vertical" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Title level={4}>사용자 관리</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showCreateModal}
            >
              사용자 추가
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={users}
            rowKey="user_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Space>
      </Card>

      {/* 사용자 생성 모달 */}
      <Modal
        title="사용자 추가"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateUser}>
          <Form.Item
            name="user_id"
            label="사용자 ID"
            rules={[
              { required: true, message: "사용자 ID를 입력하세요" },
              { min: 4, message: "사용자 ID는 4자 이상이어야 합니다" },
            ]}
          >
            <Input placeholder="사용자 ID" />
          </Form.Item>

          <Form.Item
            name="password"
            label="비밀번호"
            rules={[
              { required: true, message: "비밀번호를 입력하세요" },
              { min: 6, message: "비밀번호는 6자 이상이어야 합니다" },
            ]}
          >
            <Input.Password placeholder="비밀번호" />
          </Form.Item>

          <Form.Item
            name="department"
            label="부서"
            rules={[{ required: true, message: "부서를 선택하세요" }]}
          >
            <Select placeholder="부서 선택">
              <Option value="CS">고객 서비스</Option>
              <Option value="HES">HES</Option>
              <Option value="LENOVO">레노버</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="role"
            label="권한"
            initialValue="USER"
            rules={[{ required: true, message: "권한을 선택하세요" }]}
          >
            <Select placeholder="권한 선택">
              <Option value="ADMIN">관리자</Option>
              <Option value="USER">사용자</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>취소</Button>
              <Button type="primary" htmlType="submit">
                추가
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagePage;

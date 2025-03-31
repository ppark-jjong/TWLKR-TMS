import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, createUser, updateUser, deleteUser } from '../utils/api';

const { Option } = Select;

const UserTable = () => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  // 사용자 목록 조회
  const { data: usersData, isLoading } = useQuery(['users'], async () => {
    const response = await fetchUsers();
    return response.data.data;
  });

  // 사용자 생성 뮤테이션
  const createUserMutation = useMutation((userData) => createUser(userData), {
    onSuccess: () => {
      message.success('사용자가 생성되었습니다');
      queryClient.invalidateQueries(['users']);
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(
        error.response?.data?.message || '사용자 생성 중 오류가 발생했습니다'
      );
    },
  });

  // 사용자 수정 뮤테이션
  const updateUserMutation = useMutation(
    ({ userId, userData }) => updateUser(userId, userData),
    {
      onSuccess: () => {
        message.success('사용자 정보가 수정되었습니다');
        queryClient.invalidateQueries(['users']);
        setIsModalVisible(false);
      },
      onError: (error) => {
        message.error(
          error.response?.data?.message || '사용자 수정 중 오류가 발생했습니다'
        );
      },
    }
  );

  // 사용자 삭제 뮤테이션
  const deleteUserMutation = useMutation((userId) => deleteUser(userId), {
    onSuccess: () => {
      message.success('사용자가 삭제되었습니다');
      queryClient.invalidateQueries(['users']);
    },
    onError: (error) => {
      message.error(
        error.response?.data?.message || '사용자 삭제 중 오류가 발생했습니다'
      );
    },
  });

  // 모달 열기 (생성)
  const showCreateModal = () => {
    setIsEditing(false);
    setCurrentUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 모달 열기 (수정)
  const showEditModal = (user) => {
    setIsEditing(true);
    setCurrentUser(user);
    form.setFieldsValue({
      user_id: user.user_id,
      user_department: user.user_department,
      user_role: user.user_role,
    });
    setIsModalVisible(true);
  };

  // 모달 닫기
  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // 폼 제출 처리
  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        if (isEditing) {
          // 수정 모드
          updateUserMutation.mutate({
            userId: currentUser.user_id,
            userData: values,
          });
        } else {
          // 생성 모드
          createUserMutation.mutate(values);
        }
      })
      .catch((errorInfo) => {
        console.error('Validation Failed:', errorInfo);
      });
  };

  // 삭제 확인
  const confirmDelete = (userId) => {
    deleteUserMutation.mutate(userId);
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '사용자 ID',
      dataIndex: 'user_id',
      key: 'user_id',
    },
    {
      title: '부서',
      dataIndex: 'user_department',
      key: 'user_department',
    },
    {
      title: '권한',
      dataIndex: 'user_role',
      key: 'user_role',
      render: (role) => (role === 'ADMIN' ? '관리자' : '일반 사용자'),
    },
    {
      title: '작업',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            size="small"
          >
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            description="이 작업은 되돌릴 수 없습니다."
            onConfirm={() => confirmDelete(record.user_id)}
            okText="예"
            cancelText="아니오"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Button icon={<DeleteOutlined />} danger size="small">
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="user-table-container">
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={showCreateModal}
        >
          사용자 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={usersData || []}
        rowKey="user_id"
        loading={isLoading}
        bordered
        pagination={{ pageSize: 10 }}
      />

      {/* 사용자 생성/수정 모달 */}
      <Modal
        title={isEditing ? '사용자 수정' : '사용자 추가'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        confirmLoading={
          createUserMutation.isLoading || updateUserMutation.isLoading
        }
        okText={isEditing ? '수정' : '추가'}
        cancelText="취소"
      >
        <Form
          form={form}
          layout="vertical"
          name="userForm"
          initialValues={{
            user_role: 'USER',
            user_department: 'CS',
          }}
        >
          <Form.Item
            name="user_id"
            label="사용자 ID"
            rules={[
              { required: true, message: '사용자 ID를 입력해주세요' },
              { min: 3, message: '최소 3자 이상 입력해주세요' },
            ]}
            disabled={isEditing}
          >
            <Input
              placeholder="사용자 ID"
              disabled={isEditing}
              prefix={<UserOutlined />}
            />
          </Form.Item>

          {!isEditing && (
            <Form.Item
              name="user_password"
              label="비밀번호"
              rules={[
                { required: true, message: '비밀번호를 입력해주세요' },
                { min: 6, message: '최소 6자 이상 입력해주세요' },
              ]}
            >
              <Input.Password
                placeholder="비밀번호"
                prefix={<LockOutlined />}
              />
            </Form.Item>
          )}

          <Form.Item
            name="user_department"
            label="부서"
            rules={[{ required: true, message: '부서를 선택해주세요' }]}
          >
            <Select placeholder="부서 선택">
              <Option value="CS">CS</Option>
              <Option value="HES">HES</Option>
              <Option value="LENOVO">LENOVO</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="user_role"
            label="권한"
            rules={[{ required: true, message: '권한을 선택해주세요' }]}
          >
            <Select placeholder="권한 선택">
              <Option value="USER">일반 사용자</Option>
              <Option value="ADMIN">관리자</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserTable;

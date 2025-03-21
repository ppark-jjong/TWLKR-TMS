// src/components/admin/UserManagementTab.js
import React, { memo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  Form,
  Input,
  Select,
  Modal,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { DEPARTMENT_TEXTS, FONT_STYLES } from '../../utils/Constants';

const { Option } = Select;

/**
 * 사용자 관리 탭 컴포넌트
 * 사용자 목록, 추가, 수정, 삭제 기능 제공
 */
const UserManagementTab = ({
  userList,
  loading,
  onUserSave,
  onUserDelete,
  showUserModal,
  setShowUserModal,
  editingUser,
  userForm,
}) => {
  // 사용자 추가/편집 모달 열기
  const openUserModal = (user = null) => {
    if (user) {
      // 편집 모드 - 기존 데이터 설정
      userForm.setFieldsValue({
        user_id: user.user_id,
        user_role: user.user_role,
        user_department: user.user_department,
      });
    } else {
      // 추가 모드 - 폼 초기화
      userForm.resetFields();
    }
    setShowUserModal(true);
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: 'ID',
      dataIndex: 'user_id',
      key: 'user_id',
      sorter: (a, b) => a.user_id.localeCompare(b.user_id),
    },
    {
      title: '권한',
      dataIndex: 'user_role',
      key: 'user_role',
      render: (role) => (
        <Tag color={role === 'ADMIN' ? 'red' : 'blue'}>{role}</Tag>
      ),
      filters: [
        { text: '관리자', value: 'ADMIN' },
        { text: '일반 사용자', value: 'USER' },
      ],
      onFilter: (value, record) => record.user_role === value,
    },
    {
      title: '부서',
      dataIndex: 'user_department',
      key: 'user_department',
      render: (dept) => DEPARTMENT_TEXTS[dept] || dept,
      filters: Object.entries(DEPARTMENT_TEXTS).map(([key, value]) => ({
        text: value,
        value: key,
      })),
      onFilter: (value, record) => record.user_department === value,
    },
    {
      title: '생성일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
    {
      title: '관리',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openUserModal(record)}
          />
          <Popconfirm
            title="사용자를 삭제하시겠습니까?"
            description="이 작업은 되돌릴 수 없습니다."
            onConfirm={() => onUserDelete(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 사용자 폼 모달
  const UserFormModal = () => (
    <Modal
      title={`사용자 ${editingUser ? '수정' : '추가'}`}
      open={showUserModal}
      onCancel={() => setShowUserModal(false)}
      footer={null}
    >
      <Form form={userForm} layout="vertical" onFinish={onUserSave}>
        <Form.Item
          name="user_id"
          label="사용자 ID"
          rules={[
            { required: true, message: '사용자 ID를 입력하세요' },
            { min: 3, max: 20, message: '3~20자 사이로 입력하세요' },
          ]}
        >
          <Input placeholder="사용자 ID" disabled={!!editingUser} />
        </Form.Item>

        <Form.Item
          name="user_role"
          label="사용자 권한"
          rules={[{ required: true, message: '권한을 선택하세요' }]}
        >
          <Select placeholder="권한 선택">
            <Option value="ADMIN">관리자</Option>
            <Option value="USER">일반 사용자</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="user_department"
          label="부서"
          rules={[{ required: true, message: '부서를 선택하세요' }]}
        >
          <Select placeholder="부서 선택">
            {Object.entries(DEPARTMENT_TEXTS).map(([key, value]) => (
              <Option key={key} value={key}>
                {value}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {!editingUser && (
          <>
            <Form.Item
              name="password"
              label="비밀번호"
              rules={[
                { required: true, message: '비밀번호를 입력하세요' },
                { min: 6, message: '6자 이상 입력하세요' },
              ]}
            >
              <Input.Password placeholder="비밀번호" />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="비밀번호 확인"
              rules={[
                { required: true, message: '비밀번호 확인을 입력하세요' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error('비밀번호가 일치하지 않습니다')
                    );
                  },
                }),
              ]}
            >
              <Input.Password placeholder="비밀번호 확인" />
            </Form.Item>
          </>
        )}

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              {editingUser ? '수정' : '추가'}
            </Button>
            <Button onClick={() => setShowUserModal(false)}>취소</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );

  return (
    <Card
      title="사용자 관리"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openUserModal()}
        >
          새 사용자
        </Button>
      }
    >
      <Table
        dataSource={userList}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* 사용자 추가/편집 모달 */}
      <UserFormModal />
    </Card>
  );
};

// 성능 최적화를 위한 메모이제이션
export default memo(UserManagementTab);

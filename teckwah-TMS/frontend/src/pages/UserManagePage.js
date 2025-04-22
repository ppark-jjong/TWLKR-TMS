/**
 * 사용자 관리 페이지 컴포넌트 (관리자 전용)
 */
import React, { useState, useEffect } from 'react';
import { 
  Button, Space, Table, Typography, Tag, message, 
  Popconfirm, Modal, Form, Input, Select, Divider 
} from 'antd';
import { 
  PlusOutlined, DeleteOutlined, UserOutlined,
  LockOutlined, BankOutlined, SafetyOutlined
} from '@ant-design/icons';
import MainLayout from '../components/layout/MainLayout';
import { PageTitle, CustomTable, PageLoading, ErrorResult } from '../components/common';
import { UserService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

// 권한 옵션
const ROLE_OPTIONS = [
  { value: 'ADMIN', label: '관리자', color: 'gold' },
  { value: 'USER', label: '일반 사용자', color: 'blue' }
];

// 부서 옵션
const DEPARTMENT_OPTIONS = [
  { value: 'CS', label: 'CS' },
  { value: 'HES', label: 'HES' },
  { value: 'LENOVO', label: 'LENOVO' }
];

const UserManagePage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  // 페이지네이션 제거
  
  // 모달 상태
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  
  // 폼 인스턴스
  const [form] = Form.useForm();
  
  // 데이터 불러오기
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await UserService.getUsers();
      
      if (response.success) {
        setData(response.data.items);
      } else {
        setError(response.message || '데이터 조회 실패');
      }
    } catch (error) {
      console.error('데이터 조회 오류:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 초기 데이터 로드
  useEffect(() => {
    fetchData();
  }, []);
  
  // 사용자 삭제
  const handleDelete = async (userId) => {
    // 현재 사용자는 삭제 불가
    if (userId === currentUser?.userId) {
      message.error('현재 로그인한 사용자는 삭제할 수 없습니다');
      return;
    }
    
    try {
      const response = await UserService.deleteUser(userId);
      
      if (response.success) {
        message.success('사용자가 삭제되었습니다');
        fetchData();
      } else {
        message.error(response.message || '사용자 삭제 실패');
      }
    } catch (error) {
      console.error('사용자 삭제 오류:', error);
      message.error('사용자 삭제 중 오류가 발생했습니다');
    }
  };
  
  // 사용자 생성
  const handleCreate = async (values) => {
    try {
      const response = await UserService.createUser(values);
      
      if (response.success) {
        message.success('사용자가 생성되었습니다');
        form.resetFields();
        setIsCreateModalVisible(false);
        fetchData();
      } else {
        message.error(response.message || '사용자 생성 실패');
      }
    } catch (error) {
      console.error('사용자 생성 오류:', error);
      message.error('사용자 생성 중 오류가 발생했습니다');
    }
  };
  
  // 권한 태그 렌더링
  const renderRoleTag = (role) => {
    const option = ROLE_OPTIONS.find(opt => opt.value === role);
    
    return (
      <Tag color={option?.color || 'default'}>
        {option?.label || role}
      </Tag>
    );
  };
  
  // 테이블 컬럼 설정
  const columns = [
    {
      title: '사용자 ID',
      dataIndex: 'userId',
      key: 'userId',
    },
    {
      title: '부서',
      dataIndex: 'userDepartment',
      key: 'userDepartment',
    },
    {
      title: '권한',
      dataIndex: 'userRole',
      key: 'userRole',
      render: (role) => renderRoleTag(role),
    },
    {
      title: '작업',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Popconfirm
            title="이 사용자를 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.userId)}
            okText="삭제"
            cancelText="취소"
            disabled={record.userId === currentUser?.userId}
          >
            <Button 
              type="link" 
              size="small" 
              danger
              disabled={record.userId === currentUser?.userId}
            >
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  // 에러 발생 시 재시도
  const handleRetry = () => {
    fetchData();
  };
  
  // 페이지 제목 우측 버튼
  const pageExtra = (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => setIsCreateModalVisible(true)}
    >
      새 사용자
    </Button>
  );
  
  if (error) {
    return (
      <MainLayout>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '16px' 
        }}>
          {pageExtra}
        </div>
        <ErrorResult 
          status="error" 
          title="데이터 로드 오류" 
          subTitle={error} 
          onRetry={handleRetry} 
        />
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '16px' 
      }}>
        {pageExtra}
      </div>
      
      <CustomTable
        dataSource={data}
        columns={columns}
        loading={loading}
        rowKey="userId"
        pagination={false} // 페이지네이션 비활성화
        showSettings={false}
        showExport={false}
      />
      
      {/* 사용자 생성 모달 */}
      <Modal
        title="새 사용자 생성"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsCreateModalVisible(false)}>
            취소
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={() => form.submit()}
          >
            생성
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ userRole: 'USER', userDepartment: 'CS' }}
        >
          <Form.Item
            name="userId"
            label="사용자 ID"
            rules={[{ required: true, message: '사용자 ID를 입력하세요' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="사용자 ID 입력" 
            />
          </Form.Item>
          
          <Form.Item
            name="userPassword"
            label="비밀번호"
            rules={[
              { required: true, message: '비밀번호를 입력하세요' },
              { min: 6, message: '비밀번호는 6자 이상이어야 합니다' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="비밀번호 입력" 
            />
          </Form.Item>
          
          <Form.Item
            name="userDepartment"
            label="부서"
            rules={[{ required: true, message: '부서를 선택하세요' }]}
          >
            <Select placeholder="부서 선택">
              {DEPARTMENT_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="userRole"
            label="권한"
            rules={[{ required: true, message: '권한을 선택하세요' }]}
          >
            <Select placeholder="권한 선택">
              {ROLE_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </MainLayout>
  );
};

export default UserManagePage;

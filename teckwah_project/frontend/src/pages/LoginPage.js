// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = ({ staticUrl }) => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();  // 컴포넌트 최상위 레벨에서 useAuth 사용

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await login(values.user_id, values.password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f0f2f5'
    }}>
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img 
            src={`${staticUrl}logo.png`}
            alt="Logo" 
            style={{ height: 64, marginBottom: 16 }} 
          />
          <h2>배송 실시간 관제 시스템</h2>
        </div>
        
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="user_id"
            rules={[
              { required: true, message: '아이디를 입력해주세요' },
              { whitespace: true, message: '공백은 허용되지 않습니다' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="아이디" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '비밀번호를 입력해주세요' },
              { min: 4, message: '비밀번호는 4자 이상이어야 합니다' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="비밀번호"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              size="large"
              loading={loading}
            >
              로그인
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
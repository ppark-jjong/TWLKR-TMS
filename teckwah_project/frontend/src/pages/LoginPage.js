// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/AuthService';
import { useAuth } from '../contexts/AuthContext';
const LoginPage = ({ staticUrl }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 로그인 폼 제출
  const onFinish = async (values) => {
    setLoading(true);
    try {
      // ID 입력값 검증
      if (!values.user_id.trim()) {
        throw new Error('아이디를 입력해주세요');
      }
      
      // 비밀번호 입력값 검증
      if (!values.password || values.password.length < 4) {
        throw new Error('비밀번호는 4자 이상이어야 합니다');
      }

      const response = await AuthService.login(values.user_id, values.password);
      localStorage.setItem('access_token', response.token.access_token);
      localStorage.setItem('refresh_token', response.token.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
          // AuthContext 상태 업데이트
      const { login } = useAuth();
      await login(response.user);

      message.success('로그인되었습니다');
      navigate('/dashboard');
    } catch (error) {
      message.error(error.response?.data?.detail || error.message || '로그인 중 오류가 발생했습니다');
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
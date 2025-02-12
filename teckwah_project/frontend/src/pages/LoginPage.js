// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/AuthService';

/**
 * 로그인 페이지 컴포넌트
 */
const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /**
   * 로그인 폼 제출 처리
   * @param {Object} values - 폼 입력값 (user_id, password)
   */
  const onFinish = async (values) => {
    setLoading(true);
    try {
      await AuthService.login(values.user_id, values.password);
      message.success('로그인되었습니다');
      navigate('/dashboard');
    } catch (error) {
      message.error(error.message);
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
            src="/logo.png" 
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
            rules={[{ required: true, message: '아이디를 입력해주세요' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="아이디" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
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
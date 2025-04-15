/**
 * 로그인 페이지 컴포넌트
 */
import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Row,
  Col,
  message,
  Alert,
  Space,
} from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [loginError, setLoginError] = useState(null);

  // 이미 로그인된 경우 대시보드로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // 로그인 처리
  const handleLogin = async (values) => {
    setLoginError(null);

    try {
      const success = await login(values.userId, values.password);

      if (success) {
        navigate('/dashboard');
      } else {
        setLoginError(
          '로그인에 실패했습니다. <br> 사용자 ID 또는 비밀번호를 확인하세요.'
        );
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      setLoginError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f5f5',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Space direction="vertical" size={8}>
            <img src="/logo.png" alt="Logo" height={60} />
            <Title level={3} style={{ marginTop: 16, marginBottom: 0 }}>
              TWLKR-TMS
            </Title>
            <Text type="secondary">TeckwahKR - 배차 관리 시스템</Text>
          </Space>
        </div>

        {loginError && (
          <Alert
            message={loginError}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
            closable
            onClose={() => setLoginError(null)}
          />
        )}

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleLogin}
          size="large"
        >
          <Form.Item
            name="userId"
            rules={[{ required: true, message: '사용자 ID를 입력하세요' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="사용자 ID"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '비밀번호를 입력하세요' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="비밀번호"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              style={{ width: '100%' }}
              loading={isLoading}
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

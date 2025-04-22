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
  Space,
  Alert,
  message,
  Spin,
} from 'antd';
import { UserOutlined, LockOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [form] = Form.useForm();
  const [loginError, setLoginError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 쿼리 파라미터에서 리다이렉트 정보 가져오기
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect');
  const from = redirectPath || location.state?.from?.pathname || '/dashboard';
  const redirectMessage = location.state?.message;

  // 컴포넌트 마운트 시 파라미터 메시지 표시
  useEffect(() => {
    if (redirectMessage) {
      message.warning(redirectMessage);
    }
  }, [redirectMessage]);

  // 이미 로그인된 경우 대시보드로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // 로그인 처리
  const handleLogin = async (values) => {
    setLoginError(null);
    setIsSubmitting(true);

    try {
      console.log('로그인 시도:', values.userId);
      const result = await login(values.userId, values.password);

      if (result.success) {
        message.success('로그인 성공!');
        console.log('로그인 성공, 리다이렉트:', from);
        
        // 원래 접근하려던 페이지 또는 대시보드로 리다이렉트
        navigate(from, { replace: true });
      } else {
        console.log('로그인 실패:', result.message);
        setLoginError(result.message || '로그인에 실패했습니다. 사용자 ID 또는 비밀번호를 확인하세요.');
        
        // 비밀번호 필드 초기화
        form.setFieldsValue({ password: '' });
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      setLoginError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      
      // 비밀번호 필드 초기화
      form.setFieldsValue({ password: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 테스트 계정으로 로그인 (개발 환경에서만 표시)
  const loginAsAdmin = () => {
    form.setFieldsValue({ userId: 'admin', password: 'admin1234' });
    form.submit();
  };

  const loginAsUser = () => {
    form.setFieldsValue({ userId: 'user1', password: 'user1234' });
    form.submit();
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f0f2f5',
        padding: '0 16px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          borderRadius: '8px',
        }}
        bordered={true}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Space direction="vertical" size={8}>
            <img 
              src="/logo.png" 
              alt="Logo" 
              height={80} 
              style={{ 
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.1))',
                marginBottom: 8
              }} 
            />
            <Title level={3} style={{ marginTop: 8, marginBottom: 0 }}>
              TeckWahKRTMS
            </Title>
            <Text type="secondary">By TeckWahKR Operation Team</Text>
          </Space>
        </div>

        {loginError && (
          <Alert
            message="로그인 오류"
            description={loginError}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
            closable
            onClose={() => setLoginError(null)}
          />
        )}

        <Form
          name="login"
          form={form}
          initialValues={{ userId: '', password: '' }}
          onFinish={handleLogin}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="userId"
            rules={[{ required: true, message: '사용자 ID를 입력하세요' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.3)' }} />}
              placeholder="사용자 ID"
              autoComplete="username"
              disabled={isSubmitting}
              autoFocus
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '비밀번호를 입력하세요' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.3)' }} />}
              placeholder="비밀번호"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              style={{ width: '100%', height: 44 }}
              loading={isSubmitting}
              disabled={isLoading}
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </Button>
          </Form.Item>
        </Form>

        {process.env.NODE_ENV !== 'production' && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>개발 환경 전용 - 빠른 로그인</Text>
            <div style={{ marginTop: 8 }}>
              <Space>
                <Button size="small" onClick={loginAsAdmin}>관리자 계정</Button>
                <Button size="small" onClick={loginAsUser}>일반 사용자 계정</Button>
              </Space>
            </div>
          </div>
        )}

        {isLoading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.6)',
            borderRadius: '8px',
            zIndex: 10
          }}>
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} 
              tip="인증 확인 중..."
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default LoginPage;
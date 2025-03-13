// frontend/src/pages/LoginPage.js
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FONT_STYLES } from '../utils/Constants';
import ErrorHandler from '../utils/ErrorHandler';
import message from '../utils/message';
import LoadingSpin from '../components/common/LoadingSpin';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      // 이미 인증된 경우 적절한 페이지로 리다이렉트
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const redirectTo = user.user_role === 'ADMIN' ? '/admin' : '/dashboard';
      navigate(redirectTo);
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values) => {
    if (loading) return;

    setLoading(true);
    setError('');
    message.loading('로그인 중...', 'login');

    try {
      // 백엔드 API 요구사항에 맞게 login 함수 호출
      // user_id와 password 필드 전달
      const result = await login(values.user_id, values.password);
      console.log('로그인 성공:', result);

      // 성공 메시지
      message.success('로그인되었습니다');

      // login 함수 내에서 권한에 따른 리다이렉트 처리
    } catch (err) {
      console.error('Login error:', err);

      // 구체적인 에러 메시지 추출 및 표시
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';

      setError(errorMessage);
      form.setFields([
        {
          name: 'password',
          errors: [errorMessage],
        },
      ]);

      message.error(errorMessage);
    } finally {
      setLoading(false);
      message.destroy('login');
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
      }}
    >
      {loading && <LoadingSpin />}

      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderRadius: '8px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src="/static/logo.png"
            alt="Logo"
            style={{ height: 64, marginBottom: 16 }}
          />
          <h2 style={FONT_STYLES.TITLE.LARGE}>배송 실시간 관제 시스템</h2>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="user_id"
            rules={[
              { required: true, message: '아이디를 입력해주세요' },
              { whitespace: true, message: '공백은 허용되지 않습니다' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="아이디"
              size="large"
              disabled={loading}
              style={FONT_STYLES.BODY.MEDIUM}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '비밀번호를 입력해주세요' },
              { min: 4, message: '비밀번호는 4자 이상이어야 합니다' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="비밀번호"
              size="large"
              disabled={loading}
              style={FONT_STYLES.BODY.MEDIUM}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
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

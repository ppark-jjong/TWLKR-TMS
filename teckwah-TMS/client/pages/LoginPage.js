// src/pages/LoginPage.js
import React, { useState } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Typography,
  Alert,
  Spin,
} from 'antd';
import { UserOutlined, LockOutlined, ReloadOutlined } from '@ant-design/icons';
import { loginUser } from '../utils/AuthHelpers';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const LoginPage = ({ setAuth, setUserData }) => {
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoginError(null);
    setLoading(true);

    try {
      const response = await loginUser(values);

      if (response && response.success) {
        message.success({
          content: '로그인에 성공했습니다',
          key: 'login-success',
        });

        setAuth(true);
        if (response.user && setUserData) {
          setUserData(response.user);
        }

        // 사용자 역할에 따라 적절한 페이지로 리다이렉트
        const role = response.user?.user_role || 'USER';
        if (role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setLoginError({
          message: response.message || '로그인에 실패했습니다',
          type: response.errorType || 'error',
        });
      }
    } catch (error) {
      console.error('로그인 처리 중 예상치 못한 오류:', error);
      setLoginError({
        message:
          '로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <Card className="login-card">
          <div className="login-logo-container">
            <img src="/logo.png" alt="Teckwah Logo" className="login-logo" />
          </div>

          {loginError && (
            <Alert
              message={loginError.message}
              type={loginError.type}
              showIcon
              className="login-alert"
              action={
                <Button
                  size="small"
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                >
                  새로고침
                </Button>
              }
            />
          )}

          <Form
            name="login"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            className="login-form"
          >
            <Form.Item
              name="user_id"
              rules={[{ required: true, message: '아이디를 입력해주세요' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="아이디"
                autoComplete="username"
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
                autoComplete="current-password"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="login-button"
              >
                로그인
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;

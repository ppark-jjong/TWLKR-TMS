// frontend/src/pages/LoginPage.js
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FONT_STYLES } from '../utils/Constants';
import ErrorHandler from '../utils/ErrorHandler';
import message from '../utils/message';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values) => {
    if (loading) return;

    setLoading(true);
    message.loading('로그인 중...', 'login');

    try {
      await login(values.user_id, values.password);
    } catch (error) {
      ErrorHandler.handle(error, 'login');
      form.setFields([
        {
          name: 'password',
          errors: ['아이디 또는 비밀번호를 확인해주세요'],
        },
      ]);
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
        backgroundColor: '#fff',
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Spin spinning={loading} tip="로그인 중...">
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
        </Spin>
      </Card>
    </div>
  );
};

export default LoginPage;

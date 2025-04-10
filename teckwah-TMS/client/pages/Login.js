import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Row, Col, Alert, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/Login.css';

const { Title } = Typography;

const Login = () => {
  const { login, error, setError, loading } = useAuth();
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [loginLoading, setLoginLoading] = useState(false);

  const onFinish = async (values) => {
    setLoginLoading(true);
    try {
      const user = await login({
        user_id: values.username,
        password: values.password
      });

      if (user) {
        navigate('/dashboard');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
        <Col xs={22} sm={16} md={12} lg={8} xl={6}>
          <Card className="login-card">
            <div className="login-header">
              <Title level={2} className="login-title">배송 실시간 관제 시스템</Title>
              <div className="system-version">v1.0.0</div>
            </div>
            
            {error && (
              <Alert
                message="로그인 오류"
                description={error}
                type="error"
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: 24 }}
              />
            )}
            
            <Form
              form={form}
              name="login"
              onFinish={onFinish}
              layout="vertical"
              requiredMark={false}
              initialValues={{ remember: true }}
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: '사용자 아이디를 입력해주세요' }]}
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="아이디" 
                  size="large"
                  autoComplete="username"
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
                  autoComplete="current-password"
                />
              </Form.Item>
              
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="login-button"
                  size="large"
                  loading={loginLoading}
                  block
                >
                  로그인
                </Button>
              </Form.Item>
            </Form>
            
            <div className="login-footer">
              <div className="company-info">
                © 2025 Teckwah TMS
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      {/* 전체 로딩 중 상태 */}
      {loading && (
        <div className="global-loading">
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};

export default Login;
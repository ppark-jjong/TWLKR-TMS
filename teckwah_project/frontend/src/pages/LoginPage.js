// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { Form, Input, Button, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { FONT_STYLES } from '../utils/Constants';
import message, { MessageKeys, MessageTemplates } from '../utils/message';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    const key = MessageKeys.AUTH.LOGIN;
    setLoading(true);
    message.loading('로그인 중...', key);

    try {
      await login(values.user_id, values.password);
      message.loadingToSuccess(MessageTemplates.AUTH.LOGIN_SUCCESS, key);
    } catch (error) {
      // ErrorHandler에서 401 에러에 대한 처리를 하도록 함
      message.loadingToError(MessageTemplates.AUTH.LOGIN_FAIL, key);
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
      backgroundColor: '#fff'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
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
              { whitespace: true, message: '공백은 허용되지 않습니다' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="아이디" 
              size="large"
              style={FONT_STYLES.BODY.MEDIUM}
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
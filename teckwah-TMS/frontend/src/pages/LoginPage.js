import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login } from '../api/AuthService';
import { setAuth } from '../utils/Auth';
import { useNavigate } from 'react-router-dom';
import logo from '../logo.png';

/**
 * 로그인 페이지 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Function} props.setAuth - 인증 상태 설정 함수
 * @param {Function} props.setUserData - 사용자 데이터 설정 함수
 */
const LoginPage = ({ setAuth, setUserData }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // 로그인 폼 제출 처리
  const handleSubmit = async (values) => {
    const { username, password } = values;

    setLoading(true);

    try {
      // 로그인 API 호출 - username을 user_id로 매핑
      const response = await login(username, password);

      if (response.success) {
        // 로그인 성공
        message.success('로그인 성공');

        // 세션 기반 인증 - 로컬에 별도 저장하지 않음
        // App.js의 인증 상태 업데이트
        setAuth(response.data.user);

        // 사용자 정보 설정
        setUserData(response.data.user);
        
        // 대시보드 페이지로 수동 리다이렉션
        navigate('/dashboard');
      } else {
        // 로그인 실패
        message.error(response.message || '로그인에 실패했습니다');
      }
    } catch (error) {
      // 오류 처리 - 사용자 친화적인 메시지
      console.error('로그인 오류:', error);

      if (!navigator.onLine) {
        message.error(
          '인터넷 연결이 끊어졌습니다. 네트워크 연결을 확인해주세요.'
        );
      } else if (error.error_code === 'UNAUTHORIZED') {
        message.error('아이디 또는 비밀번호가 일치하지 않습니다.');
      } else if (error.error_code === 'NETWORK_ERROR') {
        message.error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      } else {
        message.error(error.message || '로그인 중 오류가 발생했습니다');
      }
    } finally {
      setLoading(false);
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
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderRadius: 8,
        }}
      >
        {/* 로고 및 제목 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src={logo}
            alt="Teckwah 로고"
            style={{ height: 64, marginBottom: 16 }}
          />
          <Typography.Title level={3} style={{ margin: 0 }}>
            TeckwahKR-TMS
          </Typography.Title>
          <Typography.Text type="secondary">배송 관리 시스템</Typography.Text>
        </div>

        {/* 로그인 폼 */}
        <Form
          form={form}
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleSubmit}
          layout="vertical"
        >
          {/* 사용자 ID 입력 필드 */}
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '사용자 아이디를 입력해주세요' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="사용자 아이디"
              size="large"
            />
          </Form.Item>

          {/* 비밀번호 입력 필드 */}
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

          {/* 로그인 버튼 */}
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%', height: 40 }}
              size="large"
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

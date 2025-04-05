// src/pages/LoginPage.js
import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Typography,
  Alert,
  Space,
  Spin,
  Divider
} from "antd";
import { UserOutlined, LockOutlined, ReloadOutlined } from "@ant-design/icons";
import { loginUser } from "../utils/authHelpers";
import { useNavigate } from "react-router-dom";
import { colors, shadows } from "../styles/commonStyles";

const { Title, Text } = Typography;

const LoginPage = ({ setAuth, setUserData }) => {
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();

  // 페이지 로딩 시 애니메이션 효과를 위한 상태
  useEffect(() => {
    // 잠시 지연 후 로딩 상태 해제 (UI 부드럽게 전환)
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const onFinish = async (values) => {
    // 이전 오류 메시지 초기화
    setLoginError(null);
    setLoading(true);

    try {
      const response = await loginUser(values);

      if (response && response.success) {
        // 성공 메시지는 한 번만 표시
        message.success("로그인에 성공했습니다");
        setAuth(true);
        if (response.user && setUserData) {
          setUserData(response.user);
        }

        // 사용자 역할에 따라 적절한 페이지로 리다이렉트
        const role = response.user?.user_role || "USER";
        if (role === "ADMIN") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } else {
        // 로그인 실패 - 오류 메시지 설정 (Alert 컴포넌트로 표시)
        setLoginError({
          message: response.message || "로그인에 실패했습니다",
          type: response.errorType || "error",
        });
      }
    } catch (error) {
      // 예상치 못한 오류 (이 부분은 정상적으로는 실행되지 않아야 함)
      console.error("로그인 처리 중 예상치 못한 오류:", error);
      setLoginError({
        message:
          "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 새로고침 처리 함수
  const handleRefresh = () => {
    window.location.reload();
  };

  if (initialLoading) {
    return (
      <div className="login-loading-container">
        <Spin size="large" tip="로딩 중..." />
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo-container">
          <img src="/logo.png" alt="Teckwah Logo" className="login-logo" />
        </div>
        <Card className="login-card">
          <div className="login-header">
            <Title level={3}>TeckwahTMS</Title>
            <Text type="secondary">배송 실시간 관제 시스템</Text>
          </div>

          <Divider />

          {loginError && (
            <Alert
              message={loginError.message}
              type={loginError.type}
              showIcon
              className="login-alert"
              action={
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  title="새로고침"
                />
              }
            />
          )}

          <Form
            name="login"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            size="large"
            className="login-form"
          >
            <Form.Item
              name="user_id"
              rules={[{ required: true, message: "아이디를 입력해주세요" }]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="아이디" 
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "비밀번호를 입력해주세요" }]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="비밀번호" 
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                block
                className="login-button"
              >
                로그인
              </Button>
            </Form.Item>
          </Form>

          <div className="login-footer">
            <Text type="secondary">© {new Date().getFullYear()} Teckwah. All rights reserved.</Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;

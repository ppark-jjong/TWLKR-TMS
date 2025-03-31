// src/pages/LoginPage.js
import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Typography,
  Alert,
  Space,
} from "antd";
import { UserOutlined, LockOutlined, ReloadOutlined } from "@ant-design/icons";
import { loginUser } from "../utils/authHelpers";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

const LoginPage = ({ setAuth, setUserData }) => {
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const navigate = useNavigate();

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

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 400, boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={3}>배송 실시간 관제 시스템</Title>
        </div>

        {loginError && (
          <Alert
            message={loginError.message}
            type={loginError.type}
            showIcon
            style={{ marginBottom: 16 }}
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
        >
          <Form.Item
            name="user_id"
            rules={[{ required: true, message: "아이디를 입력해주세요" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="아이디" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "비밀번호를 입력해주세요" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
          </Form.Item>

          <Form.Item>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button type="primary" htmlType="submit" loading={loading} block>
                로그인
              </Button>
              {loginError && (
                <Button icon={<ReloadOutlined />} onClick={handleRefresh} block>
                  새로고침
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;

// src/pages/LoginPage.js
import React, { useState } from "react";
import { Form, Input, Button, Card, message, Typography, Alert } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { loginUser } from "../utils/authHelpers";

const { Title } = Typography;

const LoginPage = ({ setAuth, setUserData }) => {
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

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
      } else {
        // 로그인 실패 - 오류 메시지 설정 (Alert 컴포넌트로 표시)
        setLoginError({
          message: response.message,
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
            <Button type="primary" htmlType="submit" loading={loading} block>
              로그인
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;

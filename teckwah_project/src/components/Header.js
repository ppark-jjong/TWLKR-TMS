// src/components/Header.js
import React from "react";
import { Layout, Button, Space, Typography, Dropdown, Avatar } from "antd";
import { UserOutlined, LogoutOutlined, DownOutlined } from "@ant-design/icons";
import { logout } from "../utils/api";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header = ({ userData, setAuth }) => {
  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setAuth(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const items = [
    {
      label: "로그아웃",
      key: "logout",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader
      style={{
        background: "#fff",
        padding: "0 24px",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        boxShadow: "0 1px 4px rgba(0,21,41,.08)",
      }}
    >
      <Space>
        <Dropdown menu={{ items }} placement="bottomRight">
          <Space style={{ cursor: "pointer" }}>
            <Avatar icon={<UserOutlined />} />
            <Text>{userData?.user_id || "사용자"}</Text>
            <Text type="secondary">
              ({userData?.user_department || "부서없음"})
            </Text>
            <DownOutlined />
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
};

export default Header;

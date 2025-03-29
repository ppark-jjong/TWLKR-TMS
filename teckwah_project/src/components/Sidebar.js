// src/components/Sidebar.js
import React, { useState } from "react";
import { Layout, Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  BarChartOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { isAdmin } from "../utils/authHelpers";

const { Sider } = Layout;

const Sidebar = ({ userData }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminUser = isAdmin();

  const menuItems = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: "대시보드",
      onClick: () => navigate("/dashboard"),
    },
    {
      key: "visualization",
      icon: <BarChartOutlined />,
      label: "시각화",
      onClick: () => navigate("/visualization"),
    },
    ...(isAdminUser
      ? [
          {
            key: "admin",
            icon: <SettingOutlined />,
            label: "관리자",
            onClick: () => navigate("/admin"),
          },
        ]
      : []),
  ];

  // 현재 선택된 메뉴 항목 결정
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes("/dashboard")) return "dashboard";
    if (path.includes("/visualization")) return "visualization";
    if (path.includes("/admin")) return "admin";
    return "";
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
      theme="dark"
    >
      <div className="logo">{!collapsed ? "배송 관제 시스템" : ""}</div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        items={menuItems}
      />
    </Sider>
  );
};

export default Sidebar;

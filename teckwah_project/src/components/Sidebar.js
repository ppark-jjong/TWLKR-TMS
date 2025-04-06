// src/components/Sidebar.js
import React, { useState, useEffect } from "react";
import { Layout, Menu, Avatar, Tooltip, Divider } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { logout } from "../utils/api";

const { Sider } = Layout;

const Sidebar = ({ userData, setAuth }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 화면 크기에 따른 사이드바 상태 자동 조정
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };

    // 초기 로드 시 한 번 체크
    handleResize();

    // 리사이즈 이벤트 리스너 등록
    window.addEventListener("resize", handleResize);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 사용자 권한 확인
  const isAdminUser = userData?.user_role === "ADMIN";

  // 사이드바 토글 핸들러
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  // 로그아웃 핸들러
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

  // 권한별 메뉴 아이템 필터링
  const getMenuItems = () => {
    // 공통 메뉴 아이템 (인수인계는 모든 사용자 공통)
    const commonItems = [
      {
        key: "handover",
        icon: <FileTextOutlined />,
        label: "인수인계",
        onClick: () => navigate("/handover"),
      },
    ];

    // Admin 전용 메뉴
    if (isAdminUser) {
      return [
        {
          key: "admin",
          icon: <SettingOutlined />,
          label: "TMS",
          onClick: () => navigate("/admin"),
        },
        {
          key: "users",
          icon: <TeamOutlined />,
          label: "사용자 관리",
          onClick: () => navigate("/admin/users"),
        },
        ...commonItems,
      ];
    }

    // User 전용 메뉴
    return [
      {
        key: "dashboard",
        icon: <DashboardOutlined />,
        label: "TMS",
        onClick: () => navigate("/dashboard"),
      },
      ...commonItems,
    ];
  };

  // 현재 선택된 메뉴 항목 결정
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes("/dashboard")) return "dashboard";
    if (path.includes("/handover")) return "handover";
    if (path.includes("/admin/users")) return "users";
    if (path.includes("/admin")) return "admin";
    return "";
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      theme="light"
      width={220}
      className="site-sidebar"
      breakpoint="lg"
      collapsedWidth={window.innerWidth < 576 ? 0 : 64}
    >
      <div className="sidebar-logo">
        <div className="logo-container">
          <img src="/logo.png" alt="Logo" className="logo-image" />
          {/* 로고 옆 텍스트 제거 */}
        </div>
        <div className="trigger-icon" onClick={toggleCollapsed}>
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        items={getMenuItems()}
        className="sidebar-menu"
      />

      <div className="sidebar-footer">
        <div className="user-profile">
          <Avatar
            size={collapsed ? "small" : "default"}
            icon={<UserOutlined />}
          />

          {!collapsed && (
            <div className="user-info">
              <div className="user-name">{userData?.user_id || "사용자"}</div>
              <div className="user-role">
                {userData?.user_department || "-"}
              </div>
            </div>
          )}
        </div>

        <Divider style={{ margin: "8px 0" }} />

        <Tooltip title={collapsed ? "로그아웃" : ""} placement="right">
          <div className="logout-button" onClick={handleLogout}>
            <LogoutOutlined />
            {!collapsed && <span className="logout-text">로그아웃</span>}
          </div>
        </Tooltip>
      </div>
    </Sider>
  );
};

export default Sidebar;

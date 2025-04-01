// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { logout } from '../utils/api';

const { Sider } = Layout;
const { Text } = Typography;

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
    window.addEventListener('resize', handleResize);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 사용자 권한 확인 (직접 확인으로 변경)
  const isAdminUser = userData?.user_role === 'ADMIN';

  // 사이드바 토글 핸들러
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setAuth(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // 권한별 메뉴 아이템 필터링
  const getMenuItems = () => {
    // 공통 메뉴 아이템 (인수인계는 모든 사용자 공통)
    const commonItems = [
      {
        key: 'handover',
        icon: <FileTextOutlined />,
        label: '인수인계',
        onClick: () => navigate('/handover'),
      },
    ];

    // Admin 전용 메뉴
    if (isAdminUser) {
      return [
        {
          key: 'admin',
          icon: <SettingOutlined />,
          label: 'TMS',
          onClick: () => navigate('/admin'),
        },
        {
          key: 'users',
          icon: <TeamOutlined />,
          label: '사용자 관리',
          onClick: () => navigate('/admin/users'),
        },
        ...commonItems,
      ];
    }

    // User 전용 메뉴
    return [
      {
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: 'TMS',
        onClick: () => navigate('/dashboard'),
      },
      ...commonItems,
    ];
  };

  // 현재 선택된 메뉴 항목 결정
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/handover')) return 'handover';
    if (path.includes('/admin/users')) return 'users';
    if (path.includes('/admin')) return 'admin';
    return '';
  };

  // 사용자 메뉴 항목
  const userMenuItems = [
    {
      label: '로그아웃',
      key: 'logout',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={toggleCollapsed}
      trigger={null}
      theme="light"
      width={220}
      className="site-sidebar"
      breakpoint="lg"
      collapsedWidth={window.innerWidth < 576 ? 0 : 80}
    >
      <div className="logo">
        <img src="/logo.png" alt="Logo" className="logo-image" />
        {!collapsed && <span className="logo-text">TMS System</span>}
      </div>

      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        items={getMenuItems()}
      />

      <div className="sidebar-user-info">
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="topRight"
          trigger={['click']}
        >
          <Space className="user-dropdown">
            <Avatar icon={<UserOutlined />} size="small" />
            {!collapsed && (
              <div className="user-info">
                <Text className="user-name">{userData?.user_id || 'User'}</Text>
                <Text className="user-dept">
                  {userData?.user_department || 'No Department'}
                </Text>
              </div>
            )}
          </Space>
        </Dropdown>
      </div>

      <div className="sidebar-trigger" onClick={toggleCollapsed}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </div>
    </Sider>
  );
};

export default Sidebar;

// frontend/src/components/common/Sidebar.js
import React from 'react';
import { Layout, Menu, Typography, Avatar, message } from 'antd';
import {
  DashboardOutlined,
  BarChartOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Sider } = Layout;
const { Title } = Typography;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      message.success('로그아웃되었습니다');
      navigate('/login');
    } catch (error) {
      message.error('로그아웃 중 오류가 발생했습니다');
    }
  };

  // 권한별 접근 가능 메뉴 설정
  const getAuthorizedMenuItems = () => {
    // 사용자 권한 확인
    const isAdmin = user?.user_role === 'ADMIN';

    // 기본 메뉴 아이템 (로그아웃은 공통)
    const baseMenuItems = [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '로그아웃',
        onClick: handleLogout,
      },
    ];

    // 관리자 권한인 경우 - 관리, 통계 메뉴 표시
    if (isAdmin) {
      return [
        {
          key: '/admin',
          icon: <SettingOutlined />,
          label: '관리',
          onClick: () => navigate('/admin'),
        },
        {
          key: '/visualization',
          icon: <BarChartOutlined />,
          label: '통계',
          onClick: () => navigate('/visualization'),
        },
        ...baseMenuItems,
      ];
    }

    // 일반 사용자 권한인 경우 - 배차, 통계 메뉴 표시
    return [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: '배차',
        onClick: () => navigate('/dashboard'),
      },
      {
        key: '/visualization',
        icon: <BarChartOutlined />,
        label: '통계',
        onClick: () => navigate('/visualization'),
      },
      ...baseMenuItems,
    ];
  };

  const menuItems = getAuthorizedMenuItems();

  return (
    <Sider width={200} theme="light">
      <div style={{ padding: '24px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <img
          src="/static/logo.png"
          alt="Logo"
          style={{ width: 130, height: 58, marginBottom: 16, display: 'block' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <Avatar icon={<UserOutlined />} />
          <div style={{ marginLeft: 8 }}>
            <Title level={5} style={{ margin: 0 }}>
              {user?.user_id}
            </Title>
            <Typography.Text type="secondary">
              {user?.user_department}
            </Typography.Text>
          </div>
        </div>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
      />
    </Sider>
  );
};

export default Sidebar;

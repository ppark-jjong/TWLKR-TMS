// frontend/src/components/common/Sidebar.js
import React from 'react';
import { Layout, Menu, Typography, Avatar, message } from 'antd';
import {
  DashboardOutlined,
  BarChartOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../../contexts/DashboardContext';

const { Sider } = Layout;
const { Title } = Typography;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { userRole } = useDashboard();

  // 사용자 역할 확인 (Context에서 우선 확인, 없으면 Auth Context 사용)
  const isAdmin = userRole === 'ADMIN' || user?.user_role === 'ADMIN';

  const handleLogout = async () => {
    try {
      await logout();
      message.success('로그아웃되었습니다');
      navigate('/login');
    } catch (error) {
      message.error('로그아웃 중 오류가 발생했습니다');
    }
  };

  // 메뉴 아이템 (모든 사용자 공통)
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: isAdmin ? '관리' : '배차', // 역할에 따라 다른 레이블 표시
      onClick: () => navigate('/dashboard'),
    },
    {
      key: '/visualization',
      icon: <BarChartOutlined />,
      label: '통계',
      onClick: () => navigate('/visualization'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      onClick: handleLogout,
    },
  ];

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
              {user?.user_department} {isAdmin ? '[관리자]' : ''}
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

/**
 * 메인 레이아웃 컴포넌트
 */
import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Space, Avatar } from 'antd';
import { 
  MenuFoldOutlined, MenuUnfoldOutlined, 
  DashboardOutlined, SwapOutlined, 
  BarChartOutlined, UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // 현재 선택된 메뉴 키 계산
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/handover')) return 'handover';
    if (path.startsWith('/visualization')) return 'visualization';
    if (path.startsWith('/users')) return 'users';
    return 'dashboard';
  };
  
  // 사이드바 접기/펼치기 토글
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigate('/login');
    }
  };

  // 현재 사용자 프로필 메뉴
  const profileMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '로그아웃',
        onClick: handleLogout
      }
    ]
  };

  // 관리자 전용 메뉴 아이템
  const adminMenuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">대시보드</Link>
    },
    {
      key: 'handover',
      icon: <SwapOutlined />,
      label: <Link to="/handover">인수인계</Link>
    },
    {
      key: 'visualization',
      icon: <BarChartOutlined />,
      label: <Link to="/visualization">시각화</Link>
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: <Link to="/users">사용자 관리</Link>
    }
  ];

  // 일반 사용자 메뉴 아이템
  const userMenuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">대시보드</Link>
    },
    {
      key: 'handover',
      icon: <SwapOutlined />,
      label: <Link to="/handover">인수인계</Link>
    }
  ];

  // 사용자 권한에 따른 메뉴 아이템 선택
  const menuItems = currentUser?.userRole === 'ADMIN' ? adminMenuItems : userMenuItems;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed} 
        theme="light"
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 100
        }}
      >
        <div style={{ 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 16px' 
        }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              height: '40px', 
              marginRight: collapsed ? '0' : '8px' 
            }} 
          />
          {!collapsed && <h1 style={{ margin: 0, fontSize: '18px' }}>TeckwahKR-TMS</h1>}
        </div>
        
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleCollapsed}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          
          <Space>
            <Dropdown menu={profileMenu} placement="bottomRight">
              <Button type="text" style={{ height: 64 }}>
                <Space>
                  <Avatar icon={<UserOutlined />} />
                  {currentUser?.userId}
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>
        
        <Content style={{ 
          margin: '24px 16px', 
          padding: 24, 
          background: '#fff',
          borderRadius: '4px',
          minHeight: 280,
          overflow: 'auto'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

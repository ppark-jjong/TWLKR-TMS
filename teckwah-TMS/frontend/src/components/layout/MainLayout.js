/**
 * 메인 레이아웃 컴포넌트
 */
import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Space, Avatar, Tooltip } from 'antd';
import { 
  MenuFoldOutlined, MenuUnfoldOutlined, 
  DashboardOutlined, SwapOutlined, 
  BarChartOutlined, UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Sider, Content } = Layout;

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // 화면 크기에 따라 사이드바 자동 접기 구현
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    
    // 초기 로드 시 실행
    handleResize();
    
    // resize 이벤트 리스너 추가
    window.addEventListener('resize', handleResize);
    
    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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

  // 관리자 전용 메뉴 아이템
  const adminMenuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">TMS</Link>
    },
    {
      key: 'handover',
      icon: <SwapOutlined />,
      label: <Link to="/handover">Work-Notice</Link>
    },
    {
      key: 'visualization',
      icon: <BarChartOutlined />,
      label: <Link to="/visualization">Visualization</Link>
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
      label: <Link to="/dashboard">TMS</Link>
    },
    {
      key: 'handover',
      icon: <SwapOutlined />,
      label: <Link to="/handover">Work-Notice</Link>
    }
  ];

  // 사용자 권한에 따른 메뉴 아이템 선택
  const menuItems = currentUser?.userRole === 'ADMIN' ? adminMenuItems : userMenuItems;

  return (
    <Layout style={{ minHeight: '100vh', background: '#ffffff' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed} 
        theme="light"
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 100,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
        width={240}
      >
        {/* 시스템 로고 및 이름 - 상단 로고 제거 */}
        <div style={{ 
          padding: '28px 16px 24px', 
          textAlign: 'center',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: collapsed ? '1.2rem' : '1.6rem',
            fontWeight: 700, 
            letterSpacing: '0.5px',
            textAlign: 'center', 
            width: '100%',
            color: '#1890ff',
            background: 'linear-gradient(to right, #1890ff, #36cfc9)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            {collapsed ? 'TMS' : 'TWLKR-TMS'}
          </h1>
        </div>
        
        {/* 사용자 정보 */}
        <div style={{ 
          padding: '16px', 
          display: 'flex',
          alignItems: 'center', 
          gap: '16px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          background: 'rgba(0, 0, 0, 0.02)'
        }}>
          <Avatar 
            icon={<UserOutlined />} 
            style={{ 
              backgroundColor: '#1890ff', 
              color: '#fff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }} 
          />
          {!collapsed && (
            <div>
              <div style={{ 
                fontWeight: 600, 
                fontSize: '14px',
                color: '#333'
              }}>
                {currentUser?.userId}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#fff',
                backgroundColor: '#1890ff',
                padding: '2px 8px',
                borderRadius: '10px',
                display: 'inline-block',
                marginTop: '4px'
              }}>
                {currentUser?.userDepartment}
              </div>
            </div>
          )}
        </div>

        {/* 메뉴 항목 */}
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          style={{ 
            borderRight: 0,
            flex: 1,
            paddingTop: '8px',
            backgroundColor: 'transparent',
          }}
          theme="light"
        />
        
        <div style={{ marginTop: 'auto' }}>
          {/* 하단 로그아웃 버튼 */}
          <div style={{ 
            padding: '16px',
            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          }}>
            <Button
              type="primary"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '8px',
                transition: 'all 0.3s'
              }}
            >
              {!collapsed && '로그아웃'}
            </Button>
          </div>
          
          {/* 사이드바 하단 로고 - 하단으로 이동시키고 더 크게 표시 */}
          <div style={{
            padding: '16px 16px 24px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
            background: 'rgba(0, 0, 0, 0.02)',
          }}>
            <img 
              src="/logo.png" 
              alt="Teckwah 로고" 
              style={{
                width: collapsed ? '40px' : '80px',
                height: 'auto',
                opacity: 1,
                filter: 'none'
              }}
            />
          </div>
        </div>
      </Sider>
      
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'all 0.2s' }}>
        {/* 사이드바 토글 버튼 */}
        <div style={{ 
          padding: '16px',
          display: 'flex',
          justifyContent: 'flex-start'
        }}>
          <Tooltip title={collapsed ? "메뉴 펼치기" : "메뉴 접기"}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
              style={{ 
                fontSize: '16px',
                width: '40px',
                height: '40px'
              }}
            />
          </Tooltip>
        </div>
        
        <Content style={{ 
          margin: '0 16px 16px',
          padding: '16px 24px', 
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          minHeight: 280,
          border: '1px solid rgba(0, 0, 0, 0.06)'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
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
    <Layout style={{ minHeight: '100vh' }}>
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
          overflow: 'auto'
        }}
        width={240}
      >
        {/* 시스템 로고 및 이름 */}
        <div style={{ 
          padding: '20px 15px', 
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0',
          position: 'relative'
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            fontWeight: 700, 
            letterSpacing: '0.5px',
            textAlign: 'center', 
            width: '100%',
            display: collapsed ? 'none' : 'block'
          }}>
            TWLKR-TMS
          </h1>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              position: collapsed ? 'static' : 'absolute',
              top: collapsed ? 'auto' : '10px',
              right: collapsed ? 'auto' : '15px',
              width: '32px',
              height: 'auto',
              margin: collapsed ? '0 auto' : '0'
            }} 
          />
        </div>
        
        {/* 사용자 정보 */}
        <div style={{ 
          padding: '16px', 
          display: 'flex',
          alignItems: 'center', 
          gap: '16px',
          borderBottom: '1px solid #f0f0f0',
          background: '#f5f7fa'
        }}>
          <Avatar 
            icon={<UserOutlined />} 
            style={{ 
              backgroundColor: '#e6f7ff', 
              color: '#1890ff' 
            }} 
          />
          {!collapsed && (
            <div>
              <div style={{ 
                fontWeight: 600, 
                fontSize: '14px' 
              }}>
                {currentUser?.userId}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#666',
                backgroundColor: '#e6f7ff',
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
            paddingTop: '8px' 
          }}
        />
        
        {/* 하단 로그아웃 버튼 */}
        <div style={{ 
          padding: '16px',
          borderTop: '1px solid #f0f0f0',
          marginTop: 'auto'
        }}>
          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '8px',
              border: '1px solid #f0f0f0'
            }}
          >
            {!collapsed && '로그아웃'}
          </Button>
        </div>
        
        {/* 사이드바 하단 로고 */}
        <div style={{
          padding: '16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderTop: '1px solid #f0f0f0'
        }}>
          <img 
            src="/logo.png" 
            alt="Teckwah 로고" 
            style={{
              maxWidth: '90%',
              height: 'auto'
            }}
          />
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
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          minHeight: 280
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
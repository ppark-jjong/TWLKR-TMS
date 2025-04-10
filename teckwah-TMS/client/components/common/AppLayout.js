import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Badge, Alert } from 'antd';
import { 
  MenuUnfoldOutlined, 
  MenuFoldOutlined, 
  DashboardOutlined, 
  UserOutlined, 
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  SwapOutlined
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import apiService from '../../utils/api';
import '../../styles/AppLayout.css';

const { Header, Sider, Content } = Layout;

/**
 * 앱 레이아웃 컴포넌트
 * 사이드바, 헤더, 푸터를 포함한 공통 레이아웃
 */
const AppLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [notices, setNotices] = useState([]);
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // 알림 불러오기
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        // 공지사항 형태의 인수인계 불러오기
        const response = await apiService.handover.getList({ 
          type: 'notice',
          page: 1,
          size: 5
        });
        
        if (response.success) {
          setNotices(response.data.items);
        }
      } catch (error) {
        console.error('알림 불러오기 오류:', error);
      }
    };
    
    if (user) {
      fetchNotices();
    }
  }, [user]);
  
  // 알림 메뉴 아이템
  const noticeItems = [
    {
      key: 'notice-title',
      label: <div className="notice-title">새로운 알림</div>,
      disabled: true
    },
    ...(notices.length > 0 
      ? notices.map(notice => ({
          key: `notice-${notice.handover_id}`,
          label: (
            <div 
              className="notice-item"
              onClick={() => navigate(`/handover/${notice.handover_id}`)}
            >
              <div className="notice-item-title">{notice.title}</div>
              <div className="notice-item-date">
                {new Date(notice.created_at).toLocaleString()}
              </div>
            </div>
          )
        }))
      : [{
          key: 'no-notices',
          label: <div className="no-notices">새로운 알림이 없습니다</div>,
          disabled: true
        }]
    ),
    {
      type: 'divider'
    },
    {
      key: 'view-all',
      label: <Link to="/handover">모든 공지사항 보기</Link>
    }
  ];
  
  // 사용자 메뉴 아이템
  const userItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <span>{user?.name || '사용자'}</span>,
      disabled: true
    },
    {
      key: 'department',
      label: <span className="user-department">{user?.department || '부서 없음'}</span>,
      disabled: true
    },
    {
      type: 'divider'
    },
    {
      key: 'password',
      icon: <SettingOutlined />,
      label: '비밀번호 변경',
      onClick: () => navigate('/profile/password')
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      onClick: logout
    }
  ];
  
  // 선택된 메뉴 키 찾기
  const getSelectedKey = () => {
    const path = location.pathname;
    
    if (path.startsWith('/dashboard')) return ['dashboard'];
    if (path.startsWith('/handover')) return ['handover'];
    if (path.startsWith('/visualization')) return ['visualization'];
    if (path.startsWith('/users')) return ['users'];
    
    return [];
  };
  
  return (
    <Layout className="app-layout">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={230}
        className="app-sider"
      >
        <div className="logo">
          {collapsed ? 'TMS' : '배송 관제 시스템'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKey()}
          items={[
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
              icon: <DashboardOutlined />,
              label: <Link to="/visualization">시각화</Link>
            },
            // 관리자만 볼 수 있는 메뉴
            ...(isAdmin() ? [
              {
                key: 'users',
                icon: <UserOutlined />,
                label: <Link to="/users">사용자 관리</Link>
              }
            ] : [])
          ]}
        />
      </Sider>
      <Layout className="site-layout">
        <Header className="app-header">
          <div className="header-left">
            {React.createElement(
              collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
              {
                className: 'trigger',
                onClick: () => setCollapsed(!collapsed)
              }
            )}
          </div>
          <div className="header-right">
            <Dropdown
              menu={{ items: noticeItems }}
              placement="bottomRight"
              trigger={['click']}
              overlayClassName="notice-dropdown"
            >
              <Badge count={notices.length} overflowCount={99}>
                <Button 
                  type="text" 
                  icon={<BellOutlined />} 
                  className="notice-button"
                />
              </Badge>
            </Dropdown>
            
            <Dropdown 
              menu={{ items: userItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button type="text" className="user-button">
                <Avatar 
                  icon={<UserOutlined />} 
                  className="user-avatar" 
                />
                {!collapsed && (
                  <span className="user-name">{user?.name || '사용자'}</span>
                )}
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content className="app-content">
          {/* 페이지 내용 */}
          {children}
        </Content>
        <div className="app-footer">
          © 2025 TeckWah TMS - 버전 1.0.0
        </div>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
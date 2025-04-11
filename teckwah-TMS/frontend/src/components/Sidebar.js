import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Avatar, Space, Button } from 'antd';
import {
  DashboardOutlined,
  SwapOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { logout } from '../utils/auth';
import logo from '../assets/logo.png';

const { Sider } = Layout;
const { Text } = Typography;

/**
 * 사이드바 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Object} props.userData - 사용자 데이터
 * @param {Function} props.setAuth - 인증 상태 설정 함수
 * @param {boolean} props.collapsed - 사이드바 접힘 상태
 * @param {Function} props.toggleSidebar - 사이드바 접힘 상태 토글 함수
 */
const Sidebar = ({ userData, setAuth, collapsed, toggleSidebar }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // 활성 메뉴 아이템 키 계산
  const getActiveKey = () => {
    if (currentPath.includes('/dashboard')) return '1';
    if (currentPath.includes('/handover')) return '2';
    if (currentPath.includes('/visualization')) return '3';
    return '1'; // 기본값
  };

  // 로그아웃 처리 함수
  const handleLogout = async () => {
    try {
      // 백엔드 로그아웃 API 호출 (에러가 발생해도 로컬 로그아웃은 진행)
      await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('teckwah_tms_token')}`,
        },
      }).catch(console.error);
      
      // 로컬 로그아웃 처리
      logout();
      
      // 인증 상태 업데이트
      setAuth(false);
      
      // 로그인 페이지로 이동
      window.location.href = '/login';
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      // 오류가 발생해도 로컬 로그아웃 및 리다이렉트
      logout();
      setAuth(false);
      window.location.href = '/login';
    }
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={240}
      className="sidebar"
      theme="dark"
    >
      {/* 로고 영역 */}
      <div className="logo-container">
        {!collapsed && <Typography.Title level={5} style={{ margin: 0, color: 'white' }}>TWLKR-TMS</Typography.Title>}
        <img src={logo} alt="Teckwah 로고" className="logo-image" />
      </div>
      
      {/* 사용자 정보 영역 */}
      <div className="user-info">
        <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
        {!collapsed && (
          <div className="user-details">
            <Text style={{ color: 'white', display: 'block' }}>
              {userData?.user_id || 'Guest'}
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12 }}>
              {userData?.department || ''}
            </Text>
          </div>
        )}
      </div>
      
      {/* 메뉴 영역 */}
      <Menu
        theme="dark"
        mode="inline"
        defaultSelectedKeys={[getActiveKey()]}
        selectedKeys={[getActiveKey()]}
        items={[
          {
            key: '1',
            icon: <DashboardOutlined />,
            label: <Link to="/dashboard">배송 관리</Link>,
          },
          {
            key: '2',
            icon: <SwapOutlined />,
            label: <Link to="/handover">인수인계</Link>,
          },
          {
            key: '3',
            icon: <BarChartOutlined />,
            label: <Link to="/visualization">시각화</Link>,
            // 관리자만 시각화 메뉴 표시
            style: userData?.role === 'ADMIN' ? {} : { display: 'none' },
          },
        ]}
      />
      
      {/* 하단 영역 */}
      <div style={{ marginTop: 'auto', padding: '16px' }}>
        {/* 사이드바 접힘 토글 버튼 */}
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleSidebar}
          style={{ color: 'rgba(255, 255, 255, 0.65)', marginBottom: '16px', width: '100%' }}
        />
        
        {/* 로그아웃 버튼 */}
        <Button
          type="primary"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{ width: '100%' }}
          danger
        >
          {!collapsed && '로그아웃'}
        </Button>
      </div>
      
      {/* 하단 로고 */}
      <div className="sidebar-footer">
        <img src={logo} alt="Teckwah 로고" height={24} />
      </div>
    </Sider>
  );
};

export default Sidebar;

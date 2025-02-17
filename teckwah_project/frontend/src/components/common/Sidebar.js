// frontend/src/components/common/Sidebar.js
import React from 'react';
import { Layout, Menu, Typography, Avatar, message } from 'antd';
import { 
  DashboardOutlined, 
  BarChartOutlined, 
  LogoutOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthService from '../../services/AuthService';

const { Sider } = Layout;
const { Title } = Typography;

/**
 * 사이드바 네비게이션 컴포넌트
 */
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = AuthService.getCurrentUser();

  /**
   * 로그아웃 처리
   */
  const handleLogout = async () => {
    try {
      await AuthService.logout();
      message.success('로그아웃되었습니다');
      navigate('/login');
    } catch (error) {
      message.error('로그아웃 중 오류가 발생했습니다');
    }
  };

  return (
    <Sider width={250} theme="light">
      <div style={{ padding: '24px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <img 
          src="/static/logo.png" 
          alt="Logo" 
          style={{ width: 130, height: 58, marginBottom: 16, display: 'block' }} 
        />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <Avatar icon={<UserOutlined />} />
          <div style={{ marginLeft: 8 }}>
            <Title level={5} style={{ margin: 0 }}>{user?.user_id}</Title>
            <Typography.Text type="secondary">{user?.user_department}</Typography.Text>
          </div>
        </div>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={[
          {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: '배송현황',
            onClick: () => navigate('/dashboard')
          },
          {
            key: '/visualization',
            icon: <BarChartOutlined />,
            label: '통계',
            onClick: () => navigate('/visualization')
          },
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '로그아웃',
            onClick: handleLogout
          }
        ]}
      />
    </Sider>
  );
};

export default Sidebar;
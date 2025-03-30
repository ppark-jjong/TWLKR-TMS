// src/components/Sidebar.js
import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar = ({ userData }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 사용자 권한 확인 (직접 확인으로 변경)
  const isAdminUser = userData?.user_role === 'ADMIN';

  // 권한별 메뉴 아이템 필터링
  const getMenuItems = () => {
    // 기본 메뉴 아이템 (시각화는 공통)
    const commonItems = [
      {
        key: 'visualization',
        icon: <BarChartOutlined />,
        label: '시각화',
        onClick: () => navigate('/visualization'),
      },
    ];

    // Admin 전용 메뉴
    if (isAdminUser) {
      return [
        {
          key: 'admin',
          icon: <SettingOutlined />,
          label: '관리자 페이지',
          onClick: () => navigate('/admin'),
        },
        ...commonItems,
      ];
    }

    // User 전용 메뉴
    return [
      {
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: '대시보드',
        onClick: () => navigate('/dashboard'),
      },
      ...commonItems,
    ];
  };

  // 현재 선택된 메뉴 항목 결정
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/visualization')) return 'visualization';
    if (path.includes('/admin')) return 'admin';
    return '';
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
      theme="dark"
    >
      <div className="logo">{!collapsed ? '배송 관제 시스템' : ''}</div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        items={getMenuItems()}
      />
    </Sider>
  );
};

export default Sidebar;
